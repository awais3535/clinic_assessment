import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { ApiError } from './errors.js';
export function requireAuth(req, _res, next) {
  try {
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) throw new Error('No token');
    req.staff = jwt.verify(token, config.jwtSecret, {
      algorithms: ['HS256'],
      issuer: 'clinic-api',
      audience: 'clinic-staff',
    });
    next();
  } catch {
    next(new ApiError(401, 'Your session has expired. Please sign in again.'));
  }
}
