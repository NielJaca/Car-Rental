import { Outlet } from 'react-router-dom';
import { Link, NavLink } from 'react-router-dom';

export default function Layout() {
  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner container">
          <Link to="/" style={{ fontWeight: 600, fontSize: '1.125rem', color: 'var(--gray-900)' }}>
            Lovely&apos;s Car Rental
          </Link>
          <NavLink to="/admin/login" className={({ isActive }) => isActive ? 'active' : ''}>
            Admin
          </NavLink>
        </div>
      </nav>
      <main className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
        <Outlet />
      </main>
    </>
  );
}
