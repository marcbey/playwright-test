import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import OpenAI from 'openai';
import { Octokit } from '@octokit/rest';

const execFileAsync = promisify(execFile);

const TRIGGER = '@review-agent: please review this PR';
const MARKER_PREFIX = '<!-- review-agent commit:';
const MAX_DIFF_CHARS = 12000;
const MAX_TEST_CHARS = 8000;

const githubToken = process.env.GITHUB_TOKEN;
const openaiKey = process.env.OPENAI_API_KEY;

if (!githubToken) {
  console.error('Missing GITHUB_TOKEN');
  process.exit(1);
}

const octokit = new Octokit({ auth: githubToken });

const eventPath = process.env.GITHUB_EVENT_PATH;
if (!eventPath) {
  console.error('Missing GITHUB_EVENT_PATH');
  process.exit(1);
}

const event = JSON.parse(await fs.readFile(eventPath, 'utf8'));
const commentBody = event?.comment?.body || '';
const issueNumber = event?.issue?.number;
const repo = event?.repository?.name;
const owner = event?.repository?.owner?.login;

if (!issueNumber || !owner || !repo) {
  console.error('Missing issue or repo context');
  process.exit(1);
}

if (!commentBody.includes(TRIGGER)) {
  console.log('Trigger not found. Exiting.');
  process.exit(0);
}

const pr = await octokit.pulls.get({ owner, repo, pull_number: issueNumber });

if (!pr.data) {
  console.error('PR not found.');
  process.exit(1);
}

if (pr.data.head.repo.full_name !== pr.data.base.repo.full_name) {
  await postComment(
    owner,
    repo,
    issueNumber,
    'Review agent only runs on PRs from the same repository (forks are not supported).'
  );
  process.exit(1);
}

const headSha = pr.data.head.sha;
const baseSha = pr.data.base.sha;
const marker = `${MARKER_PREFIX}${headSha} -->`;

const existingReviews = await octokit.pulls.listReviews({
  owner,
  repo,
  pull_number: issueNumber,
  per_page: 100,
});

const alreadyReviewed = existingReviews.data.some((review) =>
  review.body?.includes(marker)
);

if (alreadyReviewed) {
  console.log('Review already exists for this commit. Exiting.');
  process.exit(0);
}

const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
const workDir = path.join(workspace, '.review-agent-work');
await fs.rm(workDir, { recursive: true, force: true });
await fs.mkdir(workDir, { recursive: true });

const repoUrl = `https://x-access-token:${githubToken}@github.com/${owner}/${repo}.git`;

await run('git', ['init'], workDir);
await run('git', ['remote', 'add', 'origin', repoUrl], workDir);
await run('git', ['fetch', '--depth', '50', 'origin', baseSha, headSha], workDir);
await run('git', ['checkout', headSha], workDir);

const diff = await runCapture('git', ['diff', '--unified=3', baseSha, headSha], workDir);

const pkgPath = path.join(workDir, 'package.json');
let pkg;
try {
  pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8'));
} catch {
  await postComment(
    owner,
    repo,
    issueNumber,
    'package.json not found. Cannot run npm test.'
  );
  process.exit(1);
}

const testScript = pkg?.scripts?.test;
if (!testScript || /no test specified/i.test(testScript)) {
  await postComment(
    owner,
    repo,
    issueNumber,
    'No valid npm test script found. Please define a real "test" script in package.json.'
  );
  process.exit(1);
}

let testOutput = '';
try {
  testOutput += await runCapture('npm', ['ci'], workDir);
  if (usesPlaywright(pkg)) {
    testOutput += await runCapture(
      'npx',
      ['playwright', 'install', '--with-deps', 'chromium'],
      workDir
    );
  }
  testOutput += await runCapture('npm', ['test'], workDir);
} catch (error) {
  const output = truncate(error.output || testOutput || String(error), MAX_TEST_CHARS);
  await postComment(
    owner,
    repo,
    issueNumber,
    `npm test failed. Output:\n\n\`\`\`\n${output}\n\`\`\``
  );
  process.exit(1);
}

if (!openaiKey) {
  await postComment(
    owner,
    repo,
    issueNumber,
    'OPENAI_API_KEY is not configured. Cannot generate review.'
  );
  process.exit(1);
}

const openai = new OpenAI({ apiKey: openaiKey });

const prompt = buildPrompt({
  title: pr.data.title,
  body: pr.data.body || '',
  diff: truncate(diff, MAX_DIFF_CHARS),
  testOutput: truncate(testOutput, MAX_TEST_CHARS),
});

const response = await openai.responses.create({
  model: process.env.OPENAI_MODEL || 'gpt-5',
  input: prompt,
  max_output_tokens: 800,
});

const reviewText = extractReviewText(response);

await octokit.pulls.createReview({
  owner,
  repo,
  pull_number: issueNumber,
  event: 'COMMENT',
  body: `${reviewText}\n\n${marker}`,
});

async function run(cmd, args, cwd) {
  await execFileAsync(cmd, args, { cwd, env: process.env });
}

async function runCapture(cmd, args, cwd) {
  try {
    const { stdout, stderr } = await execFileAsync(cmd, args, {
      cwd,
      env: process.env,
      maxBuffer: 10 * 1024 * 1024,
    });
    return `${stdout}${stderr}`;
  } catch (error) {
    const stdout = error.stdout || '';
    const stderr = error.stderr || '';
    const output = `${stdout}${stderr}`;
    error.output = output;
    throw error;
  }
}

function truncate(text, maxChars) {
  if (!text) return '';
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n...truncated...`;
}

async function postComment(owner, repo, issueNumber, body) {
  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body,
  });
}

function buildPrompt({ title, body, diff, testOutput }) {
  return [
    'You are a senior code reviewer. Provide a pragmatic, prioritized review.',
    'Focus on correctness, security, performance, and maintainability.',
    'Avoid nitpicks and formatting-only comments.',
    'Reference files and diff snippets where possible.',
    'If unsure, state assumptions instead of asking questions.',
    'If you find no issues, explicitly say \"No issues found\" and briefly confirm that tests passed.',
    '',
    `PR Title: ${title}`,
    `PR Description: ${body || '(none)'}`,
    '',
    'Test Output (truncated):',
    testOutput || '(no output)',
    '',
    'Unified Diff (truncated):',
    diff || '(no diff)',
  ].join('\n');
}

function extractReviewText(response) {
  if (response?.output_text) return response.output_text;
  const contentChunks = [];
  for (const item of response?.output || []) {
    for (const content of item.content || []) {
      if (content?.type === 'output_text' && content.text) {
        contentChunks.push(content.text);
      }
    }
  }
  const text = contentChunks.join('\n').trim();
  if (text) return text;
  return 'No issues found. Tests passed.';
}

function usesPlaywright(pkg) {
  const deps = {
    ...pkg?.dependencies,
    ...pkg?.devDependencies,
    ...pkg?.optionalDependencies,
  };
  return Boolean(deps && (deps['@playwright/test'] || deps.playwright));
}
