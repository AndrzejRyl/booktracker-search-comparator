export function normalizeStr(s) {
  return s.toLowerCase().trim().replace(/['']/g, "'");
}

export function isGoldenMatch(book, goldenBooks) {
  return goldenBooks.some(
    (g) =>
      normalizeStr(g.title) === normalizeStr(book.title) &&
      normalizeStr(g.author) === normalizeStr(book.author)
  );
}

export function countGoldenMatches(resultBooks, goldenBooks) {
  return resultBooks.filter((book) => isGoldenMatch(book, goldenBooks)).length;
}
