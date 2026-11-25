import { useState } from 'react';
import { DateTime } from 'luxon';
import { useAuth } from '../auth';
import { api } from '../api';
import { Button, Field, Modal, Notice } from './ui';
import { Availability } from './DoctorForm';
export const statuses = ['pending', 'confirmed', 'completed', 'cancelled'];
export default function AppointmentForm({ appointment, doctors, onClose, onSaved }) {
  const { timezone } = useAuth();
  const start = appointment
    ? DateTime.fromISO(appointment.starts_at, { zone: timezone })
    : DateTime.now().setZone(timezone).plus({ days: 1 }).set({ hour: 10, minute: 0 });
  const [form, setForm] = useState({
    patient_name: appointment?.patient_name || '',
    patient_contact: appointment?.patient_contact || '',
    doctor_id: appointment?.doctor_id || '',
    date: start.toISODate(),
    time: start.toFormat('HH:mm'),
    duration: appointment
      ? DateTime.fromISO(appointment.ends_at).diff(start, 'minutes').minutes
      : 30,
    reason: appointment?.reason || '',
    status: appointment?.status || 'pending',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  const selectedDoctor = doctors.find((doctor) => doctor.id === Number(form.doctor_id));
  function change(event) {
    setForm((old) => ({ ...old, [event.target.name]: event.target.value }));
  }
  async function submit(event) {
    event.preventDefault();
    setError('');
    setFields({});
    const startsAt = DateTime.fromISO(`${form.date}T${form.time}`, { zone: timezone });
    const duration = Number(form.duration);
    if (!startsAt.isValid || !duration || duration < 1 || duration > 480) {
      setError('Choose a valid date, time, and duration between 1 and 480 minutes.');
      return;
    }
    const endsAt = startsAt.plus({ minutes: duration });
    const schedulingChanged =
      !appointment ||
      appointment.doctor_id !== Number(form.doctor_id) ||
      +new Date(appointment.starts_at) !== startsAt.toMillis() ||
      +new Date(appointment.ends_at) !== endsAt.toMillis() ||
      appointment.status === 'cancelled';
    if (form.status !== 'cancelled' && schedulingChanged) {
      if (!selectedDoctor?.active) {
        setError('Choose an active doctor for this appointment.');
        return;
      }
      if (
        !startsAt.hasSame(endsAt, 'day') ||
        !(selectedDoctor.availability[String(startsAt.weekday)] || []).some(
          (slot) =>
            startsAt.toFormat('HH:mm') >= slot.start && endsAt.toFormat('HH:mm') <= slot.end,
        )
      ) {
        setError('Choose a time within the doctor’s availability shown below.');
        return;
      }
    }
    setBusy(true);
    try {
      await api(`/appointments${appointment ? `/${appointment.id}` : ''}`, {
        method: appointment ? 'PATCH' : 'POST',
        body: {
          patient_name: form.patient_name,
          patient_contact: form.patient_contact,
          doctor_id: Number(form.doctor_id),
          starts_at: startsAt.toUTC().toISO(),
          ends_at: endsAt.toUTC().toISO(),
          reason: form.reason,
          status: form.status,
        },
      });
      onSaved(appointment ? 'Appointment updated.' : 'Appointment booked successfully.');
    } catch (error) {
      setError(error.message);
      setFields(error.fields || {});
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={appointment ? 'Edit appointment' : 'New appointment'}
      subtitle={`Schedule a patient visit. All times are in ${timezone}.`}
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={submit}>
        <Notice message={error} />
        <div className="form-grid">
          <Field label="Patient name *" error={fields.patient_name}>
            <input
              name="patient_name"
              value={form.patient_name}
              onChange={change}
              required
              minLength={2}
              maxLength={120}
              placeholder="Patient’s full name"
            />
          </Field>
          <Field label="Patient contact *" error={fields.patient_contact}>
            <input
              name="patient_contact"
              value={form.patient_contact}
              onChange={change}
              required
              minLength={5}
              maxLength={150}
              placeholder="Phone number or email"
            />
          </Field>
          <Field label="Doctor *" error={fields.doctor_id} className="full-width">
            <select name="doctor_id" value={form.doctor_id} onChange={change} required>
              <option value="">Select a doctor</option>
              {doctors
                .filter((doctor) => doctor.active || doctor.id === appointment?.doctor_id)
                .map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name} · {doctor.specialization}
                    {!doctor.active ? ' (inactive)' : ''}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Date *" error={fields.starts_at}>
            <input type="date" name="date" value={form.date} onChange={change} required />
          </Field>
          <Field label="Start time *">
            <input type="time" name="time" value={form.time} onChange={change} required />
          </Field>
          <Field label="Duration (minutes) *" error={fields.ends_at}>
            <input
              type="number"
              name="duration"
              min="1"
              max="480"
              step="1"
              value={form.duration}
              onChange={change}
              required
            />
          </Field>
          <Field label="Status" error={fields.status}>
            <select name="status" value={form.status} onChange={change}>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Reason for visit *" error={fields.reason} className="full-width">
            <textarea
              name="reason"
              value={form.reason}
              onChange={change}
              required
              minLength={2}
              maxLength={1000}
              rows={3}
              placeholder="What brings the patient in?"
            />
          </Field>
        </div>
        {!doctors.some((doctor) => doctor.active) && (
          <Notice message="There are no active doctors. Add or activate a doctor before making a new booking." />
        )}
        {selectedDoctor && (
          <details className="availability-details">
            <summary>{selectedDoctor.name} — weekly availability</summary>
            <Availability availability={selectedDoctor.availability} />
          </details>
        )}
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : appointment ? 'Save changes' : 'Book appointment'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
