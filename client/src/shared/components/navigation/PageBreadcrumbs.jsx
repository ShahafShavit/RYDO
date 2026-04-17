import { Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useBreadcrumbContext } from '@/shared/context/BreadcrumbContext';
import {
  buildAdminBreadcrumbTrail,
  buildDashboardBreadcrumbTrail,
  buildPublicBreadcrumbTrail,
  buildToolBreadcrumbTrail,
} from '@/shared/lib/breadcrumb-trails';

/**
 * @param {{
 *  variant: 'dashboard' | 'admin' | 'public' | 'tool',
 *  className?: string,
 * }} props
 */
export default function PageBreadcrumbs({ variant, className = '' }) {
  const location = useLocation();
  const { detailLabel } = useBreadcrumbContext();

  let items;
  if (variant === 'dashboard') {
    items = buildDashboardBreadcrumbTrail(location.pathname, detailLabel);
  } else if (variant === 'admin') {
    items = buildAdminBreadcrumbTrail(location.pathname);
  } else if (variant === 'public') {
    items = buildPublicBreadcrumbTrail(location.pathname);
  } else {
    items = buildToolBreadcrumbTrail(location.pathname);
  }

  if (variant === 'public' && items == null) {
    return null;
  }

  const list = items ?? [];

  return (
    <nav aria-label="Breadcrumb" className={`mb-4 ${className}`.trim()}>
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-fg-subtle">
        {list.map((item, i) => {
          const isLast = i === list.length - 1;
          const showLink = item.to != null && item.to !== '';

          return (
            <Fragment key={`${item.label}-${i}`}>
              {i > 0 ? (
                <li className="inline-flex shrink-0" aria-hidden>
                  <ChevronRight className="h-4 w-4 text-fg-subtle/70" strokeWidth={2} />
                </li>
              ) : null}
              <li className="min-w-0">
                {showLink && !isLast ? (
                  <Link
                    to={item.to}
                    className="truncate text-fg-subtle transition hover:text-fg/90 underline-offset-4 hover:underline"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className={isLast ? 'truncate font-medium text-fg/90' : 'truncate'}
                    {...(isLast ? { 'aria-current': 'page' } : {})}
                  >
                    {item.label}
                  </span>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
