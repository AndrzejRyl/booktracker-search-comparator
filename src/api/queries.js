import { api } from './client.js';

export async function fetchQueries(category = null) {
  const params = category ? `?category=${encodeURIComponent(category)}` : '';
  return api.get(`/queries${params}`);
}

export async function fetchQueryByIndex(index) {
  return api.get(`/queries/${index}`);
}
