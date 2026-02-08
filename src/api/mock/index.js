import { getQueries, getQueryByIndex } from './queries.js';
import { getApps, getAppById, createApp, updateApp, deleteAppById } from './apps.js';
import { getResults, getResultById, saveResult, deleteResultById, deleteResultsByAppId } from './results.js';
import { getGoldenResults, getGoldenResultByQueryIndex, saveGoldenResult } from './golden.js';
import { getScores, getAppScore } from './scores.js';

export async function handleRequest(method, path, body) {
  // --- Query routes ---

  // GET /queries or GET /queries?category=...
  if (method === 'GET' && (path === '/queries' || path.startsWith('/queries?'))) {
    const url = new URL(path, 'http://localhost');
    const category = url.searchParams.get('category');
    return getQueries(category);
  }

  // GET /queries/:index (e.g., /queries/11)
  const queryMatch = path.match(/^\/queries\/(\d+)$/);
  if (method === 'GET' && queryMatch) {
    const query = getQueryByIndex(queryMatch[1]);
    if (!query) throw new Error('Query not found');
    return query;
  }

  // --- App routes ---

  // GET /api/apps
  if (method === 'GET' && path === '/apps') {
    return getApps();
  }

  // POST /api/apps
  if (method === 'POST' && path === '/apps') {
    return createApp(body);
  }

  // GET/PUT/DELETE /api/apps/:id
  const appIdMatch = path.match(/^\/apps\/([a-zA-Z0-9]+)$/);
  if (appIdMatch) {
    const id = appIdMatch[1];
    if (method === 'GET') {
      const app = getAppById(id);
      if (!app) throw new Error('App not found');
      return app;
    }
    if (method === 'PUT') {
      return updateApp(id, body);
    }
    if (method === 'DELETE') {
      const result = deleteAppById(id);
      deleteResultsByAppId(id);
      return result;
    }
  }

  // --- Result routes ---

  // GET /results?appId=X or GET /results?appId=X&queryIndex=Y or GET /results?queryIndex=Y
  if (method === 'GET' && (path === '/results' || path.startsWith('/results?'))) {
    const url = new URL(path, 'http://localhost');
    const appId = url.searchParams.get('appId');
    const queryIndex = url.searchParams.get('queryIndex');
    if (!appId && !queryIndex) throw new Error('appId or queryIndex query parameter is required');
    return getResults(appId, queryIndex);
  }

  // POST /results
  if (method === 'POST' && path === '/results') {
    return saveResult(body);
  }

  // GET/DELETE /results/:id
  const resultIdMatch = path.match(/^\/results\/([a-zA-Z0-9]+)$/);
  if (resultIdMatch) {
    const id = resultIdMatch[1];
    if (method === 'GET') {
      const result = getResultById(id);
      if (!result) throw new Error('Result not found');
      return result;
    }
    if (method === 'DELETE') {
      return deleteResultById(id);
    }
  }

  // --- Golden result routes ---

  // GET /golden
  if (method === 'GET' && path === '/golden') {
    return getGoldenResults();
  }

  // GET/PUT /golden/:queryIndex
  const goldenMatch = path.match(/^\/golden\/(\d+)$/);
  if (goldenMatch) {
    const queryIndex = goldenMatch[1];
    if (method === 'GET') {
      const result = getGoldenResultByQueryIndex(queryIndex);
      if (!result) throw new Error('Golden result not found');
      return result;
    }
    if (method === 'PUT') {
      return saveGoldenResult(queryIndex, body);
    }
  }

  // --- Scoring routes ---

  // GET /scores
  if (method === 'GET' && path === '/scores') {
    return getScores();
  }

  // GET /scores/:appId
  const scoreMatch = path.match(/^\/scores\/([a-zA-Z0-9]+)$/);
  if (method === 'GET' && scoreMatch) {
    const result = getAppScore(scoreMatch[1]);
    if (!result) throw new Error('App not found');
    return result;
  }

  // --- Fallback (preserve for future specs) ---
  console.warn(`[Mock API] No handler for ${method} ${path}`);
  return { message: 'Not implemented' };
}
