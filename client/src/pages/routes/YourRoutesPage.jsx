import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSavedRoutes } from '@/features/routes/hooks/useSavedRoutes';
import { useMyRoutes } from '@/features/routes/hooks/useMyRoutes';
import RouteCard from '@/features/routes/components/RouteCard';
import UploadRouteModal from '@/features/routes/components/UploadRouteModal';
import Button from '@/shared/components/ui/button/Button';
import BadgeNav from '@/shared/components/ui/badge-nav/BadgeNav';

export default function YourRoutesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('uploaded');

  const uploadModalOpen = searchParams.get('upload') === 'true';

  const openUploadModal = () => {
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

  useEffect(() => {
    if (uploadModalOpen) {
      setActiveTab('uploaded');
    }
  }, [uploadModalOpen]);

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
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-white/42">Library</p>
          <h1 className="mt-2 text-3xl font-semibold">Your routes</h1>
          <p className="mt-3 max-w-2xl text-white/64">
            Manage the routes you&apos;ve uploaded and the ones you&apos;ve saved for later.
          </p>
        </div>
        <Button variant="neon" type="button" className="shrink-0 sm:mt-8" onClick={openUploadModal}>
          Upload route
        </Button>
      </div>

      <BadgeNav options={tabs} value={activeTab} onChange={setActiveTab} className="max-w-100" />

      {isLoading ? (
        <div className="text-white/56">Loading routes...</div>
      ) : isError ? (
        <div className="text-red-400">Failed to load routes. Please try again later.</div>
      ) : !currentRoutes || currentRoutes.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <h2 className="mb-2 text-xl text-white">No routes found</h2>
          <p className="mb-6 text-white/56">
            {isActiveUploaded
              ? "You haven't uploaded any routes yet."
              : "You haven't saved any favorite routes yet."}
          </p>
          {isActiveUploaded && (
            <Button variant="neon" type="button" onClick={openUploadModal}>
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
