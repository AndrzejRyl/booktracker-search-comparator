export function normalizeStr(s) {
  return s.toLowerCase().trim().replace(/['']/g, "'");
}

export function computeQueryScore(resultBooks, goldenBooks) {
  if (!goldenBooks || goldenBooks.length === 0) {
    return { hits: 0, positionBonuses: 0, score: 0, maxScore: 0, goldenCount: 0 };
  }
  const goldenCount = goldenBooks.length;
  const maxScore = goldenCount * 1.5;
  let hits = 0;
  let positionBonuses = 0;

  if (!resultBooks || resultBooks.length === 0) {
    return { hits: 0, positionBonuses: 0, score: 0, maxScore, goldenCount };
  }

  for (const gBook of goldenBooks) {
    const match = resultBooks.find(
      (r) =>
        normalizeStr(r.title) === normalizeStr(gBook.title) &&
        normalizeStr(r.author) === normalizeStr(gBook.author)
    );
    if (match) {
      hits += 1;
      if (match.rank <= gBook.rank) {
        positionBonuses += 1;
      }
    }
  }

  return { hits, positionBonuses, score: hits + positionBonuses * 0.5, maxScore, goldenCount };
}

export function computeAppScore(appResults, goldenResults, queryMap) {
  const resultMap = new Map(appResults.map((r) => [r.queryIndex, r]));
  let totalScore = 0;
  const queryScores = [];
  const categoryScores = {};
  let queriesWithResults = 0;

  for (const r of appResults) {
    if (r.books && r.books.length > 0) queriesWithResults++;
  }

  for (const golden of goldenResults) {
    const result = resultMap.get(golden.queryIndex);
    const detail = computeQueryScore(result?.books || [], golden.books);
    totalScore += detail.score;
    queryScores.push({ queryIndex: golden.queryIndex, ...detail });

    const query = queryMap.get(golden.queryIndex);
    if (query) {
      if (!categoryScores[query.category]) {
        categoryScores[query.category] = { totalScore: 0, maxScore: 0, queriesScored: 0 };
      }
      categoryScores[query.category].totalScore += detail.score;
      categoryScores[query.category].maxScore += detail.maxScore;
      categoryScores[query.category].queriesScored += 1;
    }
  }

  for (const cat of Object.values(categoryScores)) {
    cat.percentage = cat.maxScore > 0 ? Math.round((cat.totalScore / cat.maxScore) * 1000) / 10 : 0;
  }

  return { totalScore, queryScores, categoryScores, queriesWithResults };
}
