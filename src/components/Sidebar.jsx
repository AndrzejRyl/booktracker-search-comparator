import { NavLink } from 'react-router-dom';

const navItems = [
  { label: 'Dashboard', path: '/', icon: '\u{1F4CA}' },
  { label: 'Apps', path: '/apps', icon: '\u{1F4F1}' },
  { label: 'Queries', path: '/queries', icon: '\u{1F50D}' },
  { label: 'Compare', path: '/compare', icon: '\u2696\uFE0F' },
  { label: 'Leaderboard', path: '/leaderboard', icon: '\u{1F3C6}' },
  { label: 'Golden Results', path: '/golden', icon: '\u2B50' },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col">
      <div className="p-6">
        <h1 className="text-lg font-bold text-zinc-100">Book Search Comparator</h1>
      </div>
      <nav className="flex-1 px-3">
        {navItems.map(({ label, path, icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg mb-1 text-sm transition-colors ${
                isActive
                  ? 'bg-zinc-800 text-indigo-400 border-l-2 border-indigo-400'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
              }`
            }
          >
            <span>{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
