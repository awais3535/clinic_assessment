export class ApiError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}
export function errorHandler(error, _req, res, _next) {
  if (error.code === '23503')
    error = new ApiError(
      409,
      'This doctor has appointments. Deactivate the doctor instead, or delete their appointments first.',
    );
  if (error.type === 'entity.parse.failed')
    error = new ApiError(400, 'Request body must be valid JSON.');
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  res.status(status).json({
    success: false,
    message:
      status >= 500
        ? 'The server could not complete your request. Please try again.'
        : error.message,
    ...(error.fields && { fields: error.fields }),
  });
}
export const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
