import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { pool } from './db.js';
import { requireAuth } from './auth.js';
import { ApiError, errorHandler, ok } from './errors.js';
import { loginSchema, validate } from './validation.js';
import * as service from './services.js';
export const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: config.frontendUrl }));
app.use(express.json({ limit: '100kb' }));
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    ok(res, { status: 'healthy' });
  } catch {
    res.status(503).json({ success: false, message: 'Database is unavailable.' });
  }
});
const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) =>
    res
      .status(429)
      .json({
        success: false,
        message: 'Too many login attempts. Please try again in 15 minutes.',
      }),
});
app.post('/api/auth/login', loginLimit, async (req, res) => {
  const data = validate(loginSchema, req.body);
  const result = await pool.query('SELECT * FROM staff WHERE email=$1', [data.email]);
  const staff = result.rows[0];
  // Always compare a bcrypt hash to reduce account-enumeration timing differences.
  const valid = await bcrypt.compare(
    data.password,
    staff?.password_hash || '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW',
  );
  if (!staff || !valid) throw new ApiError(401, 'Email or password is incorrect.');
  const user = { id: staff.id, email: staff.email };
  const token = jwt.sign({ email: staff.email }, config.jwtSecret, {
    subject: String(staff.id),
    expiresIn: '8h',
    algorithm: 'HS256',
    issuer: 'clinic-api',
    audience: 'clinic-staff',
  });
  ok(res, { token, user, timezone: config.timezone });
});
app.use('/api', requireAuth);
app.get('/api/auth/me', async (req, res) => {
  const staff = await pool.query('SELECT id,email FROM staff WHERE id=$1', [req.staff.sub]);
  if (!staff.rowCount) throw new ApiError(401, 'This staff account no longer exists.');
  ok(res, { user: staff.rows[0], timezone: config.timezone });
});
app.get('/api/dashboard', async (_req, res) => ok(res, await service.dashboard()));
app.get('/api/doctors', async (req, res) => ok(res, await service.listDoctors(req.query)));
app.get('/api/doctors/:id', async (req, res) => ok(res, await service.getDoctor(req.params.id)));
app.post('/api/doctors', async (req, res) =>
  ok(res, await service.saveDoctor(null, req.body), 201),
);
app.patch('/api/doctors/:id', async (req, res) =>
  ok(res, await service.saveDoctor(req.params.id, req.body)),
);
app.delete('/api/doctors/:id', async (req, res) =>
  ok(res, await service.deleteDoctor(req.params.id)),
);
app.get('/api/appointments', async (req, res) =>
  ok(res, await service.listAppointments(req.query)),
);
app.get('/api/appointments/:id', async (req, res) =>
  ok(res, await service.getAppointment(req.params.id)),
);
app.post('/api/appointments', async (req, res) =>
  ok(res, await service.saveAppointment(null, req.body), 201),
);
app.patch('/api/appointments/:id', async (req, res) =>
  ok(res, await service.saveAppointment(req.params.id, req.body)),
);
app.delete('/api/appointments/:id', async (req, res) =>
  ok(res, await service.deleteAppointment(req.params.id)),
);
app.use((_req, _res, next) => next(new ApiError(404, 'API route not found.')));
app.use(errorHandler);
