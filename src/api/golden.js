import { api } from './client.js';

export async function fetchGoldenResults() {
  return api.get('/golden');
}

export async function fetchGoldenResult(queryIndex) {
  return api.get(`/golden/${queryIndex}`);
}

export async function saveGoldenResult(queryIndex, books) {
  return api.put(`/golden/${queryIndex}`, { books });
}
