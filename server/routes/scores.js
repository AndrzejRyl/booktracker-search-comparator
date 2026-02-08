import { Router } from 'express';
import App from '../models/App.js';
import Result from '../models/Result.js';
import GoldenResult from '../models/GoldenResult.js';
import Query from '../models/Query.js';
import { computeAppScore } from '../utils/scoring.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// GET /api/scores
router.get('/', asyncHandler(async (req, res) => {
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
    const { totalScore, queryScores, categoryScores, queriesWithResults } =
      computeAppScore(appResults, goldenResults, queryMap);

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
}));

// GET /api/scores/:appId
// Note: rank is NOT computed here — use GET /api/scores for ranks.
router.get('/:appId', asyncHandler(async (req, res) => {
  const app = await App.findById(req.params.appId);
  if (!app) {
    const err = new Error('App not found');
    err.status = 404;
    throw err;
  }

  const [queries, goldenResults, appResults] = await Promise.all([
    Query.find().sort({ index: 1 }),
    GoldenResult.find({ 'books.0': { $exists: true } }).sort({ queryIndex: 1 }),
    Result.find({ appId: req.params.appId }),
  ]);

  const queryMap = new Map(queries.map((q) => [q.index, q]));

  let maxPossibleScore = 0;
  for (const g of goldenResults) {
    maxPossibleScore += g.books.length * 1.5;
  }

  const { totalScore, queryScores, categoryScores, queriesWithResults } =
    computeAppScore(appResults, goldenResults, queryMap);

  // Enrich queryScores with queryText and category for per-app detail view
  const enrichedQueryScores = queryScores.map((qs) => {
    const query = queryMap.get(qs.queryIndex);
    return {
      ...qs,
      queryText: query?.text || '',
      category: query?.category || '',
    };
  });

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
    queryScores: enrichedQueryScores.sort((a, b) => a.queryIndex - b.queryIndex),
  });
}));

export default router;
