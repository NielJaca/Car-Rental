import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Link, NavLink } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { apiGet, getApiBase } from '../api';
import { confirm } from '../lib/swal';
import Spinner from './Spinner';
import AddAdminModal from './AddAdminModal';

const PUBLIC_ADMIN_ROUTES = ['/admin/login'];

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export default function AdminLayout() {
  const location = useLocation();
  const isPublic = PUBLIC_ADMIN_ROUTES.some((r) => location.pathname === r);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addAdminOpen, setAddAdminOpen] = useState(false);
  const settingsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setSettingsOpen(false);
    };
    if (settingsOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [settingsOpen]);

  useEffect(() => {
    if (isPublic) {
      setAuthChecked(true);
      setIsAdmin(false);
      return;
    }
    apiGet('/auth/me')
      .then(() => {
        setIsAdmin(true);
        setAuthChecked(true);
      })
      .catch(() => {
        setIsAdmin(false);
        setAuthChecked(true);
      });
  }, [location.pathname, isPublic]);

  if (!authChecked) {
    return (
      <div className="loading" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', minHeight: '60vh', justifyContent: 'center' }}>
        <Spinner size="lg" />
        <span>Checking auth...</span>
      </div>
    );
  }
  if (!isPublic && !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  if (isPublic) {
    return <Outlet />;
  }

  const logout = () => {
    confirm({ title: 'Log out?', text: 'Are you sure you want to log out?' }).then((ok) => {
      if (!ok) return;
      fetch(`${getApiBase()}/api/auth/logout`, { method: 'POST', credentials: 'include' })
        .then(() => { window.location.href = '/admin/login'; })
        .catch(() => { window.location.href = '/admin/login'; });
    });
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner container">
          <Link to="/admin/dashboard" style={{ fontWeight: 600, fontSize: '1.125rem', color: 'var(--gray-900)' }}>Admin</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <NavLink to="/admin/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>Dashboard</NavLink>
            <NavLink to="/admin/cars" className={({ isActive }) => isActive ? 'active' : ''}>Cars</NavLink>
            <NavLink to="/admin/availability" className={({ isActive }) => isActive ? 'active' : ''}>Availability</NavLink>
            <NavLink to="/admin/bookings" className={({ isActive }) => isActive ? 'active' : ''}>Bookings</NavLink>
            <Link to="/" style={{ marginLeft: '0.25rem' }}>View Site</Link>
            <div className="admin-settings-dropdown" ref={settingsRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm admin-settings-trigger"
                onClick={() => setSettingsOpen((o) => !o)}
                aria-expanded={settingsOpen}
                aria-haspopup="true"
                aria-label="Settings"
                title="Settings"
              >
                <SettingsIcon />
              </button>
              {settingsOpen && (
                <div className="admin-settings-menu" role="menu">
                  <button type="button" className="admin-settings-item" role="menuitem" onClick={() => { setSettingsOpen(false); setAddAdminOpen(true); }}>
                    Add Admin
                  </button>
                  <button type="button" className="admin-settings-item" role="menuitem" onClick={() => { setSettingsOpen(false); logout(); }}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
        <Outlet />
      </main>
      {addAdminOpen && <AddAdminModal onClose={() => setAddAdminOpen(false)} />}
    </>
  );
}
