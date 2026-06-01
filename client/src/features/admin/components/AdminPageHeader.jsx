import Eyebrow from '@/shared/components/bold/Eyebrow';
import DisplayTitle from '@/shared/components/bold/DisplayTitle';

export default function AdminPageHeader({
  title,
  eyebrow = 'Admin',
  description = null,
  actions = null,
}) {
  return (
    <>
      <div className="hidden md:flex md:items-start md:justify-between md:gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.16em] text-fg-subtle">{eyebrow}</p>
          <h1 className="text-3xl font-semibold">{title}</h1>
          {description ? <p className="max-w-2xl text-sm text-fg-muted">{description}</p> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>

      <div className="md:hidden">
        <div className="flex items-start justify-between gap-3 px-5 pt-2">
          <div className="min-w-0">
            <Eyebrow>{eyebrow}</Eyebrow>
            <DisplayTitle size="sm" className="mt-1">
              {title}
            </DisplayTitle>
            {description ? <p className="mt-2 text-sm text-fg-muted">{description}</p> : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      </div>
    </>
  );

}
