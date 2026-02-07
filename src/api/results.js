import { api } from './client.js';

export async function fetchResults(appId = null, queryIndex = null) {
  const parts = [];
  if (appId) parts.push(`appId=${encodeURIComponent(appId)}`);
  if (queryIndex) parts.push(`queryIndex=${encodeURIComponent(queryIndex)}`);
  return api.get(`/results?${parts.join('&')}`);
}

export async function fetchResultsByQuery(queryIndex) {
  return api.get(`/results?queryIndex=${encodeURIComponent(queryIndex)}`);
}

export async function fetchResult(id) {
  return api.get(`/results/${id}`);
}

export async function saveResult(formData) {
  return api.post('/results', formData, true);
}

export async function deleteResult(id) {
  return api.del(`/results/${id}`);
}
