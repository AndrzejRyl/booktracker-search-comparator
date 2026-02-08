import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';

export default function NotFoundPage() {
  return (
    <div>
      <PageHeader title="404 — Page Not Found" />
      <p className="text-zinc-400">
        The page you're looking for doesn't exist.{' '}
        <Link to="/" className="text-indigo-400 hover:text-indigo-300">Go to Dashboard</Link>
      </p>
    </div>
  );
}
