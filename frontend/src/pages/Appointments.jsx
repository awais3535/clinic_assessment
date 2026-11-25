import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DateTime } from 'luxon';
import { Search, SlidersHorizontal } from 'lucide-react';
import { api } from '../api';
import { useResource } from '../hooks';
import { useAuth } from '../auth';
import AppointmentTable from '../components/AppointmentTable';
import AppointmentForm, { statuses } from '../components/AppointmentForm';
import {
  AddButton,
  Badge,
  Button,
  ConfirmDelete,
  Empty,
  Field,
  Loading,
  Modal,
  Notice,
  PageHeading,
} from '../components/ui';
export default function Appointments() {
  const [params, setParams] = useSearchParams();
  const { timezone } = useAuth();
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const filters = new URLSearchParams();
  for (const key of ['date', 'doctor_id', 'status'])
    if (params.get(key)) filters.set(key, params.get(key));
  const list = useResource(`/appointments?${filters}`);
  const doctors = useResource('/doctors');
  const data = (list.data || []).filter((item) =>
    item.patient_name.toLowerCase().includes(search.toLowerCase()),
  );
  const formOpen = params.get('new') === '1' || editing;
  function closeForm() {
    setEditing(null);
    setParams((old) => {
      const next = new URLSearchParams(old);
      next.delete('new');
      return next;
    });
  }
  function setFilter(key, value) {
    setParams((old) => {
      const next = new URLSearchParams(old);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  }
  function newAppointment() {
    setFilter('new', '1');
  }
  async function remove() {
    setBusy(true);
    setDeleteError('');
    try {
      await api(`/appointments/${deleting.id}`, { method: 'DELETE' });
      setDeleting(null);
      setSuccess('Appointment deleted.');
      list.refresh();
    } catch (error) {
      setDeleteError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="EVERY VISIT, ORGANIZED"
        title="Appointments"
        description="A clear schedule for your team. A better experience for your patients."
        action={<AddButton onClick={newAppointment}>New appointment</AddButton>}
      />
      <Notice type="success" message={success} onClose={() => setSuccess('')} />
      <section className="panel">
        <div className="list-toolbar">
          <div>
            <h2>
              Appointment schedule <span className="count">{list.data?.length || 0}</span>
            </h2>
            <p className="muted">Manage patient visits, from booking to follow-up.</p>
          </div>
          <label className="search-input">
            <Search size={18} />
            <input
              type="search"
              aria-label="Search patients"
              placeholder="Search patient name…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>
        <div className="filter-bar">
          <SlidersHorizontal size={18} />
          <Field label="Date">
            <input
              type="date"
              value={params.get('date') || ''}
              onChange={(event) => setFilter('date', event.target.value)}
            />
          </Field>
          <Field label="Doctor">
            <select
              value={params.get('doctor_id') || ''}
              onChange={(event) => setFilter('doctor_id', event.target.value)}
            >
              <option value="">All doctors</option>
              {doctors.data?.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              value={params.get('status') || ''}
              onChange={(event) => setFilter('status', event.target.value)}
            >
              <option value="">All statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </Field>
          {(filters.size > 0 || search) && (
            <button
              className="text-link clear-filters"
              onClick={() => {
                setParams({});
                setSearch('');
              }}
            >
              Clear filters
            </button>
          )}
        </div>
        {doctors.error && (
          <div className="panel-body">
            <Notice message={doctors.error} />
            <Button variant="secondary" onClick={doctors.refresh}>
              Retry doctor list
            </Button>
          </div>
        )}
        {list.error ? (
          <div className="panel-body">
            <Notice message={list.error} />
            <Button variant="secondary" onClick={list.refresh}>
              Try again
            </Button>
          </div>
        ) : list.loading ? (
          <Loading />
        ) : !data.length ? (
          <Empty
            title={
              filters.size || search
                ? 'No matching appointments'
                : 'Your schedule is ready for its first visit'
            }
            description={
              filters.size || search
                ? 'Adjust your filters or search to find a patient visit.'
                : 'Book an appointment and give your day a little structure.'
            }
            action={
              filters.size || search ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setParams({});
                    setSearch('');
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <AddButton onClick={newAppointment}>New appointment</AddButton>
              )
            }
          />
        ) : (
          <AppointmentTable
            appointments={data}
            onView={setDetail}
            onEdit={setEditing}
            onDelete={(item) => {
              setDeleteError('');
              setDeleting(item);
            }}
          />
        )}
        <div className="table-footer">
          <span>
            {data.length} appointment{data.length === 1 ? '' : 's'} shown
          </span>
          <span>All times in {timezone}</span>
        </div>
      </section>
      {formOpen &&
        (doctors.loading ? (
          <Modal title="Loading doctors" onClose={closeForm}>
            <Loading />
          </Modal>
        ) : doctors.error ? (
          <Modal title="Doctor list unavailable" onClose={closeForm}>
            <Notice message={doctors.error} />
            <Button onClick={doctors.refresh}>Try again</Button>
          </Modal>
        ) : (
          <AppointmentForm
            appointment={editing}
            doctors={doctors.data || []}
            onClose={closeForm}
            onSaved={(message) => {
              closeForm();
              setSuccess(message);
              list.refresh();
              doctors.refresh();
            }}
          />
        ))}
      {detail && (
        <Modal
          title="Appointment details"
          subtitle={`Visit #${detail.id}`}
          onClose={() => setDetail(null)}
        >
          <Badge value={detail.status} />
          <dl className="detail-list">
            <div>
              <dt>Patient</dt>
              <dd>{detail.patient_name}</dd>
            </div>
            <div>
              <dt>Contact</dt>
              <dd>{detail.patient_contact}</dd>
            </div>
            <div>
              <dt>Doctor</dt>
              <dd>{detail.doctor_name}</dd>
            </div>
            <div>
              <dt>Date & time</dt>
              <dd>
                {DateTime.fromISO(detail.starts_at, { zone: timezone }).toFormat(
                  'dd LLL yyyy, hh:mm a',
                )}{' '}
                – {DateTime.fromISO(detail.ends_at, { zone: timezone }).toFormat('hh:mm a')}
                <small>{timezone}</small>
              </dd>
            </div>
            <div>
              <dt>Reason</dt>
              <dd className="preserve-lines">{detail.reason}</dd>
            </div>
          </dl>
          <div className="form-actions">
            <Button variant="secondary" onClick={() => setDetail(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setEditing(detail);
                setDetail(null);
              }}
            >
              Edit appointment
            </Button>
          </div>
        </Modal>
      )}
      {deleting && (
        <ConfirmDelete
          label={`${deleting.patient_name}’s appointment`}
          busy={busy}
          error={deleteError}
          onClose={() => setDeleting(null)}
          onConfirm={remove}
        />
      )}
    </>
  );
}
