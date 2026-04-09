export default function FormField({ label, error, children }) {
  return (
    <div className="flex flex-col gap-2">
      {label ? <label className="text-sm font-medium text-white/76">{label}</label> : null}
      {children}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
