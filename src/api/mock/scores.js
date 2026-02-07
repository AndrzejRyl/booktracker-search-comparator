import { getResults } from './results.js';
import { getGoldenResults } from './golden.js';
import { getApps } from './apps.js';
import { getQueries } from './queries.js';

function normalizeStr(s) {
  return s.toLowerCase().trim().replace(/['']/g, "'");
}

function computeQueryScore(resultBooks, goldenBooks) {
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

export function getScores() {
  const apps = getApps();
  const queries = getQueries();
  const goldenResults = getGoldenResults();
  const queryMap = new Map(queries.map((q) => [q.index, q]));

  let maxPossibleScore = 0;
  for (const g of goldenResults) {
    maxPossibleScore += g.books.length * 1.5;
  }

  const appScores = apps.map((app) => {
    const appResults = getResults(app._id);
    const resultMap = new Map(appResults.map((r) => [r.queryIndex, r]));

    let totalScore = 0;
    const queryScores = [];
    const categoryScores = {};
    const queriesWithResults = appResults.filter((r) => r.books && r.books.length > 0).length;

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

    return {
      appId: app._id,
      appName: app.name,
      appLogo: app.logo,
      totalScore,
      maxScore: maxPossibleScore,
      percentage: maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 1000) / 10 : 0,
      queriesScored: goldenResults.length,
      queriesWithResults,
      categoryScores,
      queryScores: queryScores.sort((a, b) => a.queryIndex - b.queryIndex),
    };
  });

  appScores.sort((a, b) => b.totalScore - a.totalScore);
  let currentRank = 1;
  for (let i = 0; i < appScores.length; i++) {
    if (i > 0 && appScores[i].totalScore < appScores[i - 1].totalScore) {
      currentRank = i + 1;
    }
    appScores[i].rank = currentRank;
  }

  return {
    maxPossibleScore,
    goldenCoverage: goldenResults.length,
    totalQueries: 50,
    apps: appScores,
  };
}

export function getAppScore(appId) {
  const allScores = getScores();
  const appScore = allScores.apps.find((a) => a.appId === appId);
  if (!appScore) return null;

  const queries = getQueries();
  const queryMap = new Map(queries.map((q) => [q.index, q]));

  const { rank: _rank, ...scoreWithoutRank } = appScore;

  scoreWithoutRank.queryScores = scoreWithoutRank.queryScores.map((qs) => {
    const query = queryMap.get(qs.queryIndex);
    return { ...qs, queryText: query?.text || '', category: query?.category || '' };
  });

  return scoreWithoutRank;
}
