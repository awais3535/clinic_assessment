import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { DateTime } from 'luxon';

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl)
  throw new Error(
    'TEST_DATABASE_URL is required. Use a disposable database whose name ends in _test.',
  );
const parsed = new URL(testUrl);
if (!parsed.pathname.endsWith('_test') || testUrl === process.env.DATABASE_URL)
  throw new Error(
    'Refusing to clear a non-test database. TEST_DATABASE_URL must be distinct and its name must end in _test.',
  );
process.env.DATABASE_URL = testUrl;
process.env.JWT_SECRET = 'test-only-secret-at-least-32-characters-long';
process.env.STAFF_EMAIL = 'staff@test.example';
process.env.STAFF_PASSWORD = 'TestPassword123!';
const { app } = await import('../src/app.js');
const { pool } = await import('../src/db.js');
const { migrate } = await import('../db/migrate.js');
const { seed } = await import('../db/seed.js');
let token, doctorId;
const auth = () => ({ Authorization: `Bearer ${token}` });
const availability = Object.fromEntries(
  Array.from({ length: 7 }, (_, i) => [i + 1, [{ start: '09:00', end: '18:00' }]]),
);
const doctor = {
  name: 'Dr. Integration',
  specialization: 'General Dentistry',
  phone: '+92 300 111 2222',
  email: '',
  active: true,
  availability,
};
const start = DateTime.now()
  .setZone('Asia/Karachi')
  .plus({ days: 10 })
  .startOf('day')
  .set({ hour: 10 });
const booking = (offset = 0) => ({
  patient_name: 'Test Patient',
  patient_contact: '03001234567',
  doctor_id: doctorId,
  starts_at: start.plus({ minutes: offset }).toUTC().toISO(),
  ends_at: start
    .plus({ minutes: offset + 30 })
    .toUTC()
    .toISO(),
  reason: 'Test consultation',
  status: 'pending',
});

before(async () => {
  await migrate();
  await pool.query('TRUNCATE appointments, doctors, staff, seed_runs RESTART IDENTITY CASCADE');
  await seed();
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: process.env.STAFF_EMAIL, password: process.env.STAFF_PASSWORD });
  assert.equal(login.status, 200);
  token = login.body.data.token;
});
after(async () => {
  await pool.end();
});

