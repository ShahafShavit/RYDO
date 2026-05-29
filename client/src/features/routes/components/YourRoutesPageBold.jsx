import Eyebrow from '@/shared/components/bold/Eyebrow';
import DisplayTitle from '@/shared/components/bold/DisplayTitle';
import GradientCTA from '@/shared/components/bold/GradientCTA';
import BoldScreen from '@/shared/components/bold/BoldScreen';
import RouteCardBold from '@/features/routes/components/RouteCardBold';
import { cn } from '@/shared/lib/cn';

const TAB_CHIPS = [
  { key: 'uploaded', label: 'Uploaded' },
  { key: 'favorites', label: 'Favorites' },
];

export default function YourRoutesPageBold({
  activeTab,
  onTabChange,
  routes = [],
  isLoading,
  isError,
  onUploadOpen,
}) {
  const isUploaded = activeTab === 'uploaded';

  return (
    <BoldScreen>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="px-5 pt-2">
          <Eyebrow>Library · {routes.length} routes</Eyebrow>
          <div className="mt-1.5 flex items-end justify-between gap-3">
            <DisplayTitle size="lg" className="min-w-0 flex-1">
              My Routes
            </DisplayTitle>
            <GradientCTA
              type="button"
              heightClass="h-11"
              className="shrink-0 px-4 text-sm"
              onClick={onUploadOpen}
            >
              Upload
            </GradientCTA>
          </div>
        </header>

        <div className="px-5 pt-3">
          <div className="flex gap-2">
            {TAB_CHIPS.map((chip) => (
              <button
                key={chip.key}
                type="button"
                className={cn(
                  'rydo-chip flex-1 justify-center',
                  activeTab === chip.key && 'rydo-chip-on',
                )}
                onClick={() => onTabChange(chip.key)}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {isError ? (
          <p className="mx-5 mt-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Failed to load routes. Please try again.
          </p>
        ) : null}

        {isLoading ? (
          <div className="mx-5 mt-4 h-24 animate-pulse rounded-[28px] bg-surface-strong" />
        ) : routes.length === 0 ? (
          <div className="mx-5 mt-4 rounded-[28px] border border-border bg-surface px-5 py-10 text-center">
            <p className="text-base font-semibold text-fg">No routes found</p>
            <p className="rydo-subtle mt-2 text-sm">
              {isUploaded
                ? "You haven't uploaded any routes yet."
                : "You haven't saved any favorite routes yet."}
            </p>
            {isUploaded ? (
              <GradientCTA
                type="button"
                heightClass="h-11"
                className="mt-5 px-5 text-sm"
                onClick={onUploadOpen}
              >
                Upload a route
              </GradientCTA>
            ) : null}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-4 pt-3.5">
            <Eyebrow className="mb-2.5 ml-0.5">
              {isUploaded ? 'Uploaded routes' : 'Saved favorites'} · {routes.length}
            </Eyebrow>
            <div className="flex flex-col gap-2.5">
              {routes.map((route) => (
                <RouteCardBold key={route.id} route={route} />
              ))}
            </div>
          </div>
        )}
      </div>
    </BoldScreen>
  );
}
