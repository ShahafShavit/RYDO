export default function AdminHeader({ title = 'Admin Dashboard' }) {
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.16em] text-fg-subtle">Control</p>
      <h1 className="text-3xl font-semibold">{title}</h1>
    </div>
  );
}
