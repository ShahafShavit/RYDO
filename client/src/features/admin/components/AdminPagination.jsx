import Button from '@/shared/components/ui/button/Button';
import { cn } from '@/shared/lib/cn';

const PAGE_SIZES = [10, 20, 50];

export default function AdminPagination({
  skip,
  take,
  total,
  onPageChange,
  onPageSizeChange,
  className,
}) {
  const safeTotal = Number(total) || 0;
  const safeTake = Number(take) || 20;
  const safeSkip = Number(skip) || 0;
  const page = Math.floor(safeSkip / safeTake) + 1;
  const pageCount = Math.max(1, Math.ceil(safeTotal / safeTake));
  const from = safeTotal === 0 ? 0 : safeSkip + 1;
  const to = Math.min(safeSkip + safeTake, safeTotal);

  function goToPage(nextPage) {
    const clamped = Math.min(Math.max(1, nextPage), pageCount);
    onPageChange((clamped - 1) * safeTake);
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <p className="text-xs text-fg-subtle">
        {safeTotal === 0 ? 'No results' : `Showing ${from}–${to} of ${safeTotal}`}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {onPageSizeChange ? (
          <label className="flex items-center gap-2 text-xs text-fg-muted">
            <span>Per page</span>
            <select
              value={safeTake}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded-lg border border-border bg-surface px-2 py-1 text-fg"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
          Previous
        </Button>
        <span className="rydo-tnum text-xs text-fg-muted">
          {page} / {pageCount}
        </span>
        <Button size="sm" variant="secondary" disabled={page >= pageCount} onClick={() => goToPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