test('health, authentication, invalid login, expired JWT, and malformed requests', async () => {
  assert.equal((await request(app).get('/api/health')).body.data.status, 'healthy');
  assert.equal((await request(app).get('/api/doctors')).status, 401);
  assert.equal(
    (
      await request(app)
        .post('/api/auth/login')
        .send({ email: process.env.STAFF_EMAIL, password: 'wrong' })
    ).status,
    401,
  );
  const expired = jwt.sign({ sub: '1' }, process.env.JWT_SECRET, {
    expiresIn: -1,
    issuer: 'clinic-api',
    audience: 'clinic-staff',
  });
  assert.equal(
    (await request(app).get('/api/doctors').set('Authorization', `Bearer ${expired}`)).status,
    401,
  );
  assert.equal(
    (await request(app).get('/api/auth/me').set(auth())).body.data.user.email,
    process.env.STAFF_EMAIL,
  );
  assert.equal(
    (
      await request(app)
        .post('/api/doctors')
        .set(auth())
        .set('Content-Type', 'application/json')
        .send('{bad')
    ).status,
    400,
  );
  assert.equal((await request(app).get('/api/unknown').set(auth())).status, 404);
});
test('seed is idempotent, preserves changes, and does not restore deleted demo data', async () => {
  await pool.query("UPDATE doctors SET name='Preserved edit' WHERE id=1");
  await pool.query('DELETE FROM appointments WHERE id=1');
  await seed();
  assert.equal(
    (await pool.query('SELECT name FROM doctors WHERE id=1')).rows[0].name,
    'Preserved edit',
  );
  assert.equal(
    (await pool.query('SELECT COUNT(*)::int AS count FROM appointments')).rows[0].count,
    8,
  );
});
test('doctor CRUD, search, contact validation, schedule validation, unknown fields, and ID errors', async () => {
  const created = await request(app).post('/api/doctors').set(auth()).send(doctor);
  assert.equal(created.status, 201);
  doctorId = created.body.data.id;
  assert.equal(
    (await request(app).get(`/api/doctors/${doctorId}`).set(auth())).body.data.name,
    doctor.name,
  );
  assert.equal(
    (await request(app).get('/api/doctors?search=Integration').set(auth())).body.data.length,
    1,
  );
  assert.equal(
    (await request(app).patch(`/api/doctors/${doctorId}`).set(auth()).send({ name: 'Dr. Updated' }))
      .body.data.name,
    'Dr. Updated',
  );
  assert.equal(
    (
      await request(app)
        .post('/api/doctors')
        .set(auth())
        .send({ ...doctor, phone: '', email: '' })
    ).status,
    400,
  );
  assert.equal(
    (
      await request(app)
        .post('/api/doctors')
        .set(auth())
        .send({ ...doctor, active: 'false' })
    ).status,
    400,
  );
  assert.equal(
    (
      await request(app)
        .post('/api/doctors')
        .set(auth())
        .send({ ...doctor, availability: { 1: [{ start: '12:00', end: '09:00' }] } })
    ).status,
    400,
  );
  assert.equal(
    (
      await request(app)
        .post('/api/doctors')
        .set(auth())
        .send({
          ...doctor,
          availability: {
            1: [
              { start: '09:00', end: '12:00' },
              { start: '11:00', end: '13:00' },
            ],
          },
        })
    ).status,
    400,
  );
  assert.equal(
    (await request(app).patch(`/api/doctors/${doctorId}`).set(auth()).send({ id: 100 })).status,
    400,
  );
  assert.equal((await request(app).get('/api/doctors/nope').set(auth())).status, 400);
  assert.equal((await request(app).get('/api/doctors/2147483647').set(auth())).status, 404);
});
test('appointment CRUD, partial status update, joined details, filters, and foreign-key delete protection', async () => {
  const created = await request(app).post('/api/appointments').set(auth()).send(booking());
  assert.equal(created.status, 201);
  const id = created.body.data.id;
  assert.equal(created.body.data.doctor_name, 'Dr. Updated');
  assert.equal(
    (await request(app).get(`/api/appointments/${id}`).set(auth())).body.data.patient_name,
    'Test Patient',
  );
  const edited = await request(app)
    .patch(`/api/appointments/${id}`)
    .set(auth())
    .send({ status: 'confirmed', patient_name: 'Updated Patient' });
  assert.equal(edited.status, 200);
  assert.equal(edited.body.data.status, 'confirmed');
  const filtered = await request(app)
    .get(`/api/appointments?doctor_id=${doctorId}&status=confirmed&date=${start.toISODate()}`)
    .set(auth());
  assert.equal(filtered.body.data.length, 1);
  assert.equal((await request(app).delete(`/api/doctors/${doctorId}`).set(auth())).status, 409);
  assert.equal((await request(app).delete(`/api/appointments/${id}`).set(auth())).status, 200);
  assert.equal((await request(app).get(`/api/appointments/${id}`).set(auth())).status, 404);
});
test('invalid appointments, date filters, unknown references, inactive doctors, and availability boundaries', async () => {
  assert.equal(
    (
      await request(app)
        .post('/api/appointments')
        .set(auth())
        .send({ ...booking(), patient_name: '' })
    ).status,
    400,
  );
  assert.equal(
    (
      await request(app)
        .post('/api/appointments')
        .set(auth())
        .send({ ...booking(), doctor_id: 999999 })
    ).status,
    404,
  );
  assert.equal(
    (
      await request(app)
        .post('/api/appointments')
        .set(auth())
        .send({ ...booking(), ends_at: booking().starts_at })
    ).status,
    400,
  );
  assert.equal(
    (
      await request(app)
        .post('/api/appointments')
        .set(auth())
        .send({ ...booking(), starts_at: '2026-12-01T10:00:00' })
    ).status,
    400,
  );
  assert.equal(
    (await request(app).get('/api/appointments?date=not-a-date').set(auth())).status,
    400,
  );
  assert.equal(
    (await request(app).get('/api/appointments?status=invalid').set(auth())).status,
    400,
  );
  assert.equal(
    (await request(app).post('/api/appointments').set(auth()).send(booking(-120))).status,
    409,
  );
  const atClosing = {
    ...booking(),
    starts_at: start.set({ hour: 17, minute: 30 }).toISO(),
    ends_at: start.set({ hour: 18 }).toISO(),
  };
  const closing = await request(app).post('/api/appointments').set(auth()).send(atClosing);
  assert.equal(closing.status, 201);
  assert.equal(
    (
      await request(app)
        .post('/api/appointments')
        .set(auth())
        .send({ ...atClosing, ends_at: start.set({ hour: 18, second: 1 }).toISO() })
    ).status,
    409,
  );
  await request(app).delete(`/api/appointments/${closing.body.data.id}`).set(auth());
  await request(app).patch(`/api/doctors/${doctorId}`).set(auth()).send({ active: false });
  assert.equal(
    (await request(app).post('/api/appointments').set(auth()).send(booking())).status,
    409,
  );
  await request(app).patch(`/api/doctors/${doctorId}`).set(auth()).send({ active: true });
});
test('concurrent overlapping bookings allow exactly one request; adjacent visits and cancellation work', async () => {
  const results = await Promise.all([
    request(app).post('/api/appointments').set(auth()).send(booking()),
    request(app).post('/api/appointments').set(auth()).send(booking(15)),
  ]);
  assert.deepEqual(results.map((response) => response.status).sort(), [201, 409]);
  const winner = results.find((response) => response.status === 201).body.data;
  const adjacentStart = DateTime.fromISO(winner.ends_at);
  const adjacent = await request(app)
    .post('/api/appointments')
    .set(auth())
    .send({
      ...booking(),
      starts_at: adjacentStart.toISO(),
      ends_at: adjacentStart.plus({ minutes: 30 }).toISO(),
    });
  assert.equal(adjacent.status, 201);
  const changed = await request(app)
    .patch(`/api/appointments/${adjacent.body.data.id}`)
    .set(auth())
    .send({ starts_at: winner.starts_at, ends_at: winner.ends_at });
  assert.equal(changed.status, 409);
  assert.equal(
    (
      await request(app)
        .patch(`/api/appointments/${winner.id}`)
        .set(auth())
        .send({ status: 'cancelled' })
    ).status,
    200,
  );
  const replacement = await request(app)
    .post('/api/appointments')
    .set(auth())
    .send({ ...booking(), starts_at: winner.starts_at, ends_at: winner.ends_at });
  assert.equal(replacement.status, 201);
  assert.equal(
    (
      await request(app)
        .patch(`/api/appointments/${winner.id}`)
        .set(auth())
        .send({ status: 'confirmed' })
    ).status,
    409,
  );
});
test('dashboard counts match the database and include joined upcoming appointments', async () => {
  const result = await request(app).get('/api/dashboard').set(auth());
  assert.equal(result.status, 200);
  const count = await pool.query('SELECT COUNT(*)::int AS count FROM doctors');
  assert.equal(result.body.data.total_doctors, count.rows[0].count);
  assert.equal(result.body.data.timezone, 'Asia/Karachi');
  assert.ok(result.body.data.upcoming >= 1);
  assert.ok(result.body.data.appointments.every((item) => item.doctor_name));
});
test('unreferenced doctor deletion succeeds and persists', async () => {
  const created = await request(app)
    .post('/api/doctors')
    .set(auth())
    .send({ ...doctor, name: 'Delete Me' });
  assert.equal(
    (await request(app).delete(`/api/doctors/${created.body.data.id}`).set(auth())).status,
    200,
  );
  assert.equal(
    (await request(app).get(`/api/doctors/${created.body.data.id}`).set(auth())).status,
    404,
  );
});
