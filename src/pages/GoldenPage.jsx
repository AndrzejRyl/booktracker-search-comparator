import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchQueries } from '../api/queries.js';
import { fetchGoldenResults, saveGoldenResult } from '../api/golden.js';
import QueryCategoryBadge from '../components/QueryCategoryBadge.jsx';

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
  const [bookInputMode, setBookInputMode] = useState('manual');
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState(null);
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookAuthor, setNewBookAuthor] = useState('');

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

    setBookInputMode('manual');
    setJsonInput('');
    setJsonError(null);
    setNewBookTitle('');
    setNewBookAuthor('');
    setSaveError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedQueryIndex, loading]);

  // Handlers — books (manual mode)
  const handleAddBook = () => {
    if (!newBookTitle.trim() || !newBookAuthor.trim()) return;
    if (books.length >= 9) return;

    setBooks((prev) => [
      ...prev,
      { rank: prev.length + 1, title: newBookTitle.trim(), author: newBookAuthor.trim() },
    ]);
    setNewBookTitle('');
    setNewBookAuthor('');
  };

  const handleAddBookKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddBook();
    }
  };

  const handleRemoveBook = (index) => {
    setBooks((prev) =>
      prev.filter((_, i) => i !== index).map((b, i) => ({ ...b, rank: i + 1 }))
    );
  };

  // Handlers — books (JSON mode)
  const handleSwitchToJson = () => {
    setBookInputMode('json');
    setJsonError(null);
    if (books.length > 0) {
      setJsonInput(JSON.stringify(
        books.map(({ title, author }) => ({ title, author })),
        null,
        2,
      ));
    } else {
      setJsonInput('');
    }
  };

  const handleApplyJson = () => {
    setJsonError(null);
    let parsed;
    try {
      parsed = JSON.parse(jsonInput);
    } catch {
      setJsonError('Invalid JSON format');
      return;
    }

    if (!Array.isArray(parsed)) {
      setJsonError('Input must be a JSON array');
      return;
    }

    if (parsed.length > 9) {
      setJsonError('Maximum 9 books allowed');
      return;
    }

    for (let i = 0; i < parsed.length; i++) {
      const item = parsed[i];
      if (!item.title || typeof item.title !== 'string' || !item.title.trim()) {
        setJsonError(`Book at index ${i} is missing a valid "title"`);
        return;
      }
      if (!item.author || typeof item.author !== 'string' || !item.author.trim()) {
        setJsonError(`Book at index ${i} is missing a valid "author"`);
        return;
      }
    }

    const ranked = parsed.map((item, i) => ({
      rank: i + 1,
      title: item.title.trim(),
      author: item.author.trim(),
    }));

    setBooks(ranked);
    setBookInputMode('manual');
    setJsonInput('');
    setJsonError(null);
  };

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
    const loadedBooks = [...cleanStateRef.current];
    setBooks(loadedBooks);
    setBookInputMode('manual');
    setJsonInput('');
    setJsonError(null);
    setNewBookTitle('');
    setNewBookAuthor('');
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
      <div className="w-72 shrink-0 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="h-8 bg-zinc-800/50 rounded animate-pulse mb-1" />
        ))}
      </div>
      <div className="flex-1">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="h-8 w-64 bg-zinc-800/50 rounded animate-pulse mb-4" />
          <div className="h-40 bg-zinc-800/50 rounded animate-pulse mb-4" />
          <div className="h-60 bg-zinc-800/50 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );

  const renderError = () => (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center mt-6">
      <p className="text-red-400 mb-4">{error}</p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
      >
        Retry
      </button>
    </div>
  );

  const renderQueryNavigator = () => (
    <div className="w-72 shrink-0 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col overflow-hidden">
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

  const renderBooksManual = () => (
    <>
      <div className="space-y-2">
        {books.map((book, i) => (
          <div key={i} className="flex items-center bg-zinc-800/50 rounded-lg px-4 py-2.5 gap-3">
            <span className="text-zinc-500 text-sm font-mono w-6">{book.rank}.</span>
            <span className="text-zinc-100 text-sm font-medium">{book.title}</span>
            <span className="text-zinc-600">&mdash;</span>
            <span className="text-zinc-400 text-sm flex-1">{book.author}</span>
            <button
              onClick={() => handleRemoveBook(i)}
              className="text-zinc-500 hover:text-rose-400 text-sm transition-colors"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
      {books.length < 9 && (
        <div className="flex gap-3 mt-3">
          <input
            type="text"
            placeholder="Title"
            value={newBookTitle}
            onChange={(e) => setNewBookTitle(e.target.value)}
            onKeyDown={handleAddBookKeyDown}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          <input
            type="text"
            placeholder="Author"
            value={newBookAuthor}
            onChange={(e) => setNewBookAuthor(e.target.value)}
            onKeyDown={handleAddBookKeyDown}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          <button
            onClick={handleAddBook}
            disabled={!newBookTitle.trim() || !newBookAuthor.trim()}
            className="bg-zinc-700 hover:bg-zinc-600 text-zinc-300 px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>
      )}
    </>
  );

  const renderBooksJson = () => (
    <>
      <textarea
        value={jsonInput}
        onChange={(e) => setJsonInput(e.target.value)}
        placeholder='[{"title": "Book Title", "author": "Author Name"}, ...]'
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-100 font-mono placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-y min-h-[120px]"
      />
      {jsonError && <p className="text-sm text-rose-400 mt-2">{jsonError}</p>}
      <button
        onClick={handleApplyJson}
        className="bg-zinc-700 hover:bg-zinc-600 text-zinc-300 px-3 py-2 rounded-lg text-sm transition-colors mt-3"
      >
        Apply JSON
      </button>
    </>
  );

  const renderBooks = () => (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-zinc-300">
          Books ({books.length} of 9)
        </p>
        <div className="flex bg-zinc-800 rounded-lg p-0.5 gap-0.5">
          <button
            onClick={() => setBookInputMode('manual')}
            className={`px-3 py-1 text-xs rounded-md cursor-pointer transition-colors ${
              bookInputMode === 'manual'
                ? 'text-zinc-100 bg-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Manual
          </button>
          <button
            onClick={handleSwitchToJson}
            className={`px-3 py-1 text-xs rounded-md cursor-pointer transition-colors ${
              bookInputMode === 'json'
                ? 'text-zinc-100 bg-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            JSON
          </button>
        </div>
      </div>
      {bookInputMode === 'manual' ? renderBooksManual() : renderBooksJson()}
    </div>
  );

  const renderEditingForm = () => {
    if (selectedQueryIndex === null || !selectedQuery) {
      return (
        <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex items-center justify-center">
          <p className="text-zinc-500 text-sm">Click a query to edit its golden results</p>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-zinc-100 font-mono">
              #{selectedQuery.index} &mdash; {selectedQuery.text}
            </h2>
            <p className="text-sm text-zinc-400 mt-1">{selectedQuery.description}</p>
            <div className="mt-2">
              <QueryCategoryBadge category={selectedQuery.category} />
            </div>
          </div>

          {renderBooks()}

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
