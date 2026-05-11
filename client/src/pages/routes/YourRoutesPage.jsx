import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSavedRoutes } from '@/features/routes/hooks/useSavedRoutes';
import { useMyRoutes } from '@/features/routes/hooks/useMyRoutes';
import RouteCard from '@/features/routes/components/RouteCard';
import UploadRouteModal from '@/features/routes/components/UploadRouteModal';
import Button from '@/shared/components/ui/button/Button';
import BadgeNav from '@/shared/components/ui/badge-nav/BadgeNav';
import { PAGE_HEADER_PRIMARY_CTA_CLASSNAME } from '@/shared/lib/pageHeaderPrimaryCta';

export default function YourRoutesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('uploaded');

  const uploadModalOpen = searchParams.get('upload') === 'true';

  const openUploadModal = () => {
    setActiveTab('uploaded');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('upload', 'true');
      return next;
    });
  };

  const closeUploadModal = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('upload');
      return next;
    });
  };

  const {
    savedRoutes,
    isLoading: isSavedLoading,
    isError: isSavedError,
  } = useSavedRoutes({ skip: 0, take: 50 });

  const {
    myRoutes,
    isLoading: isMyLoading,
    isError: isMyError,
  } = useMyRoutes({ skip: 0, take: 50 });

  const isActiveUploaded = activeTab === 'uploaded';

  const currentRoutes = isActiveUploaded ? myRoutes : savedRoutes;
  const isLoading = isActiveUploaded ? isMyLoading : isSavedLoading;
  const isError = isActiveUploaded ? isMyError : isSavedError;

  const tabs = [
    { value: 'uploaded', label: 'Uploaded Routes' },
    { value: 'favorites', label: 'Favorite Routes' },
  ];

  return (
    <section className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-fg-subtle">Library</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <h1 className="min-w-0 flex-1 text-3xl font-semibold leading-tight">My Routes</h1>
          <Button
            variant="primary"
            type="button"
            size="sm"
            className={PAGE_HEADER_PRIMARY_CTA_CLASSNAME}
            onClick={openUploadModal}
          >
            Upload route
          </Button>
        </div>
      </div>

      <BadgeNav options={tabs} value={activeTab} onChange={setActiveTab} className="max-w-100" />

      {isLoading ? (
        <div className="text-fg-muted">Loading routes...</div>
      ) : isError ? (
        <div className="text-red-400">Failed to load routes. Please try again later.</div>
      ) : !currentRoutes || currentRoutes.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <h2 className="mb-2 text-xl text-fg">No routes found</h2>
          <p className="mb-6 text-fg-muted">
            {isActiveUploaded
              ? "You haven't uploaded any routes yet."
              : "You haven't saved any favorite routes yet."}
          </p>
          {isActiveUploaded && (
            <Button variant="primary" type="button" size="sm" className={PAGE_HEADER_PRIMARY_CTA_CLASSNAME} onClick={openUploadModal}>
              Upload a route
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {currentRoutes.map((route) => (
            <RouteCard key={route.id} route={route} />
          ))}
        </div>
      )}

      <UploadRouteModal isOpen={uploadModalOpen} onClose={closeUploadModal} />
    </section>
  );
}
