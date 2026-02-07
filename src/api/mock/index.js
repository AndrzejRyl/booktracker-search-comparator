import { getQueries, getQueryByIndex } from './queries.js';
import { getApps, getAppById, createApp, updateApp, deleteAppById } from './apps.js';
import { getResults, getResultById, saveResult, deleteResultById, deleteResultsByAppId } from './results.js';
import { getGoldenResults, getGoldenResultByQueryIndex, saveGoldenResult } from './golden.js';

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

  // GET /api/apps/:id
  const appGetMatch = path.match(/^\/apps\/([a-zA-Z0-9]+)$/);
  if (method === 'GET' && appGetMatch) {
    const app = getAppById(appGetMatch[1]);
    if (!app) throw new Error('App not found');
    return app;
  }

  // PUT /api/apps/:id
  const appPutMatch = path.match(/^\/apps\/([a-zA-Z0-9]+)$/);
  if (method === 'PUT' && appPutMatch) {
    return updateApp(appPutMatch[1], body);
  }

  // DELETE /api/apps/:id
  const appDeleteMatch = path.match(/^\/apps\/([a-zA-Z0-9]+)$/);
  if (method === 'DELETE' && appDeleteMatch) {
    const result = deleteAppById(appDeleteMatch[1]);
    deleteResultsByAppId(appDeleteMatch[1]);
    return result;
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

  // GET /results/:id
  const resultGetMatch = path.match(/^\/results\/([a-zA-Z0-9]+)$/);
  if (method === 'GET' && resultGetMatch) {
    const result = getResultById(resultGetMatch[1]);
    if (!result) throw new Error('Result not found');
    return result;
  }

  // POST /results
  if (method === 'POST' && path === '/results') {
    return saveResult(body);
  }

  // DELETE /results/:id
  const resultDeleteMatch = path.match(/^\/results\/([a-zA-Z0-9]+)$/);
  if (method === 'DELETE' && resultDeleteMatch) {
    return deleteResultById(resultDeleteMatch[1]);
  }

  // --- Golden result routes ---

  // GET /golden
  if (method === 'GET' && path === '/golden') {
    return getGoldenResults();
  }

  // GET /golden/:queryIndex
  const goldenGetMatch = path.match(/^\/golden\/(\d+)$/);
  if (method === 'GET' && goldenGetMatch) {
    const result = getGoldenResultByQueryIndex(goldenGetMatch[1]);
    if (!result) throw new Error('Golden result not found');
    return result;
  }

  // PUT /golden/:queryIndex
  const goldenPutMatch = path.match(/^\/golden\/(\d+)$/);
  if (method === 'PUT' && goldenPutMatch) {
    return saveGoldenResult(goldenPutMatch[1], body);
  }

  // --- Fallback (preserve for future specs) ---
  console.warn(`[Mock API] No handler for ${method} ${path}`);
  return { message: 'Not implemented' };
}
