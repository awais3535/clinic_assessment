import { Link } from 'react-router-dom';
import { CalendarCheck, CalendarDays, Clock3, Plus, Stethoscope } from 'lucide-react';
import { DateTime } from 'luxon';
import { useResource } from '../hooks';
import { useAuth } from '../auth';
import { Button, Empty, Loading, Notice, PageHeading } from '../components/ui';
import AppointmentTable from '../components/AppointmentTable';
export default function Dashboard() {
  const { data, loading, error, refresh } = useResource('/dashboard');
  const { timezone } = useAuth();
  const hour = DateTime.now().setZone(timezone).hour;
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const stats = [
    {
      label: 'Total doctors',
      key: 'total_doctors',
      icon: Stethoscope,
      foot: 'Your clinic’s care team',
      color: 'teal',
    },
    {
      label: 'Upcoming appointments',
      key: 'upcoming',
      icon: CalendarDays,
      foot: 'Scheduled from now onward',
      color: 'blue',
    },
    {
      label: 'Today’s appointments',
      key: 'today',
      icon: CalendarCheck,
      foot: 'On the schedule today',
      color: 'purple',
    },
    {
      label: 'Pending confirmation',
      key: 'pending',
      icon: Clock3,
      foot: 'Waiting for a status update',
      color: 'amber',
    },
  ];
  return (
    <>
      <PageHeading
        eyebrow="YOUR CLINIC AT A GLANCE"
        title={`${greeting}, team.`}
        description="Here’s what’s happening at your clinic today."
        action={
          <Link className="button primary" to="/appointments?new=1">
            <Plus size={18} />
            New appointment
          </Link>
        }
      />
      {error ? (
        <>
          <Notice message={error} />
          <Button variant="secondary" onClick={refresh}>
            Try again
          </Button>
        </>
      ) : loading ? (
        <Loading />
      ) : (
        <>
          <div className="stats-grid">
            {stats.map(({ label, key, icon: Icon, foot, color }) => (
              <div className="stat-card" key={key}>
                <div className="stat-heading">
                  <span>{label}</span>
                  <div className={`stat-icon ${color}`}>
                    <Icon size={20} />
                  </div>
                </div>
                <strong className="stat-value">{data[key]}</strong>
                <small>{foot}</small>
              </div>
            ))}
          </div>
          <div className="dashboard-banner">
            <div>
              <span className="eyebrow">A WELL-PLANNED DAY, BETTER PATIENT CARE</span>
              <h2>Keep every smile on schedule.</h2>
              <p>Make room for great care. We’ll help you keep the day organized.</p>
            </div>
            <CalendarCheck size={86} strokeWidth={1.2} />
          </div>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Upcoming appointments</h2>
                <p className="muted">The next patients your team will be caring for.</p>
              </div>
              <Link className="text-link" to="/appointments">
                View all appointments
              </Link>
            </div>
            {data.appointments.length ? (
              <AppointmentTable appointments={data.appointments} />
            ) : (
              <Empty
                title="A little breathing room"
                description="No upcoming appointments. Add one to get your schedule started."
                action={
                  <Link className="button secondary" to="/appointments?new=1">
                    Add appointment
                  </Link>
                }
              />
            )}
          </section>
          <div className="quick-grid">
            <Link to="/doctors" className="quick-card">
              <span className="stat-icon teal">
                <Stethoscope size={22} />
              </span>
              <div>
                <h3>Meet your care team</h3>
                <p>Manage doctor details and weekly availability.</p>
              </div>
              <span className="quick-label">Manage doctors</span>
            </Link>
            <Link to="/appointments" className="quick-card">
              <span className="stat-icon blue">
                <CalendarDays size={22} />
              </span>
              <div>
                <h3>Plan the day ahead</h3>
                <p>Book visits and keep appointment statuses up to date.</p>
              </div>
              <span className="quick-label">Open schedule</span>
            </Link>
          </div>
        </>
      )}
    </>
  );
}
