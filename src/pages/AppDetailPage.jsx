import { useParams } from 'react-router-dom';

export default function AppDetailPage() {
  const { id } = useParams();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">App Detail</h1>
      <p className="text-zinc-400">Viewing app <code className="text-zinc-300">{id}</code> — progress and result status.</p>
    </div>
  );
}
