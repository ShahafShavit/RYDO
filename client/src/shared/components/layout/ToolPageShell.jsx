import { BreadcrumbProvider } from '@/shared/context/BreadcrumbContext';
import PageBreadcrumbs from '@/shared/components/navigation/PageBreadcrumbs';

/**
 * Minimal top chrome for fullscreen tool routes (/live, /timelapse).
 * @param {{ children: import('react').ReactNode }} props
 */
export default function ToolPageShell({ children }) {
  return (
    <BreadcrumbProvider>
      <div className="flex min-h-dvh flex-col bg-[var(--rydo-bg-deep)]">
        <header className="rydo-safe-top relative z-(--rydo-z-sticky) shrink-0 border-b border-border bg-black/20 px-4 py-3 backdrop-blur-xl md:px-8">
          <div className="mx-auto max-w-6xl">
            <PageBreadcrumbs variant="tool" />
          </div>
        </header>
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </BreadcrumbProvider>
  );
}
