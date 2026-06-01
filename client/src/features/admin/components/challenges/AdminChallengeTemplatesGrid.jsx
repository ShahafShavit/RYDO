import Card from '@/shared/components/ui/card/Card';
import AdminStatusPill from '@/features/admin/components/AdminStatusPill';

function TemplateCard({ template, variant }) {
  const inner = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <AdminStatusPill label={template.kind} />
        <AdminStatusPill label={template.isSystem ? 'system' : 'custom'} tone="neutral" />
      </div>
      <h3 className="mt-2 font-semibold">{template.title}</h3>
      <p className="mt-2 text-sm text-fg-muted">{template.description}</p>
      {template.kind === 'Base' ? (
        <p className="mt-2 text-sm text-fg-subtle">XP rewards: {template.defaultXpReward}</p>
      ) : null}
    </>
  );

  if (variant === 'mobile') {
    return <div className="rydo-bold-glass-row px-4 py-3.5">{inner}</div>;
  }

  return <Card>{inner}</Card>;
}

export default function AdminChallengeTemplatesGrid({ items, variant = 'desktop' }) {
  if (items.length === 0) {
    return <p className="text-sm text-fg-muted">No templates found.</p>;
  }

  return (
    <div className={variant === 'mobile' ? 'space-y-2' : 'grid gap-4 md:grid-cols-2'}>
      {items.map((template) => (
        <TemplateCard key={template.id} template={template} variant={variant} />
      ))}
    </div>
  );
}
