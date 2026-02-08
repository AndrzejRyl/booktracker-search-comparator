import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchQueries } from '../api/queries.js';
import { fetchGoldenResults, saveGoldenResult } from '../api/golden.js';
import QueryCategoryBadge from '../components/QueryCategoryBadge.jsx';
import BookListEditor from '../components/BookListEditor.jsx';
import ErrorCard from '../components/ErrorCard.jsx';

export default function GoldenPage() {
  const [searchParams] = useSearchParams();
  const initialQuery = Number(searchParams.get('query')) || null;

  // Page data
  const [queries, setQueries] = useState([]);
  const [goldenResults, setGoldenResults] = useState([]);

  // Page state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState(null);

  // Selection
  const [selectedQueryIndex, setSelectedQueryIndex] = useState(null);

  // Form state — books
  const [books, setBooks] = useState([]);

  // Clean state for dirty tracking
  const cleanStateRef = useRef([]);

  // Derived data
  const definedIndices = new Set(goldenResults.map((g) => g.queryIndex));
  const selectedQuery = queries.find((q) => q.index === selectedQueryIndex);

  const isDirty = JSON.stringify(books) !== JSON.stringify(cleanStateRef.current);

  // Load page data
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [queriesData, goldenData] = await Promise.all([
          fetchQueries(),
          fetchGoldenResults(),
        ]);
        if (!cancelled) {
          setQueries(queriesData);
          setGoldenResults(goldenData);

          if (initialQuery && initialQuery >= 1 && initialQuery <= 50) {
            setSelectedQueryIndex(initialQuery);
          }
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [initialQuery]);

  // Load form data when selected query changes
  useEffect(() => {
    if (loading || selectedQueryIndex === null) return;

    const golden = goldenResults.find((g) => g.queryIndex === selectedQueryIndex);
    const loadedBooks = golden?.books || [];
    cleanStateRef.current = loadedBooks;
    setBooks([...loadedBooks]);

    setSaveError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedQueryIndex, loading]);

  // Save flow
  const handleSave = async () => {
    for (const book of books) {
      if (!book.title.trim() || !book.author.trim()) {
        setSaveError('Every book must have a non-empty title and author.');
        return;
      }
    }

    setSaving(true);
    setSaveError(null);

    try {
      const saved = await saveGoldenResult(selectedQueryIndex, books);

      setGoldenResults((prev) => {
        const idx = prev.findIndex((g) => g.queryIndex === selectedQueryIndex);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = saved;
          return updated;
        }
        return [...prev, saved];
      });

      const savedBooks = saved.books || [];
      cleanStateRef.current = savedBooks;
      setBooks(savedBooks);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Cancel — discard unsaved edits
  const handleCancel = () => {
    setBooks([...cleanStateRef.current]);
    setSaveError(null);
  };

  // Query selection with unsaved-changes guard
  const handleSelectQuery = (index) => {
    if (index === selectedQueryIndex) return;
    if (isDirty && !window.confirm('You have unsaved changes. Discard and switch queries?')) {
      return;
    }
    setSelectedQueryIndex(index);
  };

  // Render helpers
  const renderSkeleton = () => (
    <div className="flex flex-1 gap-6 overflow-hidden min-h-0">
      <div className="w-72 shrink-0 card p-4">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="h-8 bg-zinc-800/50 rounded animate-pulse mb-1" />
        ))}
      </div>
      <div className="flex-1">
        <div className="card p-6">
          <div className="h-8 w-64 bg-zinc-800/50 rounded animate-pulse mb-4" />
          <div className="h-40 bg-zinc-800/50 rounded animate-pulse mb-4" />
          <div className="h-60 bg-zinc-800/50 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );

  const renderError = () => (
    <div className="mt-6">
      <ErrorCard message={error} onRetry={() => window.location.reload()} />
    </div>
  );

  const renderQueryNavigator = () => (
    <div className="w-72 shrink-0 card flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800">
        <p className="text-sm font-semibold text-zinc-300">Queries</p>
      </div>
      <div className="overflow-y-auto flex-1">
        {queries.map((q) => (
          <button
            key={q.index}
            onClick={() => handleSelectQuery(q.index)}
            className={`w-full flex items-center px-4 py-2 text-sm cursor-pointer hover:bg-zinc-800/50 transition-colors border-l-2 ${
              q.index === selectedQueryIndex
                ? 'bg-zinc-800 border-indigo-400'
                : 'border-transparent'
            }`}
          >
            <span className={`mr-2 shrink-0 text-xs ${definedIndices.has(q.index) ? 'text-emerald-400' : 'text-zinc-600'}`}>
              ●
            </span>
            <span className="text-zinc-500 w-6 text-right mr-2 text-xs shrink-0">{q.index}</span>
            <span className="text-zinc-300 truncate font-mono text-xs">{q.text}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderEditingForm = () => {
    if (selectedQueryIndex === null || !selectedQuery) {
      return (
        <div className="flex-1 card p-6 flex items-center justify-center">
          <p className="text-zinc-500 text-sm">Click a query to edit its golden results</p>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto">
        <div className="card p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-zinc-100 font-mono">
              #{selectedQuery.index} &mdash; {selectedQuery.text}
            </h2>
            <p className="text-sm text-zinc-400 mt-1">{selectedQuery.description}</p>
            <div className="mt-2">
              <QueryCategoryBadge category={selectedQuery.category} />
            </div>
          </div>

          <BookListEditor books={books} onChange={setBooks} />

          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              onClick={handleCancel}
              className="text-zinc-400 hover:text-zinc-100 px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!isDirty || saving}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Golden Set'}
            </button>
          </div>

          {saveError && (
            <p className="text-sm text-rose-400 mt-2">{saveError}</p>
          )}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) return renderSkeleton();
    if (error) return renderError();
    return (
      <div className="flex flex-1 gap-6 overflow-hidden min-h-0">
        {renderQueryNavigator()}
        {renderEditingForm()}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Golden Results</h1>
        <p className="text-zinc-400 text-sm">
          Define the perfect expected result set for each query.
        </p>
        {!loading && !error && (
          <p className="text-zinc-500 text-sm mt-1">
            Progress: {definedIndices.size} / 50 defined
          </p>
        )}
      </div>
      {renderContent()}
    </div>
  );
}
