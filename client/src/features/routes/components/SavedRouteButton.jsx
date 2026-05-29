import { Heart } from 'lucide-react';
import Button from '@/shared/components/ui/button/Button';
import IconButton from '@/shared/components/bold/IconButton';
import { coerceId } from '@/shared/api/api-helpers';
import { useSavedRoutes } from '@/features/routes/hooks/useSavedRoutes';
import { useSaveRoute } from '@/features/routes/hooks/useSaveRoute';
import { useUnsaveRoute } from '@/features/routes/hooks/useUnsaveRoute';
import { cn } from '@/shared/lib/cn';

export default function SavedRouteButton({ routeId, variant = 'default', className }) {
  const savedQuery = useSavedRoutes({ skip: 0, take: 100 });
  const save = useSaveRoute();
  const unsave = useUnsaveRoute();
  const normalizedRouteId = coerceId(routeId);

  const isSaved = savedQuery.savedRoutes.some((route) => coerceId(route.id) === normalizedRouteId);

  const onClick = () => {
    if (!normalizedRouteId) return;
    if (isSaved) unsave.mutate(normalizedRouteId);
    else save.mutate(normalizedRouteId);
  };

  const disabled = save.isLoading || unsave.isLoading;
  const label = isSaved ? 'Remove from saved routes' : 'Save route';

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
