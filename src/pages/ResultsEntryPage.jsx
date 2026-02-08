import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { fetchApp } from '../api/apps.js';
import { fetchQueries } from '../api/queries.js';
import { fetchResults, saveResult, deleteResult } from '../api/results.js';
import QueryCategoryBadge from '../components/QueryCategoryBadge.jsx';
import BookListEditor from '../components/BookListEditor.jsx';

export default function ResultsEntryPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const initialQuery = Number(searchParams.get('query')) || null;

  // Page data
  const [app, setApp] = useState(null);
  const [queries, setQueries] = useState([]);
  const [results, setResults] = useState([]);

  // Page state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState(null);

  // Selection
  const [selectedQueryIndex, setSelectedQueryIndex] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  // Form state — screenshots
  const [screenshotFiles, setScreenshotFiles] = useState([]);
  const [screenshotPreviews, setScreenshotPreviews] = useState([]);
  const [existingScreenshots, setExistingScreenshots] = useState([]);
  const fileInputRef = useRef(null);
  const previewsRef = useRef([]);
  const cleanStateRef = useRef({ books: [], screenshots: [] });

  // Form state — books
  const [books, setBooks] = useState([]);

  // Derived data
  const completedIndices = new Set(results.map((r) => r.queryIndex));

  const filteredQueries = queries.filter((q) => {
    if (statusFilter === 'complete') return completedIndices.has(q.index);
    if (statusFilter === 'not-started') return !completedIndices.has(q.index);
    return true;
  });

  const selectedQuery = queries.find((q) => q.index === selectedQueryIndex);
  const currentResult = results.find((r) => r.queryIndex === selectedQueryIndex);
  const totalScreenshots = existingScreenshots.length + screenshotFiles.length;
  const hasData = books.length > 0 || existingScreenshots.length > 0 || screenshotFiles.length > 0;
  const canSave = hasData || currentResult;

  // Dirty check — compare current form against what was loaded
  const isDirty = (() => {
    if (screenshotFiles.length > 0) return true;
    const clean = cleanStateRef.current;
    if (existingScreenshots.length !== clean.screenshots.length) return true;
    if (existingScreenshots.some((s, i) => s !== clean.screenshots[i])) return true;
    if (books.length !== clean.books.length) return true;
    return books.some((b, i) => {
      const c = clean.books[i];
      return !c || b.title !== c.title || b.author !== c.author;
    });
  })();

  // Load page data
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [appData, queriesData, resultsData] = await Promise.all([
          fetchApp(id),
          fetchQueries(),
          fetchResults(id),
        ]);
        if (!cancelled) {
          setApp(appData);
          setQueries(queriesData);
          setResults(resultsData);

          // Select query from URL param, or first incomplete, or query #1
          if (initialQuery && queriesData.some((q) => q.index === initialQuery)) {
            setSelectedQueryIndex(initialQuery);
          } else {
            const completedSet = new Set(resultsData.map((r) => r.queryIndex));
            const firstIncomplete = queriesData.find((q) => !completedSet.has(q.index));
            setSelectedQueryIndex(firstIncomplete ? firstIncomplete.index : 1);
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
  }, [id, initialQuery]);

  // Load form data when selected query changes
  useEffect(() => {
    if (loading) return;

    // Clean up old previews via ref
    previewsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewsRef.current = [];

    const result = results.find((r) => r.queryIndex === selectedQueryIndex);
    const loadedScreenshots = result?.screenshots || [];
    const loadedBooks = result?.books || [];
    cleanStateRef.current = { books: loadedBooks, screenshots: loadedScreenshots };
    setExistingScreenshots([...loadedScreenshots]);
    setBooks([...loadedBooks]);

    setScreenshotFiles([]);
    setScreenshotPreviews([]);
    setSaveError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedQueryIndex, loading]);

  // Warn on browser navigation (back, close tab) when dirty
  const isDirtyRef = useRef(false);
  isDirtyRef.current = isDirty;

  useEffect(() => {
    const handler = (e) => {
      if (isDirtyRef.current) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => {
      window.removeEventListener('beforeunload', handler);
      previewsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // Handlers — screenshots
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const remaining = 5 - totalScreenshots;
    const toAdd = files.slice(0, remaining);

    const previews = toAdd.map((f) => URL.createObjectURL(f));
    setScreenshotFiles((prev) => [...prev, ...toAdd]);
    setScreenshotPreviews((prev) => {
      const next = [...prev, ...previews];
      previewsRef.current = next;
      return next;
    });

    // Reset the input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeExistingScreenshot = (index) => {
    setExistingScreenshots((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewScreenshot = (index) => {
    URL.revokeObjectURL(screenshotPreviews[index]);
    setScreenshotFiles((prev) => prev.filter((_, i) => i !== index));
    setScreenshotPreviews((prev) => {
      const next = prev.filter((_, i) => i !== index);
      previewsRef.current = next;
      return next;
    });
  };

  // Save flow
  const handleSave = async (andNext = false) => {
    // Validate books
    for (const book of books) {
      if (!book.title.trim() || !book.author.trim()) {
        setSaveError('Every book must have a non-empty title and author.');
        return;
      }
    }

    setSaving(true);
    setSaveError(null);

    try {
      const formData = new FormData();
      formData.append('appId', id);
      formData.append('queryIndex', String(selectedQueryIndex));
      formData.append('books', JSON.stringify(books));
      formData.append('existingScreenshots', JSON.stringify(existingScreenshots));
      screenshotFiles.forEach((file) => formData.append('screenshots', file));

      const saved = await saveResult(formData);

      // Update local results
      setResults((prev) => {
        const idx = prev.findIndex((r) => r.queryIndex === selectedQueryIndex);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = saved;
          return updated;
        }
        return [...prev, saved];
      });

      // Update form to reflect saved state
      const savedScreenshots = saved.screenshots || [];
      const savedBooks = saved.books || [];
      cleanStateRef.current = { books: savedBooks, screenshots: savedScreenshots };
      setExistingScreenshots(savedScreenshots);
      setBooks(savedBooks);
      setScreenshotFiles([]);
      previewsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewsRef.current = [];
      setScreenshotPreviews([]);

      if (andNext) {
        const currentFilteredIdx = filteredQueries.findIndex(
          (q) => q.index === selectedQueryIndex
        );
        if (currentFilteredIdx >= 0 && currentFilteredIdx < filteredQueries.length - 1) {
          setSelectedQueryIndex(filteredQueries[currentFilteredIdx + 1].index);
        }
      }
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete flow
  const handleDelete = async () => {
    if (!currentResult) return;
    setDeleting(true);
    setSaveError(null);

    try {
      await deleteResult(currentResult._id);
      setResults((prev) => prev.filter((r) => r._id !== currentResult._id));
      cleanStateRef.current = { books: [], screenshots: [] };
      setExistingScreenshots([]);
      setBooks([]);
      setScreenshotFiles([]);
      previewsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewsRef.current = [];
      setScreenshotPreviews([]);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  // Query selection with unsaved-changes guard
  const handleSelectQuery = (index) => {
    if (index === selectedQueryIndex) return;
    if (isDirty && !window.confirm('You have unsaved changes. Discard and switch query?')) {
      return;
    }
    setSelectedQueryIndex(index);
  };

  // Render helpers
  const renderSkeleton = () => (
    <div className="flex flex-1 gap-6 overflow-hidden min-h-0">
      <div className="w-64 shrink-0 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
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

  const renderError = () => {
    const isNotFound = error === 'App not found';
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center mt-6">
        <p className="text-red-400 mb-4">{isNotFound ? 'App not found' : error}</p>
        <Link
          to="/apps"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors inline-block"
        >
          Back to Apps
        </Link>
      </div>
    );
  };

  const renderQueryNavigator = () => (
    <div className="w-64 shrink-0 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800">
        <p className="text-sm font-semibold text-zinc-300 mb-2">Queries</p>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All</option>
          <option value="complete">Completed</option>
          <option value="not-started">Not started</option>
        </select>
      </div>
      <div className="overflow-y-auto flex-1">
        {filteredQueries.map((q) => (
          <button
            key={q.index}
            onClick={() => handleSelectQuery(q.index)}
            className={`w-full flex items-center px-4 py-2 text-sm cursor-pointer hover:bg-zinc-800/50 transition-colors border-l-2 ${
              q.index === selectedQueryIndex
                ? 'bg-zinc-800 border-indigo-400'
                : 'border-transparent'
            }`}
          >
            <span className="text-zinc-500 w-6 text-right mr-2 text-xs shrink-0">{q.index}</span>
            <span className={`mr-2 shrink-0 ${completedIndices.has(q.index) ? 'text-emerald-400' : 'text-zinc-600'}`}>
              {completedIndices.has(q.index) ? '●' : '○'}
            </span>
            <span className="text-zinc-300 truncate font-mono text-xs">{q.text}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderScreenshots = () => (
    <div className="mb-6">
      <p className="text-sm font-semibold text-zinc-300 mb-3">
        Screenshots ({totalScreenshots} of 5)
      </p>
      <div className="flex flex-wrap gap-3">
        {existingScreenshots.map((src, i) => (
          <div key={`existing-${i}`} className="w-24 h-24 rounded-lg overflow-hidden border border-zinc-700 relative group">
            <img src={src} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
            <button
              onClick={() => removeExistingScreenshot(i)}
              className="absolute top-1 right-1 bg-black/60 text-zinc-300 hover:text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
              &times;
            </button>
          </div>
        ))}
        {screenshotPreviews.map((src, i) => (
          <div key={`new-${i}`} className="w-24 h-24 rounded-lg overflow-hidden border border-zinc-700 relative group">
            <img src={src} alt={`New screenshot ${i + 1}`} className="w-full h-full object-cover" />
            <button
              onClick={() => removeNewScreenshot(i)}
              className="absolute top-1 right-1 bg-black/60 text-zinc-300 hover:text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
              &times;
            </button>
          </div>
        ))}
        {totalScreenshots < 5 && (
          <label className="w-24 h-24 rounded-lg border-2 border-dashed border-zinc-700 hover:border-zinc-500 flex items-center justify-center text-zinc-500 hover:text-zinc-300 cursor-pointer transition-colors">
            <span className="text-2xl">+</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        )}
      </div>
    </div>
  );

  const renderEntryForm = () => {
    if (!selectedQuery) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-zinc-500">No query selected</p>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-zinc-100">
              Query #{selectedQuery.index} &mdash; {selectedQuery.text}
            </h2>
            <p className="text-sm text-zinc-400 mt-1">{selectedQuery.description}</p>
            <div className="mt-2">
              <QueryCategoryBadge category={selectedQuery.category} />
            </div>
          </div>

          {renderScreenshots()}
          <BookListEditor books={books} onChange={setBooks} />

          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={() => handleSave(false)}
              disabled={!canSave || saving || deleting}
              className="bg-zinc-700 hover:bg-zinc-600 text-zinc-100 px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={!canSave || saving || deleting}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save & Next →'}
            </button>
            {currentResult && (
              <button
                onClick={handleDelete}
                disabled={saving || deleting}
                className="ml-auto text-zinc-500 hover:text-rose-400 px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting...' : 'Delete Result'}
              </button>
            )}
          </div>

          {saveError && (
            <p className="text-sm text-rose-400 mt-3">{saveError}</p>
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
        {renderEntryForm()}
      </div>
    );
  };

  const completedCount = completedIndices.size;

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <Link
          to={app ? `/apps/${id}` : '/apps'}
          className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
        >
          &larr; Back to {app ? app.name : 'App'}
        </Link>
        <h1 className="text-2xl font-bold mt-2">
          Results Entry{app ? ` — ${app.name}` : ''}
        </h1>
        <p className="text-zinc-400 text-sm">
          Record search results for each of the 50 queries.
        </p>
        {!loading && !error && (
          <p className="text-zinc-500 text-sm mt-1">
            Progress: {completedCount} / {queries.length} complete
          </p>
        )}
      </div>
      {renderContent()}
    </div>
  );
}
