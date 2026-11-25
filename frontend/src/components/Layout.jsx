import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  CalendarDays,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Stethoscope,
  Sparkles,
} from 'lucide-react';
import { DateTime } from 'luxon';
import { useAuth } from '../auth';
export function Tooth({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path
        d="M15 10c-8 3-5 14-1 26 2 6 6 3 7-6 1-5 5-5 6 0 1 9 5 12 7 6 4-12 7-23-1-26-4-2-6 1-9 1s-5-3-9-1Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M20 15c2 1 5 2 8 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
export default function Layout() {
  const { user, timezone, logout } = useAuth();
  const location = useLocation();
  const section = location.pathname.split('/')[1];
  const date = DateTime.now().setZone(timezone);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink to="/dashboard" className="brand">
          <span className="brand-mark">
            <Tooth />
          </span>
          <div>
            <strong>
              pearl<span> dental</span>
            </strong>
            <small>CLINIC WORKSPACE</small>
          </div>
        </NavLink>
        <div className="clinic-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          <NavLink to="/dashboard">
            <LayoutDashboard size={20} />
            Overview
          </NavLink>
          <NavLink to="/doctors">
            <Stethoscope size={20} />
            Doctors
          </NavLink>
          <NavLink to="/appointments">
            <CalendarDays size={20} />
            Appointments
          </NavLink>
        </nav>
        <div className="sidebar-bottom">
          <div className="care-card">
            <Sparkles size={22} />
            <strong>A little care. A big smile.</strong>
            <p>Everything your clinic needs for a smoother day.</p>
          </div>
          <div className="staff">
            <span className="avatar">ST</span>
            <div>
              <strong>Clinic staff</strong>
              <small>{user.email}</small>
            </div>
            <button onClick={logout} className="icon-button" aria-label="Sign out" title="Sign out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span>
            <strong>
              {section === 'dashboard'
                ? 'Overview'
                : section.charAt(0).toUpperCase() + section.slice(1)}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="today-date">
              <CalendarDays size={16} />
              {date.toFormat('ccc, dd LLL yyyy')}
            </span>
            <span className="staff-chip">
              <ShieldCheck size={15} />
              Staff access
            </span>
          </div>
        </header>
        <main id="main-content">
          <Outlet />
        </main>
        <footer>
          Pearl Dental <span>Thoughtful care starts with an organized day.</span>
          <small>{timezone.replace('_', ' ')}</small>
        </footer>
      </div>
    </div>
  );
}
