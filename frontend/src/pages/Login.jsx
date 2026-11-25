import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { CalendarDays, ShieldCheck, Stethoscope } from 'lucide-react';
import { useAuth } from '../auth';
import { Tooth } from '../components/Layout';
import { Button, Field, Notice } from '../components/ui';
export default function Login() {
  const { user, login, sessionError } = useAuth();
  const location = useLocation();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to={location.state?.from || '/dashboard'} replace />;
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      await login(form.get('email'), form.get('password'));
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <section className="login-story">
        <div className="brand light">
          <span className="brand-mark">
            <Tooth />
          </span>
          <div>
            <strong>pearl dental</strong>
            <small>CLINIC WORKSPACE</small>
          </div>
        </div>
        <div className="login-story-main">
          <div className="story-tag">
            <span />A calmer day at the clinic
          </div>
          <h1>
            More time for
            <br />
            healthy <em>smiles.</em>
          </h1>
          <p>
            Your doctors, appointments, and daily schedule.
            <br />
            Together in one thoughtful workspace.
          </p>
          <div className="story-features">
            <span>
              <Stethoscope size={20} />
              Your care team, connected
            </span>
            <span>
              <CalendarDays size={20} />
              Every appointment, organized
            </span>
            <span>
              <ShieldCheck size={20} />A secure space for your staff
            </span>
          </div>
        </div>
        <small>Designed around the people who care.</small>
        <div className="tooth-art">
          <Tooth size={290} />
        </div>
      </section>
      <section className="login-form-wrap">
        <div className="login-form">
          <p className="eyebrow">WELCOME TO PEARL DENTAL</p>
          <h2>Good to see you.</h2>
          <p className="muted">Sign in to get your clinic’s day started.</p>
          <Notice message={error || sessionError} />
          <form onSubmit={submit}>
            <Field label="Email address">
              <input
                type="email"
                name="email"
                placeholder="staff@clinic.demo"
                autoComplete="username"
                required
                maxLength={150}
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                name="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                maxLength={200}
              />
            </Field>
            <Button type="submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in to workspace'}
            </Button>
          </form>
          <p className="login-note">
            <ShieldCheck size={16} />
            For authorized clinic staff. Ask your administrator for access.
          </p>
        </div>
      </section>
    </div>
  );
}
