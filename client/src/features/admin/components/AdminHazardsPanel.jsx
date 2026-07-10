import { useState } from 'react';
import { generatePath, Link } from 'react-router-dom';
import { ChevronDown, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { ROUTES } from '@/app/router/route-paths';
import Card from '@/shared/components/ui/card/Card';
import Button from '@/shared/components/ui/button/Button';
import Loader from '@/shared/components/feedback/Loader';
import { useAdminHazards, useUpdateHazardStatus } from '@/features/admin/hooks/useAdminHazards';
import AdminToolbar, { AdminFilterPills } from '@/features/admin/components/AdminToolbar';
import AdminPagination from '@/features/admin/components/AdminPagination';
import AdminConfirmModal from '@/features/admin/components/AdminConfirmModal';
import AdminStatusPill from '@/features/admin/components/AdminStatusPill';
import AdminEmptyState from '@/features/admin/components/AdminEmptyState';
import AdminErrorState from '@/features/admin/components/AdminErrorState';
import AdminInlineBanner from '@/features/admin/components/AdminInlineBanner';
import HazardScoreBadge from '@/features/hazards/components/HazardScoreBadge';
import { HAZARD_TYPES, hazardTypeIcon, hazardTypeLabel } from '@/features/hazards/hazard-constants';
import { useFormatDistance } from '@/features/account/hooks/useFormatDistance';
import {
  formatDistanceAlongRoute,
  formatDistanceFromRoute,
} from '@/features/hazards/utils/formatHazardDistance';
import { cn } from '@/shared/lib/cn';

const STATUS_FILTERS = [
  { label: 'All statuses', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Hidden', value: 'hidden' },
];

const SEVERITY_FILTERS = [
  { label: 'All severity', value: '' },
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
];

const TYPE_FILTERS = [{ label: 'All types', value: '' }, ...HAZARD_TYPES.map((t) => ({ label: t.label, value: t.id }))];

function formatReportedAt(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return String(value);
  }
}

function formatVoteSummary(votes) {
  if (!votes?.total) return 'No community votes';
  const parts = [];
  if (votes.up > 0) parts.push(`${votes.up} confirmation${votes.up === 1 ? '' : 's'}`);
  if (votes.down > 0) parts.push(`${votes.down} dispute${votes.down === 1 ? '' : 's'}`);
  return parts.join(' · ');
}

function buildRouteHazardLink(hazard) {
  if (!hazard.routeId) return null;
  const path = generatePath(ROUTES.routeDetails, { routeId: String(hazard.routeId) });
  return hazard.id ? `${path}?hazardId=${hazard.id}` : path;
}

function buildMapsLink(hazard) {
  const lat = hazard.location?.lat;
  const lng = hazard.location?.lng;
  if (lat == null || lng == null) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function UserVisibleIndicator({ visible }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        visible
          ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200'
          : 'border-border bg-black/20 text-fg-muted',
      )}
      title={visible ? 'Visible to users on route detail' : 'Not visible to users'}
    >
      {visible ? <Eye className="h-3 w-3" aria-hidden /> : <EyeOff className="h-3 w-3" aria-hidden />}
      {visible ? 'User visible' : 'Hidden from users'}
    </span>
  );
}

