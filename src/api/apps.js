import { api } from './client.js';

export async function fetchApps() {
  return api.get('/apps');
}

export async function fetchApp(id) {
  return api.get(`/apps/${id}`);
}

export async function createApp(formData) {
  return api.post('/apps', formData, true);
}

export async function updateApp(id, formData) {
  return api.put(`/apps/${id}`, formData, true);
}

export async function deleteApp(id) {
  return api.del(`/apps/${id}`);
}
