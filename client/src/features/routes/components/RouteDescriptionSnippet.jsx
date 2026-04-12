import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/app/router/route-paths';
import Card from '@/shared/components/ui/card/Card';

/** Preview length for explore / list route cards (before “show more” → route page). */
export const ROUTE_DESCRIPTION_PREVIEW_MAX = 50;

/** Preview length on the route detail page before inline “show more...”. */
export const ROUTE_DETAILS_DESCRIPTION_PREVIEW_MAX = 150;

export const ROUTE_DESCRIPTION_SHOW_MORE = 'show more...';

const linkClass = 'font-medium text-rydo-purple hover:underline';

function previewParts(text, maxLen = ROUTE_DESCRIPTION_PREVIEW_MAX) {
  const full = String(text || '').trim();
  if (!full) return { full: '', preview: '', needsMore: false };
  if (full.length <= maxLen) return { full, preview: full, needsMore: false };
  return { full, preview: full.slice(0, maxLen), needsMore: true };
}

/**
 * Card: first {@link ROUTE_DESCRIPTION_PREVIEW_MAX} chars + “show more...” linking to the route page.
 */
export function RouteCardDescription({ description, fallback, routeId }) {
  const full = (description?.trim() || fallback || '').trim();
  const { preview, needsMore } = previewParts(full);
  const to = ROUTES.routeDetails.replace(':routeId', String(routeId));

  return (
    <p className="mt-2 text-sm text-fg-muted">
      {needsMore ? (
        <>
          {preview}
          {' '}
          <Link to={to} className={`text-sm ${linkClass}`}>
            {ROUTE_DESCRIPTION_SHOW_MORE}
          </Link>
        </>
      ) : (
        full
      )}
    </p>
  );
}

/**
 * Route detail: below the map / elevation — longer preview than list cards, in a card.
 */
export function RouteDetailsDescription({ description }) {
  const [expanded, setExpanded] = useState(false);
  const { full, preview, needsMore } = previewParts(description, ROUTE_DETAILS_DESCRIPTION_PREVIEW_MAX);

  if (!full) return null;

  return (
    <Card className="mt-4 border-border bg-surface-strong">
      <h3 className="text-lg font-semibold text-fg/95">Description</h3>
      <p
        className="mt-3 text-base leading-relaxed text-fg/82 whitespace-pre-wrap"
        dir="auto"
      >
        {needsMore && !expanded ? preview : full}
        {needsMore && !expanded ? (
          <>
            {' '}
            <button type="button" onClick={() => setExpanded(true)} className={`text-base ${linkClass}`}>
              {ROUTE_DESCRIPTION_SHOW_MORE}
            </button>
          </>
        ) : null}
        {needsMore && expanded ? (
          <>
            {' '}
            <button type="button" onClick={() => setExpanded(false)} className={`text-base ${linkClass}`}>
              show less
            </button>
          </>
        ) : null}
      </p>
    </Card>
  );
}
