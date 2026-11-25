import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Field, Modal, Notice } from './ui';
import { api } from '../api';
export const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const defaultAvailability = Object.fromEntries(
  days.map((_, i) => [i + 1, i < 5 ? [{ start: '09:00', end: '17:00' }] : []]),
);
export function Availability({ availability }) {
  return (
    <div className="availability-list">
      {days.map((day, i) => (
        <div key={day}>
          <strong>{day}</strong>
          <span>
            {availability[String(i + 1)]?.length
              ? availability[String(i + 1)].map((slot) => `${slot.start}–${slot.end}`).join(', ')
              : 'Unavailable'}
          </span>
        </div>
      ))}
    </div>
  );
}
export default function DoctorForm({ doctor, onClose, onSaved }) {
  const [form, setForm] = useState(
    doctor
      ? {
          name: doctor.name,
          specialization: doctor.specialization,
          phone: doctor.phone,
          email: doctor.email,
          active: doctor.active,
          availability: doctor.availability,
        }
      : {
          name: '',
          specialization: '',
          phone: '',
          email: '',
          active: true,
          availability: defaultAvailability,
        },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  function change(event) {
    const { name, value, type, checked } = event.target;
    setForm((old) => ({ ...old, [name]: type === 'checkbox' ? checked : value }));
  }
  function setSlots(day, slots) {
    setForm((old) => ({ ...old, availability: { ...old.availability, [day]: slots } }));
  }
  async function submit(event) {
    event.preventDefault();
    setError('');
    setFields({});
    if (!form.phone.trim() && !form.email.trim()) {
      setError('Provide a phone number or email address.');
      return;
    }
    if (form.phone.trim() && !/^[+\d\s()-]{7,30}$/.test(form.phone.trim())) {
      setFields({ phone: 'Enter a valid phone number containing 7–30 characters.' });
      return;
    }
    for (const slots of Object.values(form.availability)) {
      const sorted = [...slots].sort((a, b) => a.start.localeCompare(b.start));
      if (
        sorted.some(
          (slot, i) =>
            !slot.start ||
            !slot.end ||
            slot.start >= slot.end ||
            (i > 0 && slot.start < sorted[i - 1].end),
        )
      ) {
        setError('Availability intervals must have valid start/end times and cannot overlap.');
        return;
      }
    }
    setBusy(true);
    try {
      await api(`/doctors${doctor ? `/${doctor.id}` : ''}`, {
        method: doctor ? 'PATCH' : 'POST',
        body: form,
      });
      onSaved(doctor ? 'Doctor details updated.' : 'Doctor added to your care team.');
    } catch (error) {
      setError(error.message);
      setFields(error.fields || {});
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={doctor ? 'Edit doctor' : 'Add a doctor'}
      subtitle="Keep your care team’s details and availability up to date."
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={submit}>
        <Notice message={error} />
        <div className="form-grid">
          <Field label="Full name *" error={fields.name}>
            <input
              name="name"
              value={form.name}
              onChange={change}
              required
              minLength={2}
              maxLength={120}
              placeholder="Dr. Sarah Ahmed"
            />
          </Field>
          <Field label="Specialization *" error={fields.specialization}>
            <input
              name="specialization"
              value={form.specialization}
              onChange={change}
              required
              minLength={2}
              maxLength={120}
              placeholder="General Dentistry"
            />
          </Field>
          <Field label="Phone number" error={fields.phone}>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={change}
              maxLength={30}
              placeholder="+92 300 123 4567"
            />
          </Field>
          <Field label="Email address" error={fields.email}>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={change}
              maxLength={150}
              placeholder="doctor@clinic.demo"
            />
          </Field>
        </div>
        <p className="form-hint">Provide at least one contact method. * Required fields.</p>
        <label className="check-label">
          <input type="checkbox" name="active" checked={form.active} onChange={change} />
          <span>Active — available for new bookings</span>
        </label>
        <div className="form-section-heading">
          <h3>Weekly availability</h3>
          <p className="muted">Clinic local time. Add separate intervals for breaks.</p>
        </div>
        <div className="schedule-editor">
          {days.map((day, i) => {
            const key = String(i + 1),
              slots = form.availability[key] || [];
            return (
              <div className="schedule-day" key={day}>
                <div className="schedule-day-label">
                  <strong>{day.slice(0, 3)}</strong>
                  {!slots.length && <span className="muted">Unavailable</span>}
                </div>
                <div className="schedule-slots">
                  {slots.map((slot, index) => (
                    <div className="schedule-slot" key={index}>
                      <input
                        type="time"
                        value={slot.start}
                        aria-label={`${day} interval ${index + 1} start`}
                        required
                        onChange={(event) =>
                          setSlots(
                            key,
                            slots.map((item, j) =>
                              j === index ? { ...item, start: event.target.value } : item,
                            ),
                          )
                        }
                      />
                      <span>to</span>
                      <input
                        type="time"
                        value={slot.end}
                        aria-label={`${day} interval ${index + 1} end`}
                        required
                        onChange={(event) =>
                          setSlots(
                            key,
                            slots.map((item, j) =>
                              j === index ? { ...item, end: event.target.value } : item,
                            ),
                          )
                        }
                      />
                      <button
                        className="icon-button"
                        type="button"
                        aria-label={`Remove ${day} interval ${index + 1}`}
                        onClick={() =>
                          setSlots(
                            key,
                            slots.filter((_, j) => j !== index),
                          )
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  className="icon-button add-interval"
                  type="button"
                  aria-label={`Add ${day} interval`}
                  disabled={slots.length >= 4}
                  onClick={() => setSlots(key, [...slots, { start: '09:00', end: '17:00' }])}
                >
                  <Plus size={16} />
                </button>
              </div>
            );
          })}
        </div>
        {Object.entries(fields)
          .filter(([key]) => key.startsWith('availability'))
          .map(([key, message]) => (
            <small className="field-error" key={key}>
              {message}
            </small>
          ))}
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : doctor ? 'Save changes' : 'Add doctor'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
