const base = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');
export async function api(path, options = {}) {
  const token = sessionStorage.getItem('clinic_token');
  let response;
  try {
    response = await fetch(`${base}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new Error('Cannot reach the clinic server. Please check your connection and try again.');
  }
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error('The server returned an unexpected response. Please try again.');
  }
  if (!response.ok) {
    if (response.status === 401 && token) window.dispatchEvent(new Event('clinic:expired'));
    const error = new Error(payload.message || 'The request failed.');
    error.fields = payload.fields || {};
    throw error;
  }
  return payload.data;
}
