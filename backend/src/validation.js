import Joi from 'joi';
import { ApiError } from './errors.js';
const time = Joi.string()
  .pattern(/^([01]\d|2[0-3]):[0-5]\d$/)
  .required();
const interval = Joi.object({ start: time, end: time }).custom((value, helpers) =>
  value.start < value.end ? value : helpers.message('Availability end must be after its start.'),
);
const availability = Joi.object(
  Object.fromEntries(
    Array.from({ length: 7 }, (_, i) => [
      String(i + 1),
      Joi.array().items(interval).max(4).default([]),
    ]),
  ),
)
  .min(1)
  .required()
  .custom((value, helpers) => {
    for (const intervals of Object.values(value)) {
      const sorted = [...intervals].sort((a, b) => a.start.localeCompare(b.start));
      if (sorted.some((item, i) => i && item.start < sorted[i - 1].end))
        return helpers.message('Availability intervals cannot overlap.');
    }
    return value;
  });
export const doctorSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  specialization: Joi.string().trim().min(2).max(120).required(),
  phone: Joi.string()
    .trim()
    .pattern(/^[+\d\s()-]{7,30}$/)
    .allow('')
    .default(''),
  email: Joi.string()
    .trim()
    .lowercase()
    .email({ tlds: { allow: false } })
    .allow('')
    .default(''),
  availability,
  active: Joi.boolean().strict().default(true),
}).custom((value, helpers) =>
  value.phone || value.email
    ? value
    : helpers.message('Provide a doctor phone number or email address.'),
);
export const appointmentSchema = Joi.object({
  patient_name: Joi.string().trim().min(2).max(120).required(),
  patient_contact: Joi.string().trim().min(5).max(150).required(),
  doctor_id: Joi.number().integer().positive().required(),
  starts_at: Joi.string()
    .isoDate()
    .pattern(/(Z|[+-]\d{2}:\d{2})$/)
    .required(),
  ends_at: Joi.string()
    .isoDate()
    .pattern(/(Z|[+-]\d{2}:\d{2})$/)
    .required(),
  reason: Joi.string().trim().min(2).max(1000).required(),
  status: Joi.string().valid('pending', 'confirmed', 'completed', 'cancelled').default('pending'),
});
export const loginSchema = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .email({ tlds: { allow: false } })
    .required(),
  password: Joi.string().max(200).required(),
});
export function validate(schema, body) {
  const { value, error } = schema.validate(body, { abortEarly: false });
  if (error)
    throw new ApiError(
      400,
      'Please check the highlighted fields.',
      Object.fromEntries(
        error.details.map((item) => [item.path.join('.') || 'form', item.message]),
      ),
    );
  return value;
}
export function idOf(value) {
  if (!/^\d+$/.test(String(value)) || Number(value) < 1 || Number(value) > 2147483647)
    throw new ApiError(400, 'Invalid record ID.');
  return Number(value);
}
