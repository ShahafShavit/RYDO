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
import TruncatedText from '@/shared/components/ui/TruncatedText';

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
    <nav aria-label="Breadcrumb" className={`mb-4 min-w-0 ${className}`.trim()}>
      <ol className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-fg-subtle">
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
              <li className={`min-w-0 ${isLast ? 'max-w-full flex-1 basis-0' : 'shrink-0'}`}>
                {showLink && !isLast ? (
                  <TruncatedText
                    as={Link}
                    to={item.to}
                    className="text-fg-subtle transition hover:text-fg/90 underline-offset-4 hover:underline"
                  >
                    {item.label}
                  </TruncatedText>
                ) : (
                  <TruncatedText
                    as="span"
                    className={isLast ? 'font-medium text-fg/90' : undefined}
                    {...(isLast ? { 'aria-current': 'page' } : {})}
                  >
                    {item.label}
                  </TruncatedText>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
