export default function AdminHeader({ title = 'Admin Dashboard', description = 'Moderation, metrics and operational control for the platform.' }) {
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.16em] text-white/42">Control</p>
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="max-w-2xl text-white/64">{description}</p>
    </div>
  );
}
