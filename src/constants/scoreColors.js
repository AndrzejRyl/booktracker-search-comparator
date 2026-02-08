export function getScoreColor(percentage) {
  if (percentage >= 80) return 'text-emerald-400';
  if (percentage >= 60) return 'text-emerald-300';
  if (percentage >= 40) return 'text-amber-400';
  if (percentage >= 20) return 'text-amber-300';
  return 'text-rose-400';
}

export function getScoreBgColor(percentage) {
  if (percentage >= 80) return 'bg-emerald-700/50';
  if (percentage >= 60) return 'bg-emerald-900/40';
  if (percentage >= 40) return 'bg-amber-900/40';
  if (percentage >= 20) return 'bg-amber-900/30';
  return 'bg-rose-900/30';
}

export function getRankColor(rank) {
  if (rank === 1) return 'text-amber-400';
  if (rank === 2) return 'text-zinc-300';
  if (rank === 3) return 'text-amber-700';
  return 'text-zinc-500';
}
