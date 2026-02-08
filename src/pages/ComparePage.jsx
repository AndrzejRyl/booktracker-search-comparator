import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchApps } from '../api/apps.js';
import { fetchQueries } from '../api/queries.js';
import { fetchResults } from '../api/results.js';
import { fetchGoldenResults } from '../api/golden.js';
import { COMPARE_VIEWS, COMPARE_VIEW_LABELS } from '../constants/compareViews.js';
import SideBySideView from '../components/SideBySideView.jsx';
import BreakdownView from '../components/BreakdownView.jsx';
import ErrorCard from '../components/ErrorCard.jsx';

export default function ComparePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = searchParams.get('view') || COMPARE_VIEWS.SIDE_BY_SIDE;
  const initialQueryIndex = Number(searchParams.get('query')) || null;

  const [apps, setApps] = useState([]);
  const [queries, setQueries] = useState([]);
  const [results, setResults] = useState([]);
  const [goldenResults, setGoldenResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [appsData, queriesData, goldenData] = await Promise.all([
        fetchApps(),
        fetchQueries(),
        fetchGoldenResults(),
      ]);
      setApps(appsData);
      setQueries(queriesData);
      setGoldenResults(goldenData);

      const allResults = await Promise.all(
        appsData.map((app) => fetchResults(app._id))
      );
      setResults(allResults.flat());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTabChange = (view) => {
    const params = new URLSearchParams(searchParams);
    params.set('view', view);
    if (view !== COMPARE_VIEWS.SIDE_BY_SIDE) {
      params.delete('query');
    }
    setSearchParams(params);
  };

  const renderSkeleton = () => (
    <div>
      <div className="flex border-b border-zinc-800 mb-6">
        {[1, 2].map((i) => (
          <div key={i} className="h-8 w-28 bg-zinc-800/50 rounded animate-pulse mr-4" />
        ))}
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 bg-zinc-800/50 rounded animate-pulse" />
        ))}
      </div>
    </div>
  );

  const renderError = () => (
    <div className="mt-6">
      <ErrorCard message={error} onRetry={loadData} />
    </div>
  );

  const renderTabBar = () => (
    <div className="flex border-b border-zinc-800 mb-6">
      {Object.entries(COMPARE_VIEW_LABELS).map(([key, label]) => (
        <button
          key={key}
          onClick={() => handleTabChange(key)}
          className={`px-4 py-2.5 text-sm cursor-pointer border-b-2 transition-colors ${
            activeView === key
              ? 'text-zinc-100 border-indigo-400'
              : 'text-zinc-400 hover:text-zinc-200 border-transparent'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  const renderActiveView = () => {
    const commonProps = { apps, queries, results, goldenResults };

    if (apps.length === 0) {
      return (
        <p className="text-zinc-500 text-sm italic text-center py-12">
          No apps have been registered yet.{' '}
          <Link to="/apps" className="text-indigo-400 hover:text-indigo-300">Add your first app</Link> to start comparing.
        </p>
      );
    }

    if (results.length === 0) {
      return (
        <p className="text-zinc-500 text-sm italic text-center py-12">
          No results have been recorded yet.{' '}
          <Link to="/apps" className="text-indigo-400 hover:text-indigo-300">Start entering results</Link> for your apps to see comparisons.
        </p>
      );
    }

    switch (activeView) {
      case COMPARE_VIEWS.BREAKDOWN:
        return <BreakdownView {...commonProps} setSearchParams={setSearchParams} />;
      case COMPARE_VIEWS.SIDE_BY_SIDE:
      default:
        return <SideBySideView {...commonProps} initialQueryIndex={initialQueryIndex} />;
    }
  };

  const renderContent = () => {
    if (loading) return renderSkeleton();
    if (error) return renderError();
    return (
      <>
        {renderTabBar()}
        {renderActiveView()}
      </>
    );
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Compare</h1>
      <p className="text-zinc-400 text-sm mb-6">Compare search results across apps.</p>
      {renderContent()}
    </div>
  );
}
