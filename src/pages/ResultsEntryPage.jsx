import { useParams } from 'react-router-dom';

export default function ResultsEntryPage() {
  const { id } = useParams();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Results Entry</h1>
      <p className="text-zinc-400">Enter search results for app <code className="text-zinc-300">{id}</code>.</p>
    </div>
  );
}
