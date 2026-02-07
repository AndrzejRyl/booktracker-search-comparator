import { useParams } from 'react-router-dom';

export default function QueryDetailPage() {
  const { id } = useParams();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Query Detail</h1>
      <p className="text-zinc-400">Viewing query <code className="text-zinc-300">{id}</code> — golden results and per-app comparison.</p>
    </div>
  );
}
