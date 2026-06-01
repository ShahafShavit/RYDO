import Card from '@/shared/components/ui/card/Card';
import Button from '@/shared/components/ui/button/Button';

const INPUT_CLASS = 'mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg';

export default function AdminChallengeCreateForm({ form, setForm, onSubmit, isPending, variant = 'desktop' }) {
  const fields = (
    <form
      className={variant === 'mobile' ? 'space-y-4' : 'max-w-lg space-y-4'}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          ...form,
          startDate: form.startDate || new Date().toISOString(),
          endDate: form.endDate || new Date(Date.now() + 86400000 * 14).toISOString(),
        });
      }}
    >
      <label className="block text-sm">
        Title
        <input
          className={INPUT_CLASS}
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          required
        />
      </label>
      <label className="block text-sm">
        Description
        <textarea
          className={`${INPUT_CLASS} min-h-20`}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </label>
      <label className="block text-sm">
        Kind
        <select className={INPUT_CLASS} value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}>
          <option value="quest">Quest</option>
          <option value="modifier">Modifier</option>
        </select>
      </label>
      <label className="block text-sm">
        Rule
        <select
          className={INPUT_CLASS}
          value={form.ruleType}
          onChange={(e) => setForm((f) => ({ ...f, ruleType: e.target.value }))}
        >
          <option value="Distance">Distance</option>
          <option value="Elevation">Elevation</option>
          <option value="RideCount">Ride count</option>
          <option value="GroupRides">Group rides</option>
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          Target
          <input
            type="number"
            className={INPUT_CLASS}
            value={form.targetValue}
            onChange={(e) => setForm((f) => ({ ...f, targetValue: Number(e.target.value) }))}
          />
        </label>
        <label className="block text-sm">
          Lump XP
          <input
            type="number"
            className={INPUT_CLASS}
            value={form.lumpXp}
            onChange={(e) => setForm((f) => ({ ...f, lumpXp: Number(e.target.value) }))}
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.isFeatured}
          onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))}
        />
        Featured on publish
      </label>
      <Button type="submit" variant="primary" disabled={isPending}>
        {isPending ? 'Publishing…' : 'Publish instance'}
      </Button>
    </form>
  );

  if (variant === 'mobile') return fields;
  return <Card>{fields}</Card>;
}
