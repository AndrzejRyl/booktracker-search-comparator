export function validateQueryIndex(queryIndex, maxIndex = 50) {
  const n = Number(queryIndex);
  if (isNaN(n) || n < 1 || n > maxIndex) return null;
  return n;
}
