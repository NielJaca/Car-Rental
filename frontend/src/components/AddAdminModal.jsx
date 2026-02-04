import { useState } from 'react';
import { apiPost } from '../api';
import { showError } from '../lib/swal';
import Swal from 'sweetalert2';
import EyeIcon from './EyeIcon';

export default function AddAdminModal({ onClose }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const u = (username || '').trim();
    if (!u) {
      showError('Please enter a username.');
      return;
    }
    if (!password) {
      showError('Please enter a password.');
      return;
    }
    if (password.length < 6) {
      showError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      showError('Password and confirm password do not match.');
      return;
    }
    setLoading(true);
    apiPost('/auth/register', { username: u, password })
      .then(() => {
        Swal.fire({
          icon: 'success',
          title: 'Admin created',
          text: `"${u}" can now log in to the admin panel.`,
          confirmButtonColor: '#8b6f5a',
        });
        setUsername('');
        setPassword('');
        setConfirmPassword('');
        onClose();
      })
      .catch((err) => showError(err.message))
      .finally(() => setLoading(false));
  };

  return (
    <div
      className="modal-overlay"
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-admin-title"
    >
      <div className="card card-body" style={{ maxWidth: 420, width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 id="add-admin-title" style={{ margin: 0 }}>Add Admin User</h2>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => !loading && onClose()}
            disabled={loading}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <p style={{ color: 'var(--gray-500)', marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Create another admin account. Username is case-insensitive. Password must be at least 6 characters.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="add-admin-username">Username</label>
            <input
              type="text"
              id="add-admin-username"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. manager"
              autoComplete="username"
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="add-admin-password">Password</label>
            <div className="password-input-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                id="add-admin-password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                minLength={6}
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
          <div className="form-group">
            <label htmlFor="add-admin-confirm">Confirm password</label>
            <div className="password-input-wrap">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="add-admin-confirm"
                className="form-control"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Same as above"
                autoComplete="new-password"
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowConfirmPassword((v) => !v)}
                disabled={loading}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                title={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                <EyeIcon open={!showConfirmPassword} />
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Add Admin'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
