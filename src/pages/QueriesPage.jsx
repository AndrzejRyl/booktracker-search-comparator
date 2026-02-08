import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { fetchQueries } from '../api/queries.js';
import QueryCategoryBadge from '../components/QueryCategoryBadge.jsx';
import ErrorCard from '../components/ErrorCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { CATEGORY_LABELS } from '../constants/queryCategories.js';

export default function QueriesPage() {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const debounceRef = useRef(null);
  const loadQueries = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchQueries();
      setQueries(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueries();
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchText]);

  const filtered = queries.filter((q) => {
    const matchesCategory = !selectedCategory || q.category === selectedCategory;
    const search = debouncedSearch.toLowerCase();
    const matchesSearch = !search
      || q.text.toLowerCase().includes(search)
      || q.description.toLowerCase().includes(search);
    return matchesCategory && matchesSearch;
  });

  const clearFilters = () => {
    setSearchText('');
    setDebouncedSearch('');
    setSelectedCategory('');
  };

  const renderSkeleton = () => (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-10 bg-zinc-800/50 rounded animate-pulse" />
      ))}
    </div>
  );

  const renderError = () => (
    <ErrorCard message={error} onRetry={loadQueries} />
  );

  const renderFilters = () => (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <div className="relative flex-1">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search queries..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 pl-10 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <select
        value={selectedCategory}
        onChange={(e) => setSelectedCategory(e.target.value)}
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
      >
        <option value="">All Categories</option>
        {Object.entries(CATEGORY_LABELS).map(([code, label]) => (
          <option key={code} value={code}>{label}</option>
        ))}
      </select>
    </div>
  );

  const renderEmpty = () => (
    <EmptyState
      message="No queries match your filters. Try adjusting your search or category filter."
      action={{ label: 'Clear filters', onClick: clearFilters, variant: 'secondary' }}
    />
  );

  const renderTable = () => (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-zinc-800/50 text-zinc-400 text-xs uppercase tracking-wider">
            <th className="px-4 py-3 text-left w-12">#</th>
            <th className="px-4 py-3 text-left">Query Text</th>
            <th className="px-4 py-3 text-left">Category</th>
            <th className="px-4 py-3 text-left hidden lg:table-cell">Description</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((q) => (
            <tr
              key={q.index}
              className="border-t border-zinc-800 hover:bg-zinc-800/30 transition-colors relative"
            >
              <td className="px-4 py-3 text-sm text-zinc-400">{q.index}</td>
              <td className="px-4 py-3 text-sm text-zinc-100 font-mono">
                <Link
                  to={`/queries/${q.index}`}
                  className="after:absolute after:inset-0"
                >
                  {q.text}
                </Link>
              </td>
              <td className="px-4 py-3">
                <QueryCategoryBadge category={q.category} />
              </td>
              <td className="px-4 py-3 text-sm text-zinc-400 hidden lg:table-cell">{q.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderContent = () => {
    if (loading) return renderSkeleton();
    if (error) return renderError();
    return (
      <>
        {renderFilters()}
        {filtered.length === 0 ? renderEmpty() : renderTable()}
        <p className="text-zinc-500 text-sm mt-4">
          Showing {filtered.length} of {queries.length} queries
        </p>
      </>
    );
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Query Bank</h1>
      <p className="text-zinc-400 mb-6">Browse and filter the bank of 50 search queries.</p>
      {renderContent()}
    </div>
  );
}
