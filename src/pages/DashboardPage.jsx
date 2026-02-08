import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchApps } from '../api/apps.js';
import { fetchResults } from '../api/results.js';
import { fetchGoldenResults } from '../api/golden.js';
import { fetchScores } from '../api/scores.js';
import { getScoreColor, getScoreBgColor } from '../constants/scoreColors.js';
import ErrorCard from '../components/ErrorCard.jsx';

export default function DashboardPage() {
  const [apps, setApps] = useState([]);
  const [results, setResults] = useState([]);
  const [goldenResults, setGoldenResults] = useState([]);
  const [scoreData, setScoreData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Wave 1: fetch base data + scores (scores wrapped in try/catch)
      const [appsData, goldenData, scoresData] = await Promise.all([
        fetchApps(),
        fetchGoldenResults(),
        fetchScores().catch(() => null),
      ]);

      setApps(appsData);
      setGoldenResults(goldenData);
      setScoreData(scoresData);

      // Wave 2: fetch results per app
      const allResults = await Promise.all(
        appsData.map((app) => fetchResults(app._id))
      );
      setResults(allResults.flat());
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- Derived data ---

  const totalApps = apps.length;
  const totalPossibleResults = totalApps * 50;
  const totalResults = results.length;
  const resultsPercentage = totalPossibleResults > 0
    ? Math.round((totalResults / totalPossibleResults) * 1000) / 10
    : 0;
  const goldenCount = goldenResults.length;
  const goldenPercentage = Math.round((goldenCount / 50) * 1000) / 10;

  const appCompletion = apps.map((app) => {
    const appResults = results.filter((r) => r.appId === app._id);
    const count = appResults.length;
    const percentage = Math.round((count / 50) * 1000) / 10;
    return { app, count, percentage };
  }).sort((a, b) => b.percentage - a.percentage);

  const appsWithNoResults = appCompletion.filter((a) => a.count === 0).length;

  // --- Completion bar color helpers ---

  const getCompletionBarColor = (pct) => {
    if (pct >= 80) return 'bg-emerald-500';
    if (pct >= 40) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const getCompletionTextColor = (pct) => {
    if (pct === 0) return 'text-zinc-600';
    if (pct >= 80) return 'text-emerald-400';
    if (pct >= 40) return 'text-amber-400';
    return 'text-rose-400';
  };

  // --- Rank display helper ---

  const getRankClass = (rank) => {
    if (rank === 1) return 'text-lg font-bold text-amber-400 w-8 text-center';
    if (rank === 2) return 'text-lg font-bold text-zinc-300 w-8 text-center';
    if (rank === 3) return 'text-lg font-bold text-amber-700 w-8 text-center';
    return 'text-lg font-bold text-zinc-500 w-8 text-center';
  };

  // --- Render helpers ---

  const renderSkeleton = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-zinc-800/50 rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="h-64 bg-zinc-800/50 rounded-xl animate-pulse mb-6" />
      <div className="h-48 bg-zinc-800/50 rounded-xl animate-pulse mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-zinc-800/50 rounded-xl animate-pulse" />
        ))}
      </div>
    </>
  );

  const renderError = () => (
    <ErrorCard message={error} onRetry={loadData} />
  );

  const renderStatsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Apps Tracked */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg mb-3 bg-indigo-900/50">
          📱
        </div>
        <div className="text-2xl font-bold text-zinc-100">{totalApps}</div>
        <div className="text-sm text-zinc-400 mt-1">apps tracked</div>
      </div>

      {/* Results Entered */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg mb-3 bg-emerald-900/50">
          📋
        </div>
        <div className="text-2xl font-bold text-zinc-100">
          {totalResults}
          <span className="text-lg text-zinc-500 font-normal"> / {totalPossibleResults}</span>
        </div>
        <div className="text-sm text-zinc-400 mt-1">results entered</div>
        <div className="text-xs text-zinc-500 mt-0.5">{resultsPercentage}% complete</div>
      </div>

      {/* Golden Results */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg mb-3 bg-amber-900/50">
          ⭐
        </div>
        <div className="text-2xl font-bold text-zinc-100">
          {goldenCount}
          <span className="text-lg text-zinc-500 font-normal"> / 50</span>
        </div>
        <div className="text-sm text-zinc-400 mt-1">golden results defined</div>
        <div className="text-xs text-zinc-500 mt-0.5">{goldenPercentage}% defined</div>
      </div>
    </div>
  );

  const renderLeaderboardSummary = () => {
    const hasScoreData = scoreData && scoreData.apps && scoreData.apps.length > 0;
    const hasGolden = scoreData && scoreData.goldenCoverage > 0;

    if (!hasScoreData) {
      let message = 'No scoring data available yet.';
      let linkText = null;
      let linkTo = null;

      if (!scoreData) {
        message = 'Unable to load scoring data.';
      } else if (!hasGolden) {
        linkText = 'Define golden results to enable scoring.';
        linkTo = '/golden';
      } else {
        linkText = 'Add apps and enter results to see rankings.';
        linkTo = '/apps';
      }

      return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">Leaderboard Summary</h2>
          <p className="text-sm text-zinc-400">{message}</p>
          {linkTo && (
            <Link to={linkTo} className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors mt-2 inline-block">
              {linkText}
            </Link>
          )}
        </div>
      );
    }

    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">Leaderboard Summary</h2>

        <div>
          {scoreData.apps.map((app) => (
            <div key={app.appId} className="flex items-center gap-3 py-2.5">
              <span className={getRankClass(app.rank)}>{app.rank}</span>
              {app.appLogo && (
                <img src={app.appLogo} alt="" className="w-6 h-6 rounded-lg object-cover" />
              )}
              <Link
                to={`/apps/${app.appId}`}
                className="text-sm text-zinc-200 flex-1 hover:text-indigo-400 transition-colors"
              >
                {app.appName}
              </Link>
              <span className={`text-sm font-mono font-semibold w-14 text-right ${getScoreColor(app.percentage)}`}>
                {app.percentage.toFixed(1)}%
              </span>
              <div className="h-2 flex-1 max-w-[200px] bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${getScoreBgColor(app.percentage)}`}
                  style={{ width: `${app.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-500 mt-4 pt-4 border-t border-zinc-800">
          <span>{scoreData.goldenCoverage} / {scoreData.totalQueries} queries scored</span>
          <Link to="/leaderboard" className="text-indigo-400 hover:text-indigo-300 transition-colors">
            View full leaderboard →
          </Link>
        </div>
      </div>
    );
  };

  const renderDataCompletion = () => {
    if (totalApps === 0) return null;

    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mb-6">
        <h2 className="text-lg font-semibold text-zinc-100 p-6 pb-0 mb-4">Data Completion by App</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-800/50 text-zinc-400 text-xs uppercase tracking-wider">
              <th className="px-6 py-3 text-left">App</th>
              <th className="px-6 py-3 text-left">Results</th>
              <th className="px-6 py-3 text-left">Progress</th>
              <th className="px-6 py-3 text-left">Percentage</th>
            </tr>
          </thead>
          <tbody>
            {appCompletion.map(({ app, count, percentage }) => (
              <tr key={app._id} className="border-t border-zinc-800 hover:bg-zinc-800/30 transition-colors">
                <td className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    {app.logo && (
                      <img src={app.logo} alt="" className="w-6 h-6 rounded-lg object-cover" />
                    )}
                    <Link
                      to={`/apps/${app._id}`}
                      className="text-sm text-zinc-200 hover:text-indigo-400 transition-colors"
                    >
                      {app.name}
                    </Link>
                  </div>
                </td>
                <td className="px-6 py-3 text-sm font-mono text-zinc-300">
                  {count} / 50
                </td>
                <td className="px-6 py-3">
                  <div className="h-2 w-full max-w-[200px] bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${getCompletionBarColor(percentage)}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </td>
                <td className={`px-6 py-3 text-sm font-mono ${getCompletionTextColor(percentage)}`}>
                  {percentage}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderQuickActions = () => {
    let goldenDescription;
    if (goldenCount === 0) {
      goldenDescription = 'Define the perfect result set for each query to enable scoring.';
    } else if (goldenCount < 50) {
      goldenDescription = `${goldenCount} / 50 queries have golden results. Define more to improve scoring coverage.`;
    } else {
      goldenDescription = 'All 50 queries have golden results defined.';
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/apps"
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors block"
        >
          <div className="text-sm font-semibold text-zinc-100 mb-1">Add App</div>
          <div className="text-xs text-zinc-400">Register a new book tracking app to compare.</div>
        </Link>

        <Link
          to="/apps"
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors block"
        >
          <div className="text-sm font-semibold text-zinc-100 mb-1">Enter Results</div>
          <div className="text-xs text-zinc-400">Start entering search results for your apps.</div>
          {appsWithNoResults > 0 && (
            <div className="text-xs text-zinc-500 mt-2">
              {appsWithNoResults} {appsWithNoResults === 1 ? 'app has' : 'apps have'} no results yet
            </div>
          )}
        </Link>

        <Link
          to="/golden"
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors block"
        >
          <div className="text-sm font-semibold text-zinc-100 mb-1">Define Golden Results</div>
          <div className="text-xs text-zinc-400">{goldenDescription}</div>
        </Link>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) return renderSkeleton();
    if (error) return renderError();
    return (
      <>
        {renderStatsCards()}
        {renderLeaderboardSummary()}
        {renderDataCompletion()}
        {renderQuickActions()}
      </>
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-100 mb-1">Dashboard</h1>
        <p className="text-sm text-zinc-400">Overview of your search comparison project.</p>
      </div>
      {renderContent()}
    </div>
  );
}
