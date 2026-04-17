import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { ROUTES } from '@/app/router/route-paths';

export default function NotFoundPage() {
  return (
    <section className="flex min-h-screen flex-col px-6">
      <div className="mx-auto w-full max-w-6xl pt-8">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-fg-subtle">
            <li>
              <Link
                to={ROUTES.home}
                className="text-fg-subtle transition hover:text-fg/90 underline-offset-4 hover:underline"
              >
                Home
              </Link>
            </li>
            <li className="inline-flex shrink-0" aria-hidden>
              <ChevronRight className="h-4 w-4 text-fg-subtle/70" strokeWidth={2} />
            </li>
            <li>
              <span className="font-medium text-fg/90" aria-current="page">
                Not found
              </span>
            </li>
          </ol>
        </nav>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <p className="text-xs uppercase tracking-[0.16em] text-fg-subtle">404</p>
        <h1 className="mt-3 text-5xl font-semibold">Page not found</h1>
        <p className="mt-6 text-sm text-fg-muted">Use the Home link in the breadcrumb above to continue.</p>
      </div>
    </section>
  );
}
