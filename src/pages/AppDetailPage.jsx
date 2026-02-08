import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchApp, deleteApp } from '../api/apps.js';
import { fetchQueries } from '../api/queries.js';
import { fetchResults } from '../api/results.js';
import { formatDate } from '../utils/formatDate.js';
import QueryCategoryBadge from '../components/QueryCategoryBadge.jsx';
import AppFormModal from '../components/AppFormModal.jsx';

export default function AppDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [queries, setQueries] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

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

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${app.name}? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteApp(id);
      navigate('/apps');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEditSave = async () => {
    try {
      const appData = await fetchApp(id);
      setApp(appData);
    } catch (err) {
      setError(err.message);
    }
  };

  const renderSkeleton = () => (
    <>
      <div className="h-5 w-40 bg-zinc-800/50 rounded animate-pulse mb-6" />
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 animate-pulse">
        <div className="w-20 h-20 rounded-xl bg-zinc-800/50 mb-4" />
        <div className="h-8 w-48 bg-zinc-800/50 rounded mb-2" />
        <div className="h-5 w-96 bg-zinc-800/50 rounded mb-2" />
        <div className="h-4 w-64 bg-zinc-800/50 rounded" />
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mt-6">
        <div className="p-6">
          <div className="h-6 w-48 bg-zinc-800/50 rounded animate-pulse mb-4" />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-zinc-800/50 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </>
  );

  const renderError = () => {
    const isNotFound = error === 'App not found';
    return (
      <>
        <Link to="/apps" className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
          &larr; Back to Apps
        </Link>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center mt-6">
          <p className="text-red-400 mb-4">{isNotFound ? 'App not found' : error}</p>
          <Link
            to="/apps"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors inline-block"
          >
            Back to Apps
          </Link>
        </div>
      </>
    );
  };

  const renderAppInfo = () => (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mt-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
            <img
              src={app.logo}
              alt={`${app.name} logo`}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">{app.name}</h2>
            {app.notes && (
              <p className="text-zinc-400 mt-1">{app.notes}</p>
            )}
            <p className="text-sm text-zinc-500 mt-2">
              Added {formatDate(app.createdAt)} &middot; Updated {formatDate(app.updatedAt)}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setShowEditModal(true)}
            className="text-indigo-400 hover:text-indigo-300 border border-zinc-700 rounded-lg px-4 py-2 text-sm transition-colors"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="text-rose-400 hover:text-rose-300 border border-zinc-700 rounded-lg px-4 py-2 text-sm transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );

  const completedIndices = new Set(results.map((r) => r.queryIndex));
  const completedCount = completedIndices.size;

  const renderProgressTable = () => (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mt-6">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-100">Query Progress</h2>
          <span className="text-zinc-500 text-sm">{completedCount} / {queries.length}</span>
        </div>
        {queries.length === 0 ? (
          <p className="text-zinc-500 italic">No queries loaded</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-zinc-800/50 text-zinc-400 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left w-12">#</th>
                  <th className="px-4 py-3 text-left">Query</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {queries.map((q) => (
                  <tr
                    key={q.index}
                    onClick={() => navigate(`/apps/${id}/results?query=${q.index}`)}
                    className="border-t border-zinc-800 hover:bg-zinc-800/30 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 text-sm text-zinc-400">{q.index}</td>
                    <td className="px-4 py-3 text-sm text-zinc-100 font-mono">{q.text}</td>
                    <td className="px-4 py-3">
                      <QueryCategoryBadge category={q.category} />
                    </td>
                    <td className={`px-4 py-3 text-sm ${completedIndices.has(q.index) ? 'text-emerald-400' : 'text-zinc-500'}`}>
                      {completedIndices.has(q.index) ? '● Complete' : '○ Not started'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="px-6 pb-6">
        <Link
          to={`/apps/${id}/results`}
          className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors text-sm"
        >
          Enter Results &rarr;
        </Link>
      </div>
    </div>
  );

  const renderContent = () => {
    if (loading) return renderSkeleton();
    if (error) return renderError();
    return (
      <>
        <Link to="/apps" className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
          &larr; Back to Apps
        </Link>
        {renderAppInfo()}
        {renderProgressTable()}
        <AppFormModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={handleEditSave}
          app={app}
        />
      </>
    );
  };

  return (
    <div>
      {renderContent()}
    </div>
  );
}
