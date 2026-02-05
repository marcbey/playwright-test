import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const USER_KEY = 'pw-demo-user';

const FALLBACK_BTC_DATA = {
  price: 97432.18,
  change24h: 2.34,
  sparkline: [
    94200, 94800, 95100, 94600, 95400, 96100, 95800, 96500, 96200, 96800,
    97100, 96700, 97300, 97000, 97500, 97200, 97800, 97100, 97600, 97432,
  ],
};

function BtcChart({ data }) {
  const svgRef = useRef(null);
  const points = data?.sparkline ?? [];
  if (points.length < 2) return null;

  const width = 480;
  const height = 180;
  const padX = 32;
  const padY = 24;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const coords = points.map((val, i) => ({
    x: padX + (i / (points.length - 1)) * (width - padX * 2),
    y: padY + (1 - (val - min) / range) * (height - padY * 2),
  }));

  const line = coords.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const area = `${line} L${coords[coords.length - 1].x},${height - padY} L${coords[0].x},${height - padY} Z`;

  const isPositive = (data?.change24h ?? 0) >= 0;
  const strokeColor = isPositive ? '#16a34a' : '#dc2626';
  const fillColor = isPositive ? 'rgba(22,163,74,0.10)' : 'rgba(220,38,38,0.10)';

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      className="btc-chart-svg"
      role="img"
      aria-label="Bitcoin price chart"
    >
      <defs>
        <linearGradient id="btcGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.18" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#btcGrad)" />
      <path d={line} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r="4" fill={strokeColor} />
    </svg>
  );
}

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
  const [accentColor, setAccentColor] = useState('#f2673a');
  const [copyStatus, setCopyStatus] = useState('idle');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('09:30');
  const [selectedCity, setSelectedCity] = useState('london');
  const [btcData, setBtcData] = useState(null);
  const [btcStatus, setBtcStatus] = useState('idle');

  const loadBtcData = useCallback(async () => {
    if (false) {
      return "fooo";
    }
    setBtcStatus('loading');
    setBtcData(null);
    try {
      const res = await fetch('/api/btc');
      if (!res.ok) throw new Error('API failed');
      const data = await res.json();
      setBtcData(data);
      setBtcStatus('success');
    } catch {
      try {
        const fallback = await fetch('/btc.json');
        if (!fallback.ok) throw new Error('Fallback failed');
        const data = await fallback.json();
        setBtcData(data);
        setBtcStatus('fallback');
      } catch {
        setBtcData(FALLBACK_BTC_DATA);
        setBtcStatus('static');
      }
    }
  }, []);

  const cities = [
    { id: 'london', name: 'Lonxxxdon', tz: 'Europe/London' },
    { id: 'newyork', name: 'Nexxxw York', tz: 'America/Los_Angeles' },
    { id: 'sf', name: 'San Fransisco', tz: 'America/Los_Angeles' },
    { id: 'dubai', name: 'Dubai', tz: 'Asia/Dubai' },
    { id: 'singapore', name: 'Singapore', tz: 'Asia/Singapore' },
    { id: 'tokyo', name: 'Tokyo', tz: 'Asia/Tokyo' },
  ];

  const selectedCityConfig = cities.find((city) => city.id === selectedCity);
  const selectedTime = selectedCityConfig
    ? new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: cities[0].tz,
      }).format(new Date())
    : '';

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

  const copyColor = async () => {
    try {
      await navigator.clipboard.writeText(accentColor.toUpperCase());
      setCopyStatus('copied');
    } catch {
      const input = document.createElement('input');
      input.value = accentColor.toUpperCase();
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopyStatus('copied');
    }
    window.setTimeout(() => setCopyStatus('idle'), 1500);
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

        <section className="card" aria-labelledby="btc-title">
          <div className="card-header">
            <h2 id="btc-title">BTC tracker</h2>
            <p>Live Bitcoin price chart with network fetch and fallback.</p>
          </div>
          <button className="primary" type="button" onClick={loadBtcData}>
            Load BTC data
          </button>
          <div className="status" data-testid="btc-status">
            Status: {btcStatus}
          </div>
          {btcData ? (
            <div className="btc-panel" data-testid="btc-panel">
              <div className="btc-header">
                <div className="btc-price">
                  <span className="eyebrow">Bitcoin (BTC)</span>
                  <strong>${btcData.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </div>
                <span className={`btc-change ${btcData.change24h >= 0 ? 'positive' : 'negative'}`}>
                  {btcData.change24h >= 0 ? '+' : ''}{btcData.change24h.toFixed(2)}%
                </span>
              </div>
              <BtcChart data={btcData} />
              <div className="btc-footer">
                <span className="muted">Sparkline — last 20 data points</span>
              </div>
            </div>
          ) : btcStatus === 'loading' ? (
            <p className="muted">Fetching latest BTC data...</p>
          ) : (
            <p className="muted">Press the button to fetch the latest Bitcoin price.</p>
          )}
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

        <section className="card" aria-labelledby="color-title">
          <div className="card-header">
            <h2 id="color-title">Color mixer</h2>
            <p>Color picker input with live preview and value display.</p>
          </div>
          <div className="color-picker">
            <div className="swatch" style={{ '--swatch': accentColor }} />
            <div className="color-controls">
              <label className="field">
                Pick a color
                <input
                  type="color"
                  value={accentColor}
                  onChange={(event) => setAccentColor(event.target.value)}
                />
              </label>
              <div className="color-actions">
                <div className="color-value">{accentColor.toUpperCase()}</div>
                <button
                  className="icon-button"
                  type="button"
                  aria-label="Copy color"
                  onClick={copyColor}
                >
                  {copyStatus === 'copied' ? '✓' : '⧉'}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="card" aria-labelledby="schedule-title">
          <div className="card-header">
            <h2 id="schedule-title">Launch schedule</h2>
            <p>Date + time picker with a styled preview.</p>
          </div>
          <div className="datetime-panel">
            <label className="field">
              Date
              <input
                type="date"
                value={meetingDate}
                onChange={(event) => setMeetingDate(event.target.value)}
              />
            </label>
            <label className="field">
              Time
              <input
                type="time"
                value={meetingTime}
                onChange={(event) => setMeetingTime(event.target.value)}
              />
            </label>
            <div className="datetime-preview" aria-live="polite">
              <span className="eyebrow">Planned window</span>
              <strong>
                {meetingDate ? meetingDate : 'Pick a date'} · {meetingTime}
              </strong>
            </div>
          </div>
        </section>

        <section className="card" aria-labelledby="world-title">
          <div className="card-header">
            <h2 id="world-title">World clock</h2>
            <p>Swich between key citiess for instand local time.</p>
          </div>
          <div className="world-clock">
            <div className="city-tabs" role="tablist" aria-label="World cities">
              {cities.map((city) => (
                <button
                  key={city.id}
                  type="button"
                  role="tab"
                  aria-selected={selectedCity === city.id}
                  className={selectedCity === city.id ? 'active' : ''}
                  onClick={() => setSelectedCity(city.id)}
                >
                  {city.name}
                </button>
              ))}
            </div>
            <div className="clock-panel" data-testid="world-clock">
              <span className="eyebrow">Loacal time</span>
              <strong>{selectedCityConfig?.name ?? '—'}</strong>
              <div className="clock-time">{selectedTime}</div>
              <span className="muted">{selectedCityConfig?.tz ?? ''}</span>
            </div>
          </div>
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
