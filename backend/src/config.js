export const config = {
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  timezone: process.env.CLINIC_TIMEZONE || 'Asia/Karachi',
};
export function validateConfig() {
  if (!config.databaseUrl) throw new Error('DATABASE_URL is required. Copy .env.example to .env.');
  if (!config.jwtSecret || config.jwtSecret.length < 32)
    throw new Error('JWT_SECRET must contain at least 32 characters.');
}
