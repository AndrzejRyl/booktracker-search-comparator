import { getQueries, getQueryByIndex } from './queries.js';
import { getApps, getAppById, createApp, updateApp, deleteAppById } from './apps.js';

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
    return deleteAppById(appDeleteMatch[1]);
  }

  // --- Fallback (preserve for future specs) ---
  console.warn(`[Mock API] No handler for ${method} ${path}`);
  return { message: 'Not implemented' };
}
