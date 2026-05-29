import Stat from '@/shared/components/bold/Stat';
import { cn } from '@/shared/lib/cn';

export default function StatRibbon({ items, className, paddingClass = 'px-5 py-4' }) {
  if (!items?.length) return null;
  return (
    <div className={cn('flex justify-between', paddingClass, className)}>
      {items.map((item, i) => (
        <div key={item.key ?? item.label ?? i} className="contents">
          {i > 0 ? <div className="rydo-vhair" aria-hidden /> : null}
          <Stat {...item} />
        </div>
      ))}
    </div>
  );
}
