import { DateTime } from 'luxon';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { Badge } from './ui';
import { useAuth } from '../auth';
export default function AppointmentTable({ appointments, onView, onEdit, onDelete }) {
  const { timezone } = useAuth();
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Patient</th>
            <th>Doctor</th>
            <th>Date & time</th>
            <th>Status</th>
            <th>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((item) => {
            const start = DateTime.fromISO(item.starts_at, { zone: timezone });
            return (
              <tr key={item.id}>
                <td>
                  <div className="person">
                    <span className="avatar patient">
                      {item.patient_name
                        .split(' ')
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join('')}
                    </span>
                    <div>
                      <strong>{item.patient_name}</strong>
                      <small>{item.patient_contact}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <strong className="cell-title">{item.doctor_name}</strong>
                  <small>{item.specialization}</small>
                </td>
                <td>
                  <strong className="cell-title">{start.toFormat('dd LLL yyyy')}</strong>
                  <small>
                    {start.toFormat('hh:mm a')} ·{' '}
                    {Math.round(DateTime.fromISO(item.ends_at).diff(start, 'minutes').minutes)} min
                  </small>
                </td>
                <td>
                  <Badge value={item.status} />
                </td>
                <td>
                  <div className="row-actions">
                    {onView && (
                      <button
                        className="icon-button"
                        onClick={() => onView(item)}
                        aria-label={`View appointment for ${item.patient_name}`}
                      >
                        <Eye size={17} />
                      </button>
                    )}
                    {onEdit && (
                      <button
                        className="icon-button"
                        onClick={() => onEdit(item)}
                        aria-label={`Edit appointment for ${item.patient_name}`}
                      >
                        <Pencil size={17} />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        className="icon-button delete"
                        onClick={() => onDelete(item)}
                        aria-label={`Delete appointment for ${item.patient_name}`}
                      >
                        <Trash2 size={17} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
