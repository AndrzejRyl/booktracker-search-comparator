import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchScores } from '../api/scores.js';
import { fetchQueries } from '../api/queries.js';
import { getScoreColor, getScoreBgColor } from '../constants/scoreColors.js';
import { CATEGORY_LABELS } from '../constants/queryCategories.js';

export default function LeaderboardPage() {
  const [data, setData] = useState(null);
  const [queryMap, setQueryMap] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedApps, setExpandedApps] = useState(new Set());

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [scores, queries] = await Promise.all([fetchScores(), fetchQueries()]);
      setData(scores);
      setQueryMap(new Map(queries.map((q) => [q.index, q])));
    } catch (err) {
      setError(err.message || 'Failed to load scores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleExpanded = (appId) => {
    setExpandedApps((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) {
        next.delete(appId);
      } else {
        next.add(appId);
      }
      return next;
    });
  };

  const getRankColor = (rank) => {
    if (rank === 1) return 'text-amber-400';
    if (rank === 2) return 'text-zinc-300';
    if (rank === 3) return 'text-amber-700';
    return 'text-zinc-500';
  };

  const renderSkeleton = () => (
    <div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mb-6">
        <div className="p-4 space-y-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-zinc-800/50 rounded animate-pulse" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-zinc-800/50 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );

  const renderError = () => (
    <div className="flex justify-center py-12">
      <div className="bg-zinc-900 border border-red-800/50 rounded-xl p-6 max-w-md text-center">
        <p className="text-red-400 text-sm mb-4">{error}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );

  const renderEmptyNoApps = () => (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
      <p className="text-zinc-400 text-sm mb-2">No apps have been registered yet.</p>
      <Link to="/apps" className="text-indigo-400 hover:text-indigo-300 text-sm">
        Go to Apps →
      </Link>
    </div>
  );

  const renderEmptyNoGolden = () => (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
      <p className="text-zinc-400 text-sm mb-2">
        No golden results have been defined yet. Scoring requires golden results as the ground truth.
      </p>
      <Link to="/golden" className="text-indigo-400 hover:text-indigo-300 text-sm">
        Go to Golden Results →
      </Link>
    </div>
  );

  const renderExpandedRow = (app) => (
    <tr key={`${app.appId}-detail`}>
      <td colSpan={6} className="p-0">
        <div className="bg-zinc-950 border-t border-zinc-800 px-8 py-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-zinc-500 uppercase tracking-wider">
                <th className="text-left py-2 w-10">#</th>
                <th className="text-left py-2">Query</th>
                <th className="text-left py-2">Hits</th>
                <th className="text-left py-2">Pos</th>
                <th className="text-left py-2">Score</th>
                <th className="text-left py-2">Max</th>
              </tr>
            </thead>
            <tbody>
              {app.queryScores.map((qs) => {
                const pct = qs.maxScore > 0 ? (qs.score / qs.maxScore) * 100 : 0;
                const hitPct = qs.goldenCount > 0 ? (qs.hits / qs.goldenCount) * 100 : 0;
                return (
                  <tr key={qs.queryIndex} className="border-t border-zinc-800/50 hover:bg-zinc-900/50">
                    <td className="py-2 text-zinc-500 font-mono">{qs.queryIndex}</td>
                    <td className="py-2">
                      <Link
                        to={`/queries/${qs.queryIndex}`}
                        className="text-zinc-300 font-mono hover:text-indigo-400"
                      >
                        {queryMap.get(qs.queryIndex)?.text || `Query #${qs.queryIndex}`}
                      </Link>
                    </td>
                    <td className={`py-2 font-mono ${getScoreColor(hitPct)}`}>
                      {qs.hits}/{qs.goldenCount}
                    </td>
                    <td className="py-2 text-zinc-400 font-mono">
                      {qs.positionBonuses}/{qs.hits}
                    </td>
                    <td className={`py-2 font-mono ${getScoreColor(pct)}`}>
                      {qs.score.toFixed(1)}
                    </td>
                    <td className="py-2 text-zinc-600 font-mono">{qs.maxScore.toFixed(1)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </td>
    </tr>
  );

  const renderLeaderboardTable = () => (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mb-6">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-zinc-800/50 text-zinc-400 text-xs uppercase tracking-wider">
            <th className="px-4 py-3 text-center w-16">Rank</th>
            <th className="px-4 py-3 text-left">App</th>
            <th className="px-4 py-3 text-left">Score</th>
            <th className="px-4 py-3 text-left">Pct</th>
            <th className="px-4 py-3 text-left">Results</th>
            <th className="px-4 py-3 text-center w-16">Detail</th>
          </tr>
        </thead>
        <tbody>
          {data.apps.map((app) => {
            const isExpanded = expandedApps.has(app.appId);
            const coverageComplete = app.queriesWithResults >= app.queriesScored;
            return [
              <tr key={app.appId} className="border-t border-zinc-800 hover:bg-zinc-800/30 transition-colors">
                <td className={`px-4 py-4 text-lg font-bold text-center ${getRankColor(app.rank)}`}>
                  {app.rank}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={app.appLogo}
                      alt={app.appName}
                      className="w-8 h-8 rounded-lg object-cover"
                    />
                    <Link
                      to={`/apps/${app.appId}`}
                      className="text-sm font-medium text-zinc-100 hover:text-indigo-400"
                    >
                      {app.appName}
                    </Link>
                  </div>
                </td>
                <td className="px-4 py-4 font-mono text-sm">
                  <span className={getScoreColor(app.percentage)}>{app.totalScore.toFixed(1)}</span>
                  <span className="text-zinc-600 ml-1">/ {app.maxScore.toFixed(1)}</span>
                </td>
                <td className="px-4 py-4 relative">
                  <div
                    className={`absolute inset-y-1 left-1 rounded h-auto ${getScoreBgColor(app.percentage)}`}
                    style={{ width: `${Math.min(app.percentage, 100)}%` }}
                  />
                  <span className={`text-sm font-semibold relative z-10 ${getScoreColor(app.percentage)}`}>
                    {app.percentage.toFixed(1)}%
                  </span>
                </td>
                <td className="px-4 py-4 text-sm font-mono">
                  <span className={coverageComplete ? 'text-emerald-400' : 'text-zinc-400'}>
                    {app.queriesWithResults} / {app.queriesScored}
                  </span>
                </td>
                <td className="px-4 py-4 text-center">
                  <button
                    onClick={() => toggleExpanded(app.appId)}
                    className="text-zinc-400 hover:text-zinc-200 text-sm cursor-pointer"
                  >
                    {isExpanded ? '▼' : '▶'}
                  </button>
                </td>
              </tr>,
              isExpanded && renderExpandedRow(app),
            ];
          })}
        </tbody>
      </table>
    </div>
  );

  const renderCategoryComparison = () => {
    const allCategories = new Set();
    for (const app of data.apps) {
      for (const cat of Object.keys(app.categoryScores)) {
        allCategories.add(cat);
      }
    }

    if (allCategories.size === 0) return null;

    const categories = [...allCategories].sort();

    return (
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">Category Comparison</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const catData = data.apps
              .map((app) => ({
                appId: app.appId,
                appName: app.appName,
                appLogo: app.appLogo,
                percentage: app.categoryScores[cat]?.percentage ?? 0,
              }))
              .sort((a, b) => b.percentage - a.percentage);

            const queriesScored = data.apps.find((a) => a.categoryScores[cat])?.categoryScores[cat]?.queriesScored ?? 0;

            return (
              <div key={cat} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <div className="text-sm font-semibold text-zinc-100 mb-1">
                  {CATEGORY_LABELS[cat] || cat}
                </div>
                <div className="text-xs text-zinc-500 mb-3">
                  {queriesScored} {queriesScored === 1 ? 'query' : 'queries'} scored
                </div>
                <div>
                  {catData.map((app) => (
                    <div key={app.appId} className="flex items-center gap-2 py-1.5">
                      <img src={app.appLogo} alt={app.appName} className="w-4 h-4 rounded object-cover" />
                      <span className="text-xs text-zinc-400 flex-1">{app.appName}</span>
                      <span className={`text-xs font-mono ${getScoreColor(app.percentage)}`}>
                        {app.percentage.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderScoringInfo = () => (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-zinc-300 mb-3">How Scoring Works</h3>
      <div className="text-xs text-zinc-500 space-y-1.5">
        <p>Each golden book found in an app&apos;s results = <span className="text-zinc-300 font-medium">1 point</span></p>
        <p>Position bonus: <span className="text-zinc-300 font-medium">+0.5 points</span> if found at the same rank or higher</p>
        <p>Maximum per query = <span className="text-zinc-300 font-medium">golden count × 1.5</span></p>
        <p>Queries without golden results are excluded from scoring</p>
      </div>
    </div>
  );

  const renderContent = () => {
    if (loading) return renderSkeleton();
    if (error) return renderError();
    if (!data || data.apps.length === 0) return renderEmptyNoApps();
    if (data.goldenCoverage === 0) return renderEmptyNoGolden();

    return (
      <>
        {renderLeaderboardTable()}
        {renderCategoryComparison()}
        {renderScoringInfo()}
      </>
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-100 mb-1">Leaderboard</h1>
        <p className="text-sm text-zinc-400">App rankings based on golden result matching.</p>
        {data && data.goldenCoverage > 0 && (
          <p className="text-xs text-zinc-500 mt-1">
            Golden coverage: {data.goldenCoverage} / {data.totalQueries} queries scored
          </p>
        )}
      </div>
      {renderContent()}
    </div>
  );
}
