import { Router } from 'express';
import App from '../models/App.js';
import Result from '../models/Result.js';
import GoldenResult from '../models/GoldenResult.js';
import Query from '../models/Query.js';

const router = Router();

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

// GET /api/scores
router.get('/', async (req, res) => {
  try {
    const [apps, queries, goldenResults, allResults] = await Promise.all([
      App.find().sort({ name: 1 }),
      Query.find().sort({ index: 1 }),
      GoldenResult.find({ 'books.0': { $exists: true } }).sort({ queryIndex: 1 }),
      Result.find(),
    ]);

    const queryMap = new Map(queries.map((q) => [q.index, q]));

    // Compute max possible score
    let maxPossibleScore = 0;
    for (const g of goldenResults) {
      maxPossibleScore += g.books.length * 1.5;
    }

    // Build per-app scores
    const appScores = apps.map((app) => {
      const appResults = allResults.filter((r) => r.appId.toString() === app._id.toString());
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

        queryScores.push({
          queryIndex: golden.queryIndex,
          ...detail,
        });

        // Category aggregation
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

      // Compute category percentages
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

    // Sort by totalScore desc, assign ranks (shared ranks for ties)
    appScores.sort((a, b) => b.totalScore - a.totalScore);
    let currentRank = 1;
    for (let i = 0; i < appScores.length; i++) {
      if (i > 0 && appScores[i].totalScore < appScores[i - 1].totalScore) {
        currentRank = i + 1;
      }
      appScores[i].rank = currentRank;
    }

    res.json({
      maxPossibleScore,
      goldenCoverage: goldenResults.length,
      totalQueries: 50,
      apps: appScores,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/scores/:appId
// Note: rank is NOT computed here — use GET /api/scores for ranks.
router.get('/:appId', async (req, res) => {
  try {
    const app = await App.findById(req.params.appId);
    if (!app) {
      return res.status(404).json({ message: 'App not found' });
    }

    const [queries, goldenResults, appResults] = await Promise.all([
      Query.find().sort({ index: 1 }),
      GoldenResult.find({ 'books.0': { $exists: true } }).sort({ queryIndex: 1 }),
      Result.find({ appId: req.params.appId }),
    ]);

    const queryMap = new Map(queries.map((q) => [q.index, q]));
    const resultMap = new Map(appResults.map((r) => [r.queryIndex, r]));

    let maxPossibleScore = 0;
    for (const g of goldenResults) {
      maxPossibleScore += g.books.length * 1.5;
    }

    let totalScore = 0;
    const queryScores = [];
    const categoryScores = {};
    let queriesWithResults = 0;

    for (const r of appResults) {
      if (r.books && r.books.length > 0) queriesWithResults++;
    }

    for (const golden of goldenResults) {
      const result = resultMap.get(golden.queryIndex);
      const query = queryMap.get(golden.queryIndex);
      const detail = computeQueryScore(result?.books || [], golden.books);
      totalScore += detail.score;

      queryScores.push({
        queryIndex: golden.queryIndex,
        queryText: query?.text || '',
        category: query?.category || '',
        ...detail,
      });

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

    res.json({
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
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
