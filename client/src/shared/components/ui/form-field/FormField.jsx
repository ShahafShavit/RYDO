import LabelWithHelp from '@/shared/components/ui/info-tooltip/LabelWithHelp';

export default function FormField({ label, hint, hintTopic, error, children }) {
  return (
    <div className="flex flex-col gap-2">
      {label ? (
        hint ? (
          <LabelWithHelp as="label" hint={hint} topic={hintTopic ?? (typeof label === 'string' ? label : undefined)} className="text-sm font-medium text-fg/76">
            {label}
          </LabelWithHelp>
        ) : (
          <label className="text-sm font-medium text-fg/76">{label}</label>
        )
      ) : null}
      {children}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
