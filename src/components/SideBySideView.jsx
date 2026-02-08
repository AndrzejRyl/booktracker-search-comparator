import { useState } from 'react';
import { Link } from 'react-router-dom';
import { isGoldenMatch, countGoldenMatches } from '../utils/goldenMatch.js';
import ScreenshotLightbox from './ScreenshotLightbox.jsx';
import BookListDisplay from './BookListDisplay.jsx';

export default function SideBySideView({ apps, queries, results, goldenResults, initialQueryIndex }) {
  const [selectedQueryIndex, setSelectedQueryIndex] = useState(initialQueryIndex);
  const [selectedAppIds, setSelectedAppIds] = useState(() => apps.map((a) => a._id));
  const [lightbox, setLightbox] = useState(null);

  const golden = goldenResults.find((g) => g.queryIndex === selectedQueryIndex);
  const goldenBooks = golden?.books || [];

  const toggleApp = (appId) => {
    setSelectedAppIds((prev) =>
      prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]
    );
  };

  const renderGoldenCard = () => {
    if (!golden || goldenBooks.length === 0) {
      return (
        <div className="bg-zinc-900 border border-indigo-800/30 rounded-xl p-5 w-72 shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold text-zinc-100">Golden Results</span>
          </div>
          <p className="text-zinc-500 italic text-sm">No golden results defined for this query.</p>
          <Link
            to={`/golden?query=${selectedQueryIndex}`}
            className="text-indigo-400 hover:text-indigo-300 text-sm mt-2 inline-block"
          >
            Define in Golden Editor &rarr;
          </Link>
        </div>
      );
    }

    return (
      <div className="bg-zinc-900 border border-indigo-800/30 rounded-xl p-5 w-72 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-semibold text-zinc-100">Golden Results</span>
        </div>
        <BookListDisplay books={goldenBooks} small />
      </div>
    );
  };

  const renderAppCard = (app) => {
    const result = results.find(
      (r) => r.appId === app._id && r.queryIndex === selectedQueryIndex
    );
    const books = result?.books || [];
    const screenshots = result?.screenshots || [];
    const hasGolden = goldenBooks.length > 0;
    const matchCount = hasGolden ? countGoldenMatches(books, goldenBooks) : 0;

    return (
      <div key={app._id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 w-72 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <img src={app.logo} alt={app.name} className="w-6 h-6 rounded-lg object-cover" />
          <span className="text-sm font-semibold text-zinc-100">{app.name}</span>
          {hasGolden && result && (
            <span className="text-xs text-zinc-500 ml-auto">
              {matchCount}/{goldenBooks.length} matches
            </span>
          )}
        </div>

        {!result ? (
          <p className="text-zinc-500 italic text-sm">No results for this query</p>
        ) : (
          <>
            <BookListDisplay
              books={books}
              small
              highlightFn={hasGolden ? (book) => isGoldenMatch(book, goldenBooks) : undefined}
            />

            {screenshots.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {screenshots.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt={`${app.name} screenshot ${i + 1}`}
                    className="w-12 h-12 rounded border border-zinc-700 object-cover cursor-pointer hover:border-indigo-500 transition-colors"
                    onClick={() => setLightbox({ screenshots, initialIndex: i, appName: app.name })}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderCards = () => {
    if (selectedQueryIndex === null) {
      return (
        <p className="text-zinc-500 text-sm italic text-center py-12">
          Select a query above to compare results across apps.
        </p>
      );
    }

    if (selectedAppIds.length === 0) {
      return (
        <p className="text-zinc-500 text-sm italic text-center py-12">
          Select at least one app to see comparison results.
        </p>
      );
    }

    const selectedApps = apps.filter((a) => selectedAppIds.includes(a._id));

    return (
      <div className="flex flex-wrap gap-4">
        {renderGoldenCard()}
        {selectedApps.map((app) => renderAppCard(app))}
      </div>
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <select
          value={selectedQueryIndex ?? ''}
          onChange={(e) => setSelectedQueryIndex(e.target.value ? Number(e.target.value) : null)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-zinc-100 min-w-[300px] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">Select a query...</option>
          {queries.map((q) => (
            <option key={q.index} value={q.index}>
              #{q.index} — {q.text}
            </option>
          ))}
        </select>

        <div className="flex flex-wrap gap-2">
          {apps.map((app) => {
            const selected = selectedAppIds.includes(app._id);
            return (
              <button
                key={app._id}
                onClick={() => toggleApp(app._id)}
                aria-pressed={selected}
                className={`rounded-lg px-3 py-1.5 text-xs cursor-pointer transition-colors flex items-center gap-1.5 ${
                  selected
                    ? 'bg-indigo-900/30 border border-indigo-700/50 text-indigo-300'
                    : 'bg-zinc-800 border border-zinc-700 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                <img src={app.logo} alt={app.name} className="w-5 h-5 rounded object-cover" />
                {app.name}
              </button>
            );
          })}
        </div>
      </div>

      {renderCards()}

      {lightbox && (
        <ScreenshotLightbox
          screenshots={lightbox.screenshots}
          initialIndex={lightbox.initialIndex}
          appName={lightbox.appName}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}
