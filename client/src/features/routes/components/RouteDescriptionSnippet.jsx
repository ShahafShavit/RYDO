import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/app/router/route-paths';
import Card from '@/shared/components/ui/card/Card';

/** Word count for truncated previews (split on whitespace and `(` `)`; “show more” when longer). */
export const ROUTE_DESCRIPTION_PREVIEW_MAX_WORDS = 10;

/** Route detail page uses the same word limit; override here if the detail preview should be longer. */
export const ROUTE_DETAILS_DESCRIPTION_PREVIEW_MAX_WORDS = ROUTE_DESCRIPTION_PREVIEW_MAX_WORDS;

export const ROUTE_DESCRIPTION_SHOW_MORE = 'show more...';

const linkClass = 'font-medium text-rydo-purple hover:underline';

const TRUNCATION_SUFFIX = '...';

function splitWords(text) {
  return String(text || '')
    .trim()
    .split(/[\s(-–)]+/)
    .filter(Boolean);
}

function previewParts(text, maxWords = ROUTE_DESCRIPTION_PREVIEW_MAX_WORDS) {
  const full = String(text || '').trim();
  if (!full) return { full: '', preview: '', needsMore: false };
  const words = splitWords(full);
  if (words.length <= maxWords) return { full, preview: full, needsMore: false };
  return {
    full,
    preview: words.slice(0, maxWords).join(' ') + TRUNCATION_SUFFIX,
    needsMore: true,
  };
}

/**
 * Card: first {@link ROUTE_DESCRIPTION_PREVIEW_MAX_WORDS} words + “show more...” linking to the route page.
 */
export function RouteCardDescription({ description, fallback, routeId }) {
  const full = (description?.trim() || fallback || '').trim();
  const { preview, needsMore } = previewParts(full);
  const to = ROUTES.routeDetails.replace(':routeId', String(routeId));

  return (
    <div className="mt-2 space-y-1 text-sm text-fg-muted">
      {needsMore ? (
        <>
          <p className="m-0">{preview}</p>
          <div>
            <Link to={to} className={`text-sm ${linkClass}`}>
              {ROUTE_DESCRIPTION_SHOW_MORE}
            </Link>
          </div>
        </>
      ) : (
        <p className="m-0">{full}</p>
      )}
    </div>
  );
}

/**
 * Route detail: below the map / elevation — longer preview than list cards, in a card.
 */
export function RouteDetailsDescription({ description }) {
  const [expanded, setExpanded] = useState(false);
  const { full, preview, needsMore } = previewParts(
    description,
    ROUTE_DETAILS_DESCRIPTION_PREVIEW_MAX_WORDS,
  );

  if (!full) return null;

  return (
    <Card className="relative z-(--rydo-z-route-elevated) mt-4 border-border bg-surface-strong">
      <h3 className="text-lg font-semibold text-fg/95">Description</h3>
      <div className="mt-3 space-y-1 text-base leading-relaxed text-fg/82" dir="auto">
        <p className="m-0 whitespace-pre-wrap">{needsMore && !expanded ? preview : full}</p>
        {needsMore && !expanded ? (
          <div>
            <button type="button" onClick={() => setExpanded(true)} className={`text-base ${linkClass}`}>
              {ROUTE_DESCRIPTION_SHOW_MORE}
            </button>
          </div>
        ) : null}
        {needsMore && expanded ? (
          <div>
            <button type="button" onClick={() => setExpanded(false)} className={`text-base ${linkClass}`}>
              show less
            </button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
