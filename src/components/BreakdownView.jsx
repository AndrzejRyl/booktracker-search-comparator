import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { countGoldenMatches } from '../utils/goldenMatch.js';
import { CATEGORY_LABELS } from '../constants/queryCategories.js';
import { COMPARE_VIEWS } from '../constants/compareViews.js';
import QueryCategoryBadge from './QueryCategoryBadge.jsx';

export default function BreakdownView({ apps, queries, results, goldenResults, setSearchParams }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortCol, setSortCol] = useState('#');
  const [sortDir, setSortDir] = useState('asc');

  const goldenMap = useMemo(
    () => new Map(goldenResults.map((g) => [g.queryIndex, g])),
    [goldenResults]
  );

  const resultMap = useMemo(() => {
    const m = new Map();
    for (const r of results) {
      m.set(`${r.appId}-${r.queryIndex}`, r);
    }
    return m;
  }, [results]);

  const filteredQueries = useMemo(() => {
    let list = queries;
    if (categoryFilter) {
      list = list.filter((q) => q.category === categoryFilter);
    }
    if (search.trim()) {
      const term = search.toLowerCase().trim();
      list = list.filter(
        (q) =>
          q.text.toLowerCase().includes(term) ||
          (q.description && q.description.toLowerCase().includes(term))
      );
    }
    return list;
  }, [queries, categoryFilter, search]);

  const getMatchInfo = (appId, queryIndex) => {
    const golden = goldenMap.get(queryIndex);
    const result = resultMap.get(`${appId}-${queryIndex}`);
    const hasGolden = golden && golden.books.length > 0;
    const hasResult = !!result;
    const goldenBooks = golden?.books || [];
    const matchCount = hasResult && hasGolden ? countGoldenMatches(result.books, goldenBooks) : 0;
    return { hasGolden, hasResult, matchCount, totalGolden: goldenBooks.length };
  };

  const sortedQueries = useMemo(() => {
    const list = [...filteredQueries];
    list.sort((a, b) => {
      if (sortCol === '#') {
        return sortDir === 'asc' ? a.index - b.index : b.index - a.index;
      }

      // Sorting by an app column
      const appId = sortCol;
      const infoA = getMatchInfo(appId, a.index);
      const infoB = getMatchInfo(appId, b.index);

      // No golden and no result sort to bottom
      const scoreA = !infoA.hasGolden || !infoA.hasResult ? -Infinity : infoA.matchCount;
      const scoreB = !infoB.hasGolden || !infoB.hasResult ? -Infinity : infoB.matchCount;

      if (scoreA === scoreB) return a.index - b.index;
      return sortDir === 'asc' ? scoreA - scoreB : scoreB - scoreA;
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredQueries, sortCol, sortDir, resultMap, goldenMap]);

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir(col === '#' ? 'asc' : 'desc');
    }
  };

  const handleCellClick = (queryIndex) => {
    setSearchParams({
      view: COMPARE_VIEWS.SIDE_BY_SIDE,
      query: String(queryIndex),
    });
  };

  const renderSortIndicator = (col) => {
    if (sortCol !== col) return null;
    return <span className="text-indigo-400 ml-1">{sortDir === 'asc' ? '▲' : '▼'}</span>;
  };

  const getCellStyle = (appId, queryIndex) => {
    const { hasGolden, hasResult, matchCount, totalGolden } = getMatchInfo(appId, queryIndex);

    if (!hasResult) return 'bg-zinc-800/30 text-zinc-600';
    if (!hasGolden) return 'bg-zinc-800/50 text-zinc-500';

    const pct = totalGolden > 0 ? matchCount / totalGolden : 0;
    if (pct === 1) return 'bg-emerald-700/50 text-emerald-100';
    if (pct >= 0.5) return 'bg-emerald-900/40 text-emerald-300';
    if (pct > 0) return 'bg-amber-900/40 text-amber-300';
    return 'bg-rose-900/30 text-rose-300';
  };

  const renderAppCell = (appId, queryIndex) => {
    const { hasGolden, hasResult, matchCount, totalGolden } = getMatchInfo(appId, queryIndex);

    if (!hasResult) return '—';
    if (!hasGolden) return '·';
    return `${matchCount}/${totalGolden}`;
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <input
          type="text"
          placeholder="Search queries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-64"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Categories</option>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-zinc-800/50 text-zinc-400 text-xs uppercase tracking-wider">
              <th
                className="px-4 py-3 text-left cursor-pointer hover:text-zinc-200 transition-colors select-none"
                onClick={() => handleSort('#')}
              >
                #{renderSortIndicator('#')}
              </th>
              <th className="px-4 py-3 text-left">Query</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-center text-amber-400">&#9733;</th>
              {apps.map((app) => (
                <th
                  key={app._id}
                  className="px-4 py-3 text-center cursor-pointer hover:text-zinc-200 transition-colors select-none"
                  onClick={() => handleSort(app._id)}
                >
                  <div className="flex items-center justify-center">
                    <img
                      src={app.logo}
                      alt={app.name}
                      title={app.name}
                      className="w-6 h-6 rounded object-cover"
                    />
                    {renderSortIndicator(app._id)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedQueries.map((q) => {
              const golden = goldenMap.get(q.index);
              const hasGolden = golden && golden.books.length > 0;

              return (
                <tr key={q.index} className="border-t border-zinc-800 hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3 text-zinc-500 font-mono text-sm">{q.index}</td>
                  <td
                    className="px-4 py-3 font-mono text-zinc-100 text-sm cursor-pointer hover:text-indigo-400 transition-colors max-w-[200px] truncate"
                    onClick={() => navigate(`/queries/${q.index}`)}
                  >
                    {q.text}
                  </td>
                  <td className="px-4 py-3">
                    <QueryCategoryBadge category={q.category} />
                  </td>
                  <td className="px-4 py-3 text-center text-amber-400/70 text-sm font-mono">
                    {hasGolden ? golden.books.length : '—'}
                  </td>
                  {apps.map((app) => (
                    <td
                      key={app._id}
                      className={`px-4 py-3 text-center text-sm font-mono cursor-pointer transition-colors hover:ring-1 hover:ring-indigo-400/50 hover:ring-inset ${getCellStyle(app._id, q.index)}`}
                      onClick={() => handleCellClick(q.index)}
                    >
                      {renderAppCell(app._id, q.index)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-zinc-500 text-sm mt-4">
        Showing {sortedQueries.length} of {queries.length} queries
      </p>
    </div>
  );
}
