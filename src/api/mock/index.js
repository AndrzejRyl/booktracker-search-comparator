import { getQueries, getQueryByIndex } from './queries.js';

export async function handleRequest(method, path, _body) {
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

  // --- Fallback (preserve for future specs) ---
  console.warn(`[Mock API] No handler for ${method} ${path}`);
  return { message: 'Not implemented' };
}
