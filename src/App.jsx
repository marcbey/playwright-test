import React, { useEffect, useMemo, useState } from 'react';

const USER_KEY = 'pw-demo-user';
const DEFAULT_TASKS = [
  { id: 't1', label: 'Draft launch copy', done: false },
  { id: 't2', label: 'QA onboarding flow', done: true },
  { id: 't3', label: 'Schedule pilot demo', done: false },
];

const PROJECTS = [
  { id: 'p1', name: 'Aurora', owner: 'Inez', status: 'On track' },
  { id: 'p2', name: 'Borealis', owner: 'Kofi', status: 'At risk' },
  { id: 'p3', name: 'Cirrus', owner: 'Mei', status: 'On track' },
  { id: 'p4', name: 'Drift', owner: 'Quinn', status: 'Paused' },
];

function useLocalStorageState(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState];
}

export default function App() {
  const [theme, setTheme] = useState('dawn');
  const [user, setUser] = useLocalStorageState(USER_KEY, null);
  const [loginError, setLoginError] = useState('');
  const [formState, setFormState] = useState({ username: '', password: '' });
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [counter, setCounter] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [tasks, setTasks] = useState(DEFAULT_TASKS);
  const [taskInput, setTaskInput] = useState('');
  const [filter, setFilter] = useState('all');
  const [insights, setInsights] = useState([]);
  const [insightsStatus, setInsightsStatus] = useState('idle');
  const [filePreview, setFilePreview] = useState(null);
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('north');

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSeconds((value) => value + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const filteredTasks = useMemo(() => {
    if (filter === 'done') {
      return tasks.filter((task) => task.done);
    }
    if (filter === 'open') {
      return tasks.filter((task) => !task.done);
    }
    return tasks;
  }, [tasks, filter]);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return PROJECTS;
    return PROJECTS.filter((project) =>
      `${project.name} ${project.owner} ${project.status}`.toLowerCase().includes(query)
    );
  }, [search]);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleLogin = (event) => {
    event.preventDefault();
    if (formState.username === 'admin' && formState.password === 'playwright') {
      setUser({ name: 'Admin', role: 'Launch Director' });
      setLoginError('');
      setFormState({ username: '', password: '' });
      return;
    }
    setLoginError('Use admin / playwright to sign in.');
  };

  const handleLogout = () => {
    setUser(null);
  };

  const addTask = (event) => {
    event.preventDefault();
    const trimmed = taskInput.trim();
    if (!trimmed) return;
    setTasks((items) => [
      { id: `t${Date.now()}`, label: trimmed, done: false },
      ...items,
    ]);
    setTaskInput('');
    setFilter('all');
  };

  const toggleTask = (id) => {
    setTasks((items) =>
      items.map((task) => (task.id === id ? { ...task, done: !task.done } : task))
    );
  };

  const resetTasks = () => {
    const confirmed = window.confirm('Reset tasks back to the sample list?');
    if (confirmed) {
      setTasks(DEFAULT_TASKS);
      setFilter('all');
    }
  };

  const loadInsights = async () => {
    setInsightsStatus('loading');
    setInsights([]);
    try {
      const response = await fetch('/api/insights');
      if (!response.ok) throw new Error('Request failed');
      const data = await response.json();
      setInsights(data);
      setInsightsStatus('success');
    } catch {
      try {
        const fallback = await fetch('/insights.json');
        if (!fallback.ok) throw new Error('Fallback failed');
        const data = await fallback.json();
        setInsights(data);
        setInsightsStatus('fallback');
      } catch {
        setInsightsStatus('error');
      }
    }
  };

  const handleFile = async (event) => {
    const [file] = event.target.files || [];
    if (!file) return;

    const text = await file.text();
    setFilePreview({
      name: file.name,
      size: file.size,
      snippet: text.slice(0, 120),
    });
  };

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">Playwright Feature Lab</p>
          <h1>Ship confident UI changes with a showcase-ready test suite.</h1>
          <p className="lead">
            Explore an intentionally busy interface made to exercise Playwright locators,
            fixtures, network mocks, dialogs, file uploads, and more.
          </p>
        </div>
        <div className="hero-card">
          <div className="hero-row">
            <span>Session theme</span>
            <div className="toggle" role="group" aria-label="Theme toggle">
              <button
                type="button"
                className={theme === 'dawn' ? 'active' : ''}
                onClick={() => setTheme('dawn')}
              >
                Dawn
              </button>
              <button
                type="button"
                className={theme === 'noon' ? 'active' : ''}
                onClick={() => setTheme('noon')}
              >
                Noon
              </button>
            </div>
          </div>
          <div className="hero-row">
            <span>Uptime tick</span>
            <strong data-testid="uptime">{seconds}s</strong>
          </div>
          <div className="hero-row">
            <span>Counter</span>
            <div className="counter">
              <button type="button" onClick={() => setCounter((value) => value - 1)}>
                -
              </button>
              <span data-testid="counter-value">{counter}</span>
              <button type="button" onClick={() => setCounter((value) => value + 1)}>
                +
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="grid">
        <section className="card" aria-labelledby="auth-title">
          <div className="card-header">
            <h2 id="auth-title">Credentialed brief</h2>
            <p>Persisted in localStorage for storage-state testing.</p>
          </div>
          {!user ? (
            <form className="stack" onSubmit={handleLogin}>
              <label className="field">
                Username
                <input
                  name="username"
                  autoComplete="off"
                  value={formState.username}
                  onChange={(event) =>
                    setFormState((state) => ({ ...state, username: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                Password
                <input
                  name="password"
                  type="password"
                  value={formState.password}
                  onChange={(event) =>
                    setFormState((state) => ({ ...state, password: event.target.value }))
                  }
                />
              </label>
              {loginError ? <p className="error">{loginError}</p> : null}
              <button className="primary" type="submit">
                Sign in
              </button>
            </form>
          ) : (
            <div className="stack" data-testid="profile">
              <p>
                Signed in as <strong>{user.name}</strong>
              </p>
              <span className="pill">{user.role}</span>
              <button className="ghost" type="button" onClick={handleLogout}>
                Sign out
              </button>
            </div>
          )}
        </section>

        <section className="card" aria-labelledby="form-title">
          <div className="card-header">
            <h2 id="form-title">Launch readiness form</h2>
            <p>Form validation, select menus, and keyboard coverage.</p>
          </div>
          <form className="stack" onSubmit={(event) => event.preventDefault()}>
            <label className="field">
              Work email
              <input
                name="email"
                placeholder="ops@studio.com"
                value={email}
                onBlur={() => setEmailTouched(true)}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            {emailTouched && !emailValid ? (
              <p className="error" role="alert">
                Enter a valid email address.
              </p>
            ) : null}
            <label className="field">
              Region
              <select value={region} onChange={(event) => setRegion(event.target.value)}>
                <option value="north">North stack</option>
                <option value="south">South stack</option>
                <option value="east">East stack</option>
              </select>
            </label>
            <label className="field">
              Launch confidence
              <input type="range" min="1" max="5" defaultValue="4" />
            </label>
          </form>
        </section>

        <section className="card" aria-labelledby="tasks-title">
          <div className="card-header">
            <h2 id="tasks-title">Task queue</h2>
            <p>List operations, filtering, and a confirm dialog.</p>
          </div>
          <form className="row" onSubmit={addTask}>
            <input
              name="task"
              placeholder="Add a task"
              value={taskInput}
              onChange={(event) => setTaskInput(event.target.value)}
            />
            <button className="primary" type="submit">
              Add
            </button>
          </form>
          <div className="filters" role="tablist" aria-label="Task filters">
            {['all', 'open', 'done'].map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={filter === value}
                className={filter === value ? 'active' : ''}
                onClick={() => setFilter(value)}
              >
                {value}
              </button>
            ))}
          </div>
          <ul className="list" aria-label="Task list">
            {filteredTasks.map((task) => (
              <li key={task.id}>
                <label className={task.done ? 'done' : ''}>
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => toggleTask(task.id)}
                  />
                  {task.label}
                </label>
              </li>
            ))}
          </ul>
          <button className="ghost" type="button" onClick={resetTasks}>
            Reset tasks
          </button>
        </section>

        <section className="card" aria-labelledby="network-title">
          <div className="card-header">
            <h2 id="network-title">Insights API</h2>
            <p>Mockable network requests + fallback UI.</p>
          </div>
          <button className="primary" type="button" onClick={loadInsights}>
            Load insights
          </button>
          <div className="status" data-testid="insights-status">
            Status: {insightsStatus}
          </div>
          <div className="insights" role="list" aria-label="Insights list">
            {insights.map((insight) => (
              <article key={insight.id} role="listitem">
                <h3>{insight.title}</h3>
                <p>{insight.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="card" aria-labelledby="files-title">
          <div className="card-header">
            <h2 id="files-title">File intake</h2>
            <p>File uploads, previews, and assertions.</p>
          </div>
          <div className="field">
            <span>Upload sample notes</span>
            <label className="file-picker" htmlFor="file-upload-input">
              <input
                id="file-upload-input"
                type="file"
                aria-label="Upload sample notes"
                onChange={handleFile}
              />
              <span className="file-button">Choose file</span>
              <span className="file-name">
                {filePreview?.name ?? 'No file selected'}
              </span>
            </label>
          </div>
          {filePreview ? (
            <div className="file-preview" data-testid="file-preview">
              <strong>{filePreview.name}</strong>
              <span>{filePreview.size} bytes</span>
              <p>{filePreview.snippet || 'No content found.'}</p>
            </div>
          ) : (
            <p className="muted">Attach any text file to preview its contents.</p>
          )}
        </section>

        <section className="card" aria-labelledby="table-title">
          <div className="card-header">
            <h2 id="table-title">Portfolio grid</h2>
            <p>Table semantics, filtering, and row locators.</p>
          </div>
          <input
            aria-label="Search projects"
            placeholder="Search projects"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>Owner</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => (
                <tr key={project.id}>
                  <td>{project.name}</td>
                  <td>{project.owner}</td>
                  <td>{project.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
