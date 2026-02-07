import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchQueryByIndex } from '../api/queries.js';
import QueryCategoryBadge from '../components/QueryCategoryBadge.jsx';

export default function QueryDetailPage() {
  const { id } = useParams();
  const [query, setQuery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchQueryByIndex(id);
        if (!cancelled) setQuery(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  const renderSkeleton = () => (
    <>
      <div className="h-5 w-40 bg-zinc-800/50 rounded animate-pulse mb-6" />
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-3">
        <div className="h-6 w-16 bg-zinc-800/50 rounded animate-pulse" />
        <div className="h-8 w-64 bg-zinc-800/50 rounded animate-pulse" />
        <div className="h-5 w-96 bg-zinc-800/50 rounded animate-pulse" />
        <div className="h-6 w-32 bg-zinc-800/50 rounded animate-pulse" />
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

  const renderPlaceholderCard = (title, message, hint) => (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mt-6">
      <h2 className="text-lg font-semibold text-zinc-100 mb-4">{title}</h2>
      <p className="text-zinc-500 italic">{message}</p>
      <p className="text-zinc-600 text-sm mt-1">{hint}</p>
    </div>
  );

  const renderContent = () => {
    if (loading) return renderSkeleton();
    if (error) return renderError();
    return (
      <>
        <Link to="/queries" className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
          &larr; Back to Query Bank
        </Link>
        {renderQueryCard()}
        {renderPlaceholderCard('Golden Results', 'No golden results defined yet.', '(Managed in the Golden Results editor)')}
        {renderPlaceholderCard('App Results', 'No results recorded yet.', '(Results are entered per-app in the Apps section)')}
      </>
    );
  };

  return (
    <div>
      {renderContent()}
    </div>
  );
}
