export function normalizeStr(s) {
  return s.toLowerCase().trim().replace(/['']/g, "'").replace(/\.\s+/g, '.').replace(/\s+/g, ' ');
}

export function isGoldenMatch(book, goldenBooks) {
  return goldenBooks.some(
    (g) =>
      normalizeStr(g.title) === normalizeStr(book.title) &&
      normalizeStr(g.author) === normalizeStr(book.author)
  );
}

export function countGoldenMatches(resultBooks, goldenBooks) {
  const matched = new Set();
  let count = 0;
  for (const book of resultBooks) {
    const idx = goldenBooks.findIndex(
      (g, i) =>
        !matched.has(i) &&
        normalizeStr(g.title) === normalizeStr(book.title) &&
        normalizeStr(g.author) === normalizeStr(book.author)
    );
    if (idx !== -1) {
      matched.add(idx);
      count++;
    }
  }
  return count;
}