function HazardDetails({ hazard, unit }) {
  const mapsLink = buildMapsLink(hazard);
  const fromRouteLabel = formatDistanceFromRoute(hazard.distanceFromRouteM, unit);
  const alongRouteLabel = formatDistanceAlongRoute(hazard.distanceAlongRouteM, unit);

  return (
    <div className="mt-3 space-y-3 border-t border-border pt-3 text-sm">
      {hazard.description ? <p className="text-fg-muted">{hazard.description}</p> : null}
      <dl className="grid gap-2 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-fg-subtle">Hazard ID</dt>
          <dd className="font-mono text-fg">{hazard.id}</dd>
        </div>
        {hazard.rideId ? (
          <div>
            <dt className="text-fg-subtle">Ride ID</dt>
            <dd className="font-mono text-fg">{hazard.rideId}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-fg-subtle">Coordinates</dt>
          <dd className="font-mono text-fg">
            {hazard.location?.lat?.toFixed(5)}, {hazard.location?.lng?.toFixed(5)}
          </dd>
        </div>
        <div>
          <dt className="text-fg-subtle">Region</dt>
          <dd className="text-fg">{hazard.location?.region || '—'}</dd>
        </div>
        <div>
          <dt className="text-fg-subtle">Distance from route</dt>
          <dd className="text-fg">{fromRouteLabel}</dd>
        </div>
        <div>
          <dt className="text-fg-subtle">Distance along route</dt>
          <dd className="text-fg">{alongRouteLabel}</dd>
        </div>
      </dl>
      {hazard.votes?.voters?.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-fg-subtle">Community votes</p>
          <ul className="mt-2 space-y-1.5">
            {hazard.votes.voters.map((voter) => (
              <li key={`${voter.id}-${voter.updatedAt}`} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-fg">{voter.fullName}</span>
                <span className="text-fg-muted">
                  {voter.value > 0 ? 'Confirmed' : 'Disputed'} · {formatReportedAt(voter.updatedAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-fg-muted">No community votes yet.</p>
      )}
      {mapsLink ? (
        <a
          href={mapsLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-[var(--rydo-cyan)] hover:underline"
        >
          Open in Google Maps
          <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
      ) : null}
    </div>
  );
}

function HazardRow({ hazard, expanded, onToggleExpand, onStatusAction, pending, variant, unit }) {
  const routeLink = buildRouteHazardLink(hazard);
  const isHidden = hazard.status === 'hidden';
  const isDesktop = variant === 'desktop';
  const fromRouteLabel = formatDistanceFromRoute(hazard.distanceFromRouteM, unit);

  const shellClass = isDesktop
    ? 'rounded-2xl border border-border bg-black/20 p-4'
    : 'rydo-bold-glass-row px-4 py-3.5';

  return (
    <div className={shellClass}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base" aria-hidden>
              {hazardTypeIcon(hazard.type)}
            </span>
            <p className="font-medium text-fg">{hazardTypeLabel(hazard.type)}</p>
            <HazardScoreBadge score={hazard.score} compact />
          </div>
          <p className="mt-1 text-sm text-fg-muted">
            {formatReportedAt(hazard.reportedAt)} · {hazard.reportedBy?.fullName || 'Unknown reporter'}
          </p>
          {routeLink ? (
            <Link to={routeLink} className="mt-1 block truncate text-sm text-[var(--rydo-cyan)] hover:underline">
              Route #{hazard.routeId}
              {hazard.routeTitle ? ` · ${hazard.routeTitle}` : ''}
            </Link>
          ) : (
            <p className="mt-1 text-sm text-fg-muted">Route #{hazard.routeId ?? '—'}</p>
          )}
          <p className="mt-1 text-xs text-fg-subtle">{formatVoteSummary(hazard.votes)}</p>
          {fromRouteLabel !== '—' ? (
            <p className="mt-1 text-xs text-fg-subtle">{fromRouteLabel}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <AdminStatusPill label={hazard.severity} />
          <AdminStatusPill label={hazard.status} />
          <UserVisibleIndicator visible={hazard.userVisible} />
        </div>
      </div>

      {!expanded && hazard.description ? (
        <p className="mt-2 line-clamp-2 text-sm text-fg-muted">{hazard.description}</p>
      ) : null}

      {expanded ? <HazardDetails hazard={hazard} unit={unit} /> : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {routeLink ? (
          <Link to={routeLink}>
            <Button size="sm" variant="neon" type="button">
              View on route
            </Button>
          </Link>
        ) : null}
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onStatusAction(hazard, isHidden ? 'active' : 'hidden')}
          disabled={pending}
        >
          {isHidden ? 'Reactivate' : 'Hide'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onToggleExpand} className="ml-auto">
          {expanded ? 'See less' : 'See more'}
          <ChevronDown className={cn('ml-1 h-4 w-4 transition-transform', expanded && 'rotate-180')} aria-hidden />
        </Button>
      </div>
    </div>
  );
}

export default function AdminHazardsPanel({ variant = 'desktop' }) {
  const [status, setStatus] = useState('');
  const [severity, setSeverity] = useState('');
  const [type, setType] = useState('');
  const [skip, setSkip] = useState(0);
  const [take, setTake] = useState(20);
  const [expandedId, setExpandedId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [banner, setBanner] = useState(null);

  const { hazards, pagination, isLoading, isError, error } = useAdminHazards({
    skip,
    take,
    status,
    severity,
    type,
  });
  const updateStatus = useUpdateHazardStatus();
  const { unit } = useFormatDistance();

  function resetPage() {
    setSkip(0);
  }

  const toolbar = (
    <AdminToolbar
      total={pagination.total}
      filters={
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <AdminFilterPills
              options={STATUS_FILTERS}
              value={status}
              onChange={(value) => {
                setStatus(value);
                resetPage();
              }}
            />
            <AdminFilterPills
              options={SEVERITY_FILTERS}
              value={severity}
              onChange={(value) => {
                setSeverity(value);
                resetPage();
              }}
            />
          </div>
          <AdminFilterPills
            options={TYPE_FILTERS}
            value={type}
            onChange={(value) => {
              setType(value);
              resetPage();
            }}
          />
        </div>
      }
    />
  );

  async function handleConfirm() {
    if (!confirm) return;
    try {
      await updateStatus.mutateAsync({ hazardId: confirm.hazard.id, status: confirm.nextStatus });
      setBanner({
        tone: 'success',
        message: confirm.nextStatus === 'hidden' ? 'Hazard hidden from users.' : 'Hazard reactivated.',
      });
      setConfirm(null);
    } catch (err) {
      setConfirm((prev) => ({ ...prev, error: err?.message || 'Action failed.' }));
    }
  }

  function requestStatusAction(hazard, nextStatus) {
    setConfirm({
      hazard,
      nextStatus,
      error: null,
    });
  }

  let body;
  if (isLoading) {
    body = <Loader />;
  } else if (isError) {
    body = <AdminErrorState message={error?.message || 'Failed to load hazards.'} />;
  } else if (hazards.length === 0) {
    body = <AdminEmptyState title="No hazards found" />;
  } else if (variant === 'mobile') {
    body = (
      <div className="space-y-2">
        {hazards.map((hazard) => (
          <HazardRow
            key={hazard.id}
            hazard={hazard}
            variant="mobile"
            expanded={expandedId === hazard.id}
            onToggleExpand={() => setExpandedId((prev) => (prev === hazard.id ? null : hazard.id))}
            onStatusAction={requestStatusAction}
            pending={updateStatus.isPending}
            unit={unit}
          />
        ))}
      </div>
    );
  } else {
    body = (
      <Card>
        <div className="space-y-3">
          {hazards.map((hazard) => (
            <HazardRow
              key={hazard.id}
              hazard={hazard}
              variant="desktop"
              expanded={expandedId === hazard.id}
              onToggleExpand={() => setExpandedId((prev) => (prev === hazard.id ? null : hazard.id))}
              onStatusAction={requestStatusAction}
              pending={updateStatus.isPending}
              unit={unit}
            />
          ))}
        </div>
        <AdminPagination
          className="mt-4"
          skip={skip}
          take={take}
          total={pagination.total}
          onPageChange={setSkip}
          onPageSizeChange={(value) => {
            setTake(value);
            resetPage();
          }}
        />
      </Card>
    );
  }

  const confirmTitle = confirm?.nextStatus === 'hidden' ? 'Hide hazard' : 'Reactivate hazard';
  const confirmMessage = confirm
    ? confirm.nextStatus === 'hidden'
      ? `Hide this ${hazardTypeLabel(confirm.hazard.type)} hazard from users?`
      : `Reactivate this ${hazardTypeLabel(confirm.hazard.type)} hazard for users?`
    : '';

  return (
    <>
      {toolbar}
      {banner ? (
        <AdminInlineBanner tone={banner.tone} message={banner.message} onDismiss={() => setBanner(null)} />
      ) : null}
      {body}
      {variant === 'mobile' && !isLoading && !isError && hazards.length > 0 ? (
        <AdminPagination
          skip={skip}
          take={take}
          total={pagination.total}
          onPageChange={setSkip}
          onPageSizeChange={(value) => {
            setTake(value);
            resetPage();
          }}
        />
      ) : null}
      <AdminConfirmModal
        open={confirm != null}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={confirm?.nextStatus === 'hidden' ? 'Hide' : 'Reactivate'}
        variant="primary"
        isPending={updateStatus.isPending}
        error={confirm?.error}
      />
    </>
  );
}
