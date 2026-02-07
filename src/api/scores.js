import { api } from './client.js';

export async function fetchScores() {
  return api.get('/scores');
}

export async function fetchAppScore(appId) {
  return api.get(`/scores/${appId}`);
}
