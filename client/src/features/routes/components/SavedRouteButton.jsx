import { Heart } from 'lucide-react';
import Button from '@/shared/components/ui/button/Button';
import IconButton from '@/shared/components/bold/IconButton';
import { coerceId } from '@/shared/api/api-helpers';
import { useSavedRoutes } from '@/features/routes/hooks/useSavedRoutes';
import { useSaveRoute } from '@/features/routes/hooks/useSaveRoute';
import { useUnsaveRoute } from '@/features/routes/hooks/useUnsaveRoute';
import { cn } from '@/shared/lib/cn';

export default function SavedRouteButton({
  routeId,
  variant = 'default',
  className,
  favoriteCount,
  isSavedHint,
}) {
  const savedQuery = useSavedRoutes({ skip: 0, take: 100 });
  const save = useSaveRoute();
  const unsave = useUnsaveRoute();
  const normalizedRouteId = coerceId(routeId);

  const inSavedList = savedQuery.savedRoutes.some((route) => coerceId(route.id) === normalizedRouteId);
  const isSaved = typeof isSavedHint === 'boolean' ? isSavedHint : inSavedList;

  const onClick = () => {
    if (!normalizedRouteId) return;
    if (isSaved) unsave.mutate(normalizedRouteId);
    else save.mutate(normalizedRouteId);
  };

  const disabled = save.isLoading || unsave.isLoading;
  const label = isSaved ? 'Remove from saved routes' : 'Save route';
  const count = Math.max(0, Number(favoriteCount ?? 0) || 0);
  const favoriteTitle =
    count === 1
      ? '1 person saved this route as a favorite'
      : `${count} people saved this route as favorites`;

  if (variant === 'counter') {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || !normalizedRouteId}
        aria-label={isSaved ? `${favoriteTitle}. Saved by you. Tap to unsave.` : `${favoriteTitle}. Tap to save.`}
        aria-pressed={isSaved}
        title={favoriteTitle}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[13px] text-fg/90 transition hover:border-border-strong hover:bg-surface-strong active:scale-[0.98] disabled:opacity-60',
          isSaved && 'border-rydo-green/40 text-rydo-green',
          className,
        )}
      >
        <Heart
          className={cn('h-3.5 w-3.5 shrink-0', isSaved ? 'fill-current text-rydo-green' : 'text-rydo-purple opacity-90')}
          strokeWidth={2}
          aria-hidden
        />
        <span className="font-semibold tabular-nums">{count}</span>
      </button>
    );
  }

  if (variant === 'icon') {
    return (
      <IconButton
        icon={Heart}
        size="lg"
        className={cn('h-14 w-14', isSaved && 'text-rydo-green border-rydo-green/40', className)}
        aria-label={label}
        aria-pressed={isSaved}
        disabled={disabled}
        onClick={onClick}
        iconClassName={isSaved ? 'fill-current' : undefined}
      />
    );
  }

  return (
    <Button variant={isSaved ? 'success' : 'primary'} onClick={onClick} disabled={disabled} className={className}>
      {isSaved ? 'Saved' : 'Save'}
    </Button>
  );
}
