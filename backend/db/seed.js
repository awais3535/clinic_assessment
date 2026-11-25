import bcrypt from 'bcryptjs';
import { DateTime } from 'luxon';
import { fileURLToPath } from 'node:url';
import { config } from '../src/config.js';
import { pool, transaction } from '../src/db.js';
export async function seed() {
  const email = process.env.STAFF_EMAIL?.toLowerCase();
  const password = process.env.STAFF_PASSWORD;
  if (!email || !password || password.length < 10)
    throw new Error('Set STAFF_EMAIL and STAFF_PASSWORD (at least 10 characters) before seeding.');
  const hash = await bcrypt.hash(password, 12);
  await transaction(async (db) => {
    await db.query('SELECT pg_advisory_xact_lock(74819002)');
    await db.query(
      'INSERT INTO staff(email,password_hash) VALUES($1,$2) ON CONFLICT(email) DO NOTHING',
      [email, hash],
    );
    const marker = await db.query(
      "INSERT INTO seed_runs(name) VALUES('demo-v1') ON CONFLICT DO NOTHING RETURNING name",
    );
    if (!marker.rowCount) return;
    const availability = Object.fromEntries(
      Array.from({ length: 7 }, (_, i) => [String(i + 1), [{ start: '09:00', end: '18:00' }]]),
    );
    const doctors = [
      ['Dr. Sarah Ahmed', 'General Dentistry', '+92 300 555 0101', 'sarah@clinic.demo', true],
      ['Dr. Omar Khan', 'Orthodontics', '+92 300 555 0102', 'omar@clinic.demo', true],
      ['Dr. Ayesha Malik', 'Pediatric Dentistry', '+92 300 555 0103', 'ayesha@clinic.demo', true],
      ['Dr. Ali Hassan', 'Oral Surgery', '+92 300 555 0104', 'ali@clinic.demo', false],
    ];
    const ids = [];
    for (const [name, specialization, phone, contact, active] of doctors) {
      const result = await db.query(
        'INSERT INTO doctors(name,specialization,phone,email,availability,active) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',
        [name, specialization, phone, contact, JSON.stringify(availability), active],
      );
      ids.push(result.rows[0].id);
    }
    const today = DateTime.now().setZone(config.timezone).startOf('day');
    const names = [
      'Amina Yusuf',
      'Hassan Raza',
      'Zara Shah',
      'Bilal Ahmed',
      'Fatima Noor',
      'Usman Ali',
      'Maryam Saeed',
      'Hamza Iqbal',
      'Noor Fatima',
    ];
    for (let i = 0; i < names.length; i++) {
      const start = today.plus({ days: Math.floor(i / 3) - 1, hours: 10 + (i % 3) * 2 });
      await db.query(
        'INSERT INTO appointments(patient_name,patient_contact,doctor_id,starts_at,ends_at,reason,status) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [
          names[i],
          '+92 300 555 0200',
          ids[i % 3],
          start.toISO(),
          start.plus({ minutes: 30 }).toISO(),
          ['Routine checkup', 'Dental cleaning', 'Orthodontic consultation'][i % 3],
          i < 3 ? 'completed' : i % 2 ? 'confirmed' : 'pending',
        ],
      );
    }
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await seed();
    console.log('Database seed complete (existing records preserved).');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
