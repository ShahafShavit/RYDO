import { useState } from 'react';
import { useSavedRoutes, useMyRoutes } from '@/features/routes/api/routesApi';
import RouteCard from '@/features/routes/components/RouteCard';
import Button from '@/shared/components/ui/button/Button';
import BadgeNav from '@/shared/components/ui/badge-nav/BadgeNav';

export default function YourRoutesPage() {
    const [activeTab, setActiveTab] = useState('uploaded'); // 'uploaded' or 'favorites'

    const {
        data: savedRoutes,
        isLoading: isSavedLoading,
        isError: isSavedError
    } = useSavedRoutes();

    const {
        data: myRoutes,
        isLoading: isMyLoading,
        isError: isMyError
    } = useMyRoutes();

    const isActiveUploaded = activeTab === 'uploaded';

    const currentRoutes = isActiveUploaded ? myRoutes : savedRoutes;
    const isLoading = isActiveUploaded ? isMyLoading : isSavedLoading;
    const isError = isActiveUploaded ? isMyError : isSavedError;

    const tabs = [
        { value: 'uploaded', label: 'Uploaded Routes' },
        { value: 'favorites', label: 'Favorite Routes' }
    ];

    return (
        <section className="space-y-6">
            <div>
                <p className="text-xs uppercase tracking-[0.16em] text-white/42">Libary</p>
                <h1 className="mt-2 text-3xl font-semibold">Your routes</h1>
                <p className="mt-3 max-w-2xl text-white/64">Manage the routes you've uploaded and the ones you've saved for later.</p>

            </div>

            <BadgeNav
                options={tabs}
                value={activeTab}
                onChange={setActiveTab}
                className="max-w-100"
            />

            {isLoading ? (
                <div className="text-white/56">Loading routes...</div>
            ) : isError ? (
                <div className="text-red-400">Failed to load routes. Please try again later.</div>
            ) : !currentRoutes || currentRoutes.length === 0 ? (
                <div className="p-8 border border-white/10 rounded-2xl bg-white/5 text-center">
                    <h2 className="text-xl text-white mb-2">No routes found</h2>
                    <p className="text-white/56 mb-6">
                        {isActiveUploaded
                            ? "You haven't uploaded any routes yet."
                            : "You haven't saved any favorite routes yet."}
                    </p>
                    {isActiveUploaded && (
                        <Button variant="neon" onClick={() => window.location.href = '?upload=true'}>
                            Upload a Route
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {currentRoutes.map((route) => (
                        <RouteCard key={route.id} route={route} />
                    ))}
                </div>
            )}
        </section>
    );
}
