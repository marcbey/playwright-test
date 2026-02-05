import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import OpenAI from 'openai';
import { Octokit } from '@octokit/rest';

const execFileAsync = promisify(execFile);

const TRIGGER = '@review-agent: please review this PR';
const MARKER_PREFIX = '<!-- review-agent commit:';
const MAX_FILE_CHARS = 4000;
const DIFF_UNIFIED_CONTEXT = 3;

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
const { commentBody, issueNumber, owner, repo } = parseEvent(event);

if (!issueNumber || !owner || !repo) {
  console.error('Missing issue or repo context');
  process.exit(1);
}

if (!matchesTrigger(commentBody)) {
  console.log('Trigger not found. Exiting.');
  process.exit(0);
}

if (!openaiKey) {
  await postComment(
    owner, repo, issueNumber,
    'OPENAI_API_KEY is not configured. Cannot generate review.',
  );
  process.exit(1);
}

// --- Collect PR metadata ---

const pr = await octokit.pulls.get({ owner, repo, pull_number: issueNumber });
if (!pr.data) {
  console.error('PR not found.');
  process.exit(1);
}

if (pr.data.head.repo.full_name !== pr.data.base.repo.full_name) {
  await postComment(
    owner, repo, issueNumber,
    'Review agent only supports same-repo PRs (not forks).',
  );
  process.exit(1);
}

// --- Gather diff and changed files from checked-out code ---

const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
const baseSha = pr.data.base.sha;
const headSha = pr.data.head.sha;

// Ensure the base commit is reachable for diffing
await runCapture('git', ['fetch', 'origin', baseSha, '--depth=1'], workspace);

const diff = await runCapture(
  'git',
  ['diff', `--unified=${DIFF_UNIFIED_CONTEXT}`, baseSha, headSha],
  workspace,
);

const changedFileNames = (
  await runCapture('git', ['diff', '--name-only', baseSha, headSha], workspace)
).split('\n').map((f) => f.trim()).filter(Boolean);

const changedFileContents = await readFiles(changedFileNames, workspace);

// --- Generate and post review ---

const reviewText = await generateReview({
  title: pr.data.title,
  body: pr.data.body || '',
  author: pr.data.user?.login,
  labels: pr.data.labels?.map((l) => l.name).filter(Boolean),
  diff,
  changedFileContents,
});

const marker = `${MARKER_PREFIX}${headSha} -->`;
await octokit.pulls.createReview({
  owner,
  repo,
  pull_number: issueNumber,
  event: 'COMMENT',
  body: `${reviewText}\n\n${marker}`,
});

// --- Helpers ---

async function runCapture(cmd, args, cwd) {
  try {
    const { stdout, stderr } = await execFileAsync(cmd, args, {
      cwd,
      env: process.env,
      maxBuffer: 10 * 1024 * 1024,
    });
    return `${stdout}${stderr}`;
  } catch (error) {
    return `${error.stdout || ''}${error.stderr || ''}`;
  }
}

async function postComment(o, r, issue, body) {
  await octokit.issues.createComment({ owner: o, repo: r, issue_number: issue, body });
}

function parseEvent(event) {
  return {
    commentBody: event?.comment?.body || '',
    issueNumber: event?.issue?.number,
    repo: event?.repository?.name,
    owner: event?.repository?.owner?.login,
  };
}

function matchesTrigger(body) {
  if (!body) return false;
  const cleaned = body.replace(/```[\s\S]*?```/g, ' ');
  return cleaned.replace(/\s+/g, ' ').trim().toLowerCase().includes(TRIGGER.toLowerCase());
}

async function readFiles(files, cwd) {
  const parts = [];
  for (const file of files) {
    if (!file) continue;
    try {
      const fullPath = path.join(cwd, file);
      const stat = await fs.stat(fullPath);
      if (!stat.isFile()) continue;
      const content = await fs.readFile(fullPath, 'utf8');
      parts.push(`\n--- ${file} ---\n${truncate(content, MAX_FILE_CHARS)}`);
    } catch {
      continue;
    }
  }
  return parts.join('\n').trim();
}

function truncate(value, maxChars) {
  if (!value) return '';
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}\n… [truncated ${value.length - maxChars} chars]`;
}

async function generateReview({ title, body, author, labels, diff, changedFileContents }) {
  const openai = new OpenAI({ apiKey: openaiKey });

  const prompt = [
    'You are a senior code reviewer. Your task is to find **logical errors** in the changed code.',
    'Focus on:',
    '- Correctness bugs: wrong conditions, off-by-one errors, missing edge cases, race conditions.',
    '- Security issues: injection, auth bypasses, data leaks.',
    '- Semantic mistakes: variables used before assignment, unreachable code, swapped arguments.',
    'Do NOT comment on style, formatting, or naming unless it causes a real bug.',
    'Reference specific files and code snippets. Be concise and actionable.',
    'If you find no logical errors, say "No issues found."',
    '',
    `PR Title: ${title}`,
    `PR Description: ${body || '(none)'}`,
    `PR Author: ${author || '(unknown)'}`,
    `PR Labels: ${labels?.length ? labels.join(', ') : '(none)'}`,
    '',
    'Changed file contents:',
    changedFileContents || '(none)',
    '',
    'Unified Diff:',
    diff || '(no diff)',
  ].join('\n');

  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL || 'gpt-5',
    input: prompt,
    max_output_tokens: 1200,
  });

  return extractReviewText(response);
}

function extractReviewText(response) {
  if (response?.output_text) return response.output_text;
  const chunks = [];
  for (const item of response?.output || []) {
    for (const content of item.content || []) {
      if (content?.type === 'output_text' && content.text) chunks.push(content.text);
    }
  }
  return chunks.join('\n').trim() || 'No issues found.';
}
