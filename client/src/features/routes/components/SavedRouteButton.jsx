import Button from '@/shared/components/ui/button/Button';
import { useSavedRoutes, useSaveRoute, useUnsaveRoute } from '../api/routesApi';

export default function SavedRouteButton({ routeId }) {
  const savedQuery = useSavedRoutes();
  const save = useSaveRoute();
  const unsave = useUnsaveRoute();

  const isSaved = (savedQuery.data || []).some((s) => s.id === routeId);

  const onClick = () => {
    if (isSaved) unsave.mutate(routeId);
    else save.mutate(routeId);
  };

  return (
    <Button variant={isSaved ? 'success' : 'primary'} onClick={onClick} disabled={save.isLoading || unsave.isLoading}>
      {isSaved ? 'Saved' : 'Save'}
    </Button>
  );
}
