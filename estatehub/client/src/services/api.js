// Small fetch wrapper. Sends cookies (for login) and unwraps our { success, data } response shape.
// Pass a FormData object as `body` for file uploads (the browser sets the right headers itself).
const BASE = '/api';

export async function api(path, { method = 'GET', body } = {}) {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    headers: body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    const err = new Error(json.message || 'Request failed');
    err.status = res.status;
    err.errors = json.errors;
    throw err;
  }
  return json.data;
}

// Builds "?a=1&b=2" from an object, skipping empty values.
export function toQuery(params) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.set(k, v);
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}
