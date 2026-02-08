import { Link } from 'react-router-dom';

export default function ErrorCard({ message, onRetry, action }) {
  return (
    <div className="card p-6 text-center">
      <p className="text-red-400 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
        >
          Retry
        </button>
      )}
      {action && (
        <Link
          to={action.to}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors inline-block"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
