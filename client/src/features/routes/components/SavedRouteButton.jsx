import Button from '@/shared/components/ui/button/Button';
import { coerceId } from '@/shared/api/api-helpers';
import { useSavedRoutes } from '@/features/routes/hooks/useSavedRoutes';
import { useSaveRoute } from '@/features/routes/hooks/useSaveRoute';
import { useUnsaveRoute } from '@/features/routes/hooks/useUnsaveRoute';

export default function SavedRouteButton({ routeId }) {
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

  return (
    <Button variant={isSaved ? 'success' : 'primary'} onClick={onClick} disabled={save.isLoading || unsave.isLoading}>
      {isSaved ? 'Saved' : 'Save'}
    </Button>
  );
}
