import { useState, useEffect, useCallback } from 'react';

const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api';
const HEALTH_URL = `${API_BASE}/health`;
const CHECK_INTERVAL_MS = 15000;

async function checkBackend() {
  try {
    const res = await fetch(HEALTH_URL, { method: 'GET', credentials: 'omit', mode: 'cors' });
    const ct = res.headers.get('content-type') || '';
    if (!res.ok) return false;
    if (ct.includes('application/json')) {
      const data = await res.json().catch(() => ({}));
      return data && data.ok === true;
    }
    const text = await res.text();
    return !text.trimStart().startsWith('<');
  } catch (_) {
    return false;
  }
}

export default function BackendBanner() {
  const [down, setDown] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const runCheck = useCallback(async () => {
    const ok = await checkBackend();
    setDown(!ok);
  }, []);

  useEffect(() => {
    runCheck();
    const id = setInterval(runCheck, CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [runCheck]);

  if (!down || dismissed) return null;

  return (
    <div
      className="backend-banner"
      role="alert"
      style={{
        background: 'linear-gradient(135deg, #b85450 0%, #9e4541 100%)',
        color: '#fff',
        padding: '0.75rem 1rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        fontSize: '0.9375rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      <span style={{ fontWeight: 500 }}>
        Backend is not running. API requests will fail until you start it.
      </span>
      <span style={{ opacity: 0.95 }}>
        From project root run: <code style={{ background: 'rgba(0,0,0,0.2)', padding: '0.2rem 0.5rem', borderRadius: 4 }}>npm run dev</code>
        {' '}or in a separate terminal: <code style={{ background: 'rgba(0,0,0,0.2)', padding: '0.2rem 0.5rem', borderRadius: 4 }}>cd backend && npm run dev</code>
      </span>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button
          type="button"
          onClick={runCheck}
          style={{
            padding: '0.35rem 0.75rem',
            background: 'rgba(255,255,255,0.25)',
            border: '1px solid rgba(255,255,255,0.5)',
            borderRadius: 6,
            color: '#fff',
            fontWeight: 500,
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Retry
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          style={{
            padding: '0.35rem 0.75rem',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.5)',
            borderRadius: 6,
            color: '#fff',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
