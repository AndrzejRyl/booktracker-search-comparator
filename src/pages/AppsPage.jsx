import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchApps } from '../api/apps.js';
import { formatDate } from '../utils/formatDate.js';
import AppFormModal from '../components/AppFormModal.jsx';
import ErrorCard from '../components/ErrorCard.jsx';
import EmptyState from '../components/EmptyState.jsx';

export default function AppsPage() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadApps = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApps();
      setApps(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApps();
  }, []);

  const renderSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 animate-pulse">
          <div className="w-16 h-16 rounded-xl bg-zinc-800/50 mb-4" />
          <div className="h-5 w-32 bg-zinc-800/50 rounded mb-2" />
          <div className="h-4 w-full bg-zinc-800/50 rounded mb-1" />
          <div className="h-4 w-2/3 bg-zinc-800/50 rounded mb-3" />
          <div className="h-3 w-24 bg-zinc-800/50 rounded" />
        </div>
      ))}
    </div>
  );

  const renderError = () => (
    <ErrorCard message={error} onRetry={loadApps} />
  );

  const renderEmpty = () => (
    <EmptyState
      message="No apps tracked yet. Add your first book-tracking app to get started."
      action={{ label: 'Add App', onClick: () => setShowAddModal(true) }}
    />
  );

  const renderGrid = () => (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {apps.map((app) => (
          <Link
            key={app._id}
            to={`/apps/${app._id}`}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors block"
          >
            <div className="w-16 h-16 rounded-xl bg-zinc-800 overflow-hidden mb-4">
              <img
                src={app.logo}
                alt={`${app.name} logo`}
                className="w-full h-full object-cover"
              />
            </div>
            <h3 className="text-lg font-semibold text-zinc-100 mb-1">{app.name}</h3>
            {app.notes && (
              <p className="text-sm text-zinc-400 line-clamp-2 mb-3">{app.notes}</p>
            )}
            <p className="text-xs text-zinc-500">Updated {formatDate(app.updatedAt)}</p>
          </Link>
        ))}
      </div>
      <p className="text-zinc-500 text-sm mt-4">
        {apps.length} {apps.length === 1 ? 'app' : 'apps'} tracked
      </p>
    </>
  );

  const renderContent = () => {
    if (loading) return renderSkeleton();
    if (error) return renderError();
    if (apps.length === 0) return renderEmpty();
    return renderGrid();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Apps</h1>
          <p className="text-zinc-400">Manage the book-tracking applications you're comparing.</p>
        </div>
        {!loading && !error && apps.length > 0 && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors text-sm"
          >
            + Add App
          </button>
        )}
      </div>
      {renderContent()}
      <AppFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={loadApps}
        app={null}
      />
    </div>
  );
}
