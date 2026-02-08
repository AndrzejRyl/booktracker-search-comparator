import { Link } from 'react-router-dom';

export default function EmptyState({ message, action }) {
  return (
    <div className="card p-6 text-center">
      <p className="text-zinc-500 mb-4">{message}</p>
      {action && action.to && (
        <Link
          to={action.to}
          className="text-indigo-400 hover:text-indigo-300 text-sm"
        >
          {action.label}
        </Link>
      )}
      {action && action.onClick && (
        <button
          onClick={action.onClick}
          className={`px-4 py-2 rounded-lg transition-colors ${
            action.variant === 'secondary'
              ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-100'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white'
          }`}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
