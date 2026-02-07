import { CATEGORY_LABELS, CATEGORY_COLORS } from '../constants/queryCategories.js';

export default function QueryCategoryBadge({ category }) {
  const colors = CATEGORY_COLORS[category] || 'bg-zinc-800 text-zinc-400';
  const label = CATEGORY_LABELS[category] || category;
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors}`}>
      {label}
    </span>
  );
}
