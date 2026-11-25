import { DateTime } from 'luxon';
import { pool, transaction } from './db.js';
import { ApiError } from './errors.js';
import { config } from './config.js';
import { doctorSchema, appointmentSchema, validate, idOf } from './validation.js';
const doctorFields = ['name', 'specialization', 'phone', 'email', 'availability', 'active'];
const appointmentFields = [
  'patient_name',
  'patient_contact',
  'doctor_id',
  'starts_at',
  'ends_at',
  'reason',
  'status',
];
function editable(row, fields) {
  return Object.fromEntries(
    fields.map((key) => [key, row[key] instanceof Date ? row[key].toISOString() : row[key]]),
  );
}
function knownFields(body, fields) {
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    Object.keys(body).some((key) => !fields.includes(key))
  )
    throw new ApiError(400, 'Request contains unsupported fields.');
}
export async function getDoctor(id, db = pool, lock = false) {
  const result = await db.query(`SELECT * FROM doctors WHERE id=$1${lock ? ' FOR UPDATE' : ''}`, [
    idOf(id),
  ]);
  if (!result.rowCount) throw new ApiError(404, 'Doctor not found.');
  return result.rows[0];
}
export async function listDoctors(query) {
  const search = String(query.search || '').slice(0, 120);
  return (
    await pool.query(
      'SELECT * FROM doctors WHERE name ILIKE $1 OR specialization ILIKE $1 ORDER BY active DESC, name',
      [`%${search}%`],
    )
  ).rows;
}
export async function saveDoctor(id, body) {
  knownFields(body, doctorFields);
  return transaction(async (db) => {
    const existing = id ? await getDoctor(id, db, true) : null;
    const data = validate(doctorSchema, {
      ...(existing && editable(existing, doctorFields)),
      ...body,
    });
    const args = doctorFields.map((field) =>
      field === 'availability' ? JSON.stringify(data[field]) : data[field],
    );
    const result = existing
      ? await db.query(
          'UPDATE doctors SET name=$1,specialization=$2,phone=$3,email=$4,availability=$5,active=$6 WHERE id=$7 RETURNING *',
          [...args, existing.id],
        )
      : await db.query(
          'INSERT INTO doctors(name,specialization,phone,email,availability,active) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
          args,
        );
    return result.rows[0];
  });
}
export async function deleteDoctor(id) {
  const result = await pool.query('DELETE FROM doctors WHERE id=$1 RETURNING id', [idOf(id)]);
  if (!result.rowCount) throw new ApiError(404, 'Doctor not found.');
  return result.rows[0];
}
export async function getAppointment(id, db = pool, lock = false) {
  const result = await db.query(
    `SELECT a.*, d.name AS doctor_name, d.specialization FROM appointments a JOIN doctors d ON d.id=a.doctor_id WHERE a.id=$1${lock ? ' FOR UPDATE OF a' : ''}`,
    [idOf(id)],
  );
  if (!result.rowCount) throw new ApiError(404, 'Appointment not found.');
  return result.rows[0];
}
export async function listAppointments(query) {
  const clauses = [],
    args = [];
  const add = (sql, value) => {
    args.push(value);
    clauses.push(sql.replace('?', `$${args.length}`));
  };
  if (query.doctor_id) add('a.doctor_id=?', idOf(query.doctor_id));
  if (query.status) {
    if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(query.status))
      throw new ApiError(400, 'Invalid appointment status.');
    add('a.status=?', query.status);
  }
  if (query.date) {
    const day = DateTime.fromISO(String(query.date), { zone: config.timezone });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(query.date) || !day.isValid)
      throw new ApiError(400, 'Date must use YYYY-MM-DD.');
    add('a.starts_at>=?', day.startOf('day').toISO());
    add('a.starts_at<?', day.plus({ days: 1 }).startOf('day').toISO());
  }
  if (query.search) add('a.patient_name ILIKE ?', `%${String(query.search).slice(0, 120)}%`);
  return (
    await pool.query(
      `SELECT a.*,d.name AS doctor_name,d.specialization FROM appointments a JOIN doctors d ON d.id=a.doctor_id ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''} ORDER BY a.starts_at DESC,a.id DESC`,
      args,
    )
  ).rows;
}
export async function saveAppointment(id, body) {
  knownFields(body, appointmentFields);
  return transaction(async (db) => {
    const existing = id ? await getAppointment(id, db, true) : null;
    const data = validate(appointmentSchema, {
      ...(existing && editable(existing, appointmentFields)),
      ...body,
    });
    const start = DateTime.fromISO(data.starts_at, { zone: config.timezone });
    const end = DateTime.fromISO(data.ends_at, { zone: config.timezone });
    if (!start.isValid || !end.isValid || end <= start || end.diff(start, 'minutes').minutes > 480)
      throw new ApiError(
        400,
        'Appointment duration must be greater than zero and no longer than 8 hours.',
        { ends_at: 'Choose an end time after the start, within 8 hours.' },
      );
    // Serialize bookings for this doctor before checking overlaps, including concurrent requests.
    const doctor = await getDoctor(data.doctor_id, db, true);
    const schedulingChanged =
      !existing ||
      existing.doctor_id !== data.doctor_id ||
      +new Date(existing.starts_at) !== start.toMillis() ||
      +new Date(existing.ends_at) !== end.toMillis() ||
      existing.status === 'cancelled';
    if (data.status !== 'cancelled') {
      if (schedulingChanged) {
        if (!doctor.active)
          throw new ApiError(409, 'This doctor is inactive. Choose an active doctor.');
        const intervals = doctor.availability[String(start.weekday)] || [];
        if (
          !start.hasSame(end, 'day') ||
          !intervals.some(
            (interval) =>
              start.toFormat('HH:mm') >= interval.start &&
              end.toFormat('HH:mm') <= interval.end &&
              (end.toFormat('HH:mm') !== interval.end ||
                (end.second === 0 && end.millisecond === 0)),
          )
        )
          throw new ApiError(409, 'This time is outside the doctor’s availability.');
      }
      const overlap = await db.query(
        "SELECT id FROM appointments WHERE doctor_id=$1 AND status<>'cancelled' AND starts_at<$3 AND ends_at>$2 AND id<>$4 LIMIT 1",
        [data.doctor_id, start.toISO(), end.toISO(), existing?.id || 0],
      );
      if (overlap.rowCount)
        throw new ApiError(
          409,
          'This doctor already has an appointment at that time. Choose another time.',
        );
    }
    const args = appointmentFields.map((field) => data[field]);
    const result = existing
      ? await db.query(
          'UPDATE appointments SET patient_name=$1,patient_contact=$2,doctor_id=$3,starts_at=$4,ends_at=$5,reason=$6,status=$7 WHERE id=$8 RETURNING id',
          [...args, existing.id],
        )
      : await db.query(
          'INSERT INTO appointments(patient_name,patient_contact,doctor_id,starts_at,ends_at,reason,status) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id',
          args,
        );
    return getAppointment(result.rows[0].id, db);
  });
}
export async function deleteAppointment(id) {
  const result = await pool.query('DELETE FROM appointments WHERE id=$1 RETURNING id', [idOf(id)]);
  if (!result.rowCount) throw new ApiError(404, 'Appointment not found.');
  return result.rows[0];
}
export async function dashboard() {
  const today = DateTime.now().setZone(config.timezone).startOf('day');
  const counts = await pool.query(
    `SELECT (SELECT COUNT(*)::int FROM doctors) AS total_doctors,
    COUNT(*) FILTER(WHERE starts_at>=NOW() AND status IN ('pending','confirmed'))::int AS upcoming,
    COUNT(*) FILTER(WHERE starts_at >= $1 AND starts_at < $2 AND status<>'cancelled')::int AS today,
    COUNT(*) FILTER(WHERE status='pending')::int AS pending FROM appointments`,
    [today.toISO(), today.plus({ days: 1 }).toISO()],
  );
  const upcoming = await pool.query(
    "SELECT a.*,d.name AS doctor_name,d.specialization FROM appointments a JOIN doctors d ON d.id=a.doctor_id WHERE a.starts_at>=NOW() AND a.status IN ('pending','confirmed') ORDER BY a.starts_at LIMIT 6",
  );
  return { ...counts.rows[0], appointments: upcoming.rows, timezone: config.timezone };
}
