export default function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-zinc-100 mb-1">{title}</h1>
      {subtitle && <p className="text-sm text-zinc-400">{subtitle}</p>}
      {children}
    </div>
  );
}
