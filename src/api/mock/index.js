// Stub — real mock handlers added by feature specs
export async function handleRequest(method, path, _body) {
  console.warn(`[Mock API] No handler for ${method} ${path}`);
  return { message: 'Not implemented' };
}
