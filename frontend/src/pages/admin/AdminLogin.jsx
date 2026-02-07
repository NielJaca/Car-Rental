import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiPost } from '../../api';
import { showError } from '../../lib/swal';
import EyeIcon from '../../components/EyeIcon';

export default function AdminLogin() {
  const [searchParams] = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get('session') === 'expired') {
      showError('Your session expired. Please log in again.', 'Session expired');
    }
  }, [searchParams]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const u = username.trim();
    if (!u) {
      showError('Please enter your username.', 'Username required');
      return;
    }
    if (!password) {
      showError('Please enter your password.', 'Password required');
      return;
    }
    setLoading(true);
    apiPost('/auth/login', { username: u, password })
      .then((data) => {
        const token = data && data.token;
        if (token && typeof sessionStorage !== 'undefined') sessionStorage.setItem('adminToken', token);
        window.location.href = '/admin/dashboard';
      })
      .catch((err) => {
        const msg = err.message || 'Login failed';
        const title = 'Login failed';
        let text = msg;
        if (msg === 'Username not found') {
          text = 'No admin account exists with this username. Please check the username or contact an administrator.';
        } else if (msg === 'Invalid password') {
          text = 'The password is incorrect for this username. Please try again.';
        } else if (msg === 'Failed to fetch' || msg.includes('Network')) {
          text = 'Cannot reach server. Is the backend running on port 3000?';
        }
        showError(text, title);
        setLoading(false);
      });
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner container">
          <Link to="/" style={{ fontWeight: 600, color: 'var(--gray-900)' }}>Lovely&apos;s Car Rental</Link>
        </div>
      </nav>
      <div className="container" style={{ paddingTop: '3rem', maxWidth: 420 }}>
        <div className="card card-body">
          <h1 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Admin Login</h1>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Sign in to manage cars and bookings.</p>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                className="form-control"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={loading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon open={!showPassword} />
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }} disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
