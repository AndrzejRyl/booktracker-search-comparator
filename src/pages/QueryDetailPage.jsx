import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchQueryByIndex } from '../api/queries.js';
import { fetchResultsByQuery } from '../api/results.js';
import { fetchApps } from '../api/apps.js';
import QueryCategoryBadge from '../components/QueryCategoryBadge.jsx';

export default function QueryDetailPage() {
  const { id } = useParams();
  const [query, setQuery] = useState(null);
  const [results, setResults] = useState([]);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [queryData, resultsData, appsData] = await Promise.all([
          fetchQueryByIndex(id),
          fetchResultsByQuery(id),
          fetchApps(),
        ]);
        if (!cancelled) {
          setQuery(queryData);
          setResults(resultsData);
          setApps(appsData);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  const getAppName = (appId) => {
    const app = apps.find((a) => a._id === appId);
    return app ? app.name : appId;
  };

  const getAppLogo = (appId) => {
    const app = apps.find((a) => a._id === appId);
    return app ? app.logo : null;
  };

  const renderSkeleton = () => (
    <>
      <div className="h-5 w-40 bg-zinc-800/50 rounded animate-pulse mb-6" />
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-3">
        <div className="h-6 w-16 bg-zinc-800/50 rounded animate-pulse" />
        <div className="h-8 w-64 bg-zinc-800/50 rounded animate-pulse" />
        <div className="h-5 w-96 bg-zinc-800/50 rounded animate-pulse" />
        <div className="h-6 w-32 bg-zinc-800/50 rounded animate-pulse" />
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mt-6 space-y-3">
        <div className="h-6 w-32 bg-zinc-800/50 rounded animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-zinc-800/50 rounded animate-pulse" />
        ))}
      </div>
    </>
  );

  const renderError = () => {
    const isNotFound = error === 'Query not found';
    return (
      <>
        <Link to="/queries" className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
          &larr; Back to Query Bank
        </Link>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center mt-6">
          <p className="text-red-400 mb-4">{isNotFound ? 'Query not found' : error}</p>
          <Link
            to="/queries"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors inline-block"
          >
            Back to Query Bank
          </Link>
        </div>
      </>
    );
  };

  const renderQueryCard = () => (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mt-6">
      <p className="text-zinc-500 text-sm mb-1">#{query.index}</p>
      <h1 className="text-2xl font-bold text-zinc-100 font-mono mb-2">{query.text}</h1>
      <p className="text-zinc-400 mb-3">{query.description}</p>
      <QueryCategoryBadge category={query.category} />
    </div>
  );

  const renderAppResult = (result) => {
    const logo = getAppLogo(result.appId);
    return (
      <div key={result._id} className="bg-zinc-800/30 border border-zinc-800 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          {logo && (
            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
              <img src={logo} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <Link
            to={`/apps/${result.appId}`}
            className="text-zinc-100 font-semibold text-sm hover:text-indigo-400 transition-colors"
          >
            {getAppName(result.appId)}
          </Link>
          <span className="text-zinc-600 text-xs">
            {result.books.length} book{result.books.length !== 1 ? 's' : ''}
            {result.screenshots.length > 0 && ` · ${result.screenshots.length} screenshot${result.screenshots.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {result.books.length > 0 && (
          <div className="space-y-1">
            {result.books.map((book, i) => (
              <div key={i} className="flex items-baseline gap-2 text-sm">
                <span className="text-zinc-500 font-mono w-5 text-right shrink-0">{book.rank}.</span>
                <span className="text-zinc-200">{book.title}</span>
                <span className="text-zinc-600">&mdash;</span>
                <span className="text-zinc-400">{book.author}</span>
              </div>
            ))}
          </div>
        )}

        {result.screenshots.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {result.screenshots.map((src, i) => (
              <div key={i} className="w-16 h-16 rounded-lg overflow-hidden border border-zinc-700">
                <img src={src} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderAppResults = () => {
    if (results.length === 0) {
      return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mt-6">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">App Results</h2>
          <p className="text-zinc-500 italic">No results recorded yet.</p>
          <p className="text-zinc-600 text-sm mt-1">(Results are entered per-app in the Apps section)</p>
        </div>
      );
    }

    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mt-6">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">
          App Results
          <span className="text-zinc-500 text-sm font-normal ml-2">
            {results.length} app{results.length !== 1 ? 's' : ''}
          </span>
        </h2>
        <div className="space-y-3">
          {results.map(renderAppResult)}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) return renderSkeleton();
    if (error) return renderError();
    return (
      <>
        <Link to="/queries" className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
          &larr; Back to Query Bank
        </Link>
        {renderQueryCard()}
        {renderAppResults()}
      </>
    );
  };

  return (
    <div>
      {renderContent()}
    </div>
  );
}
