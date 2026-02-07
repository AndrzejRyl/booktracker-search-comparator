import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">404 — Page Not Found</h1>
      <p className="text-zinc-400">
        The page you're looking for doesn't exist.{' '}
        <Link to="/" className="text-indigo-400 hover:text-indigo-300">Go to Dashboard</Link>
      </p>
    </div>
  );
}
