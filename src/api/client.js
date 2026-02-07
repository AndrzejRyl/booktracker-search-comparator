const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const USE_MOCK = import.meta.env.VITE_USE_MOCK_API === 'true';

async function request(method, path, body, isFormData = false) {
  if (USE_MOCK) {
    const mock = await import('./mock/index.js');
    return mock.handleRequest(method, path, body);
  }

  const url = `${BASE_URL}${path}`;
  const options = { method, headers: {} };

  if (body && !isFormData) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  } else if (body && isFormData) {
    options.body = body;
  }

  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body, isFormData) => request('POST', path, body, isFormData),
  put: (path, body, isFormData) => request('PUT', path, body, isFormData),
  del: (path) => request('DELETE', path),
};
