import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ROUTES } from '@/app/router/route-paths';
import { clubsApi } from '@/features/clubs/api/clubs-api';
import Button from '@/shared/components/ui/button/Button';
import FormField from '@/shared/components/ui/form-field/FormField';
import Input from '@/shared/components/ui/input/Input';
import { modalControlClass } from '@/shared/components/ui/modal/ModalPrimitives';
import CreateRideForm from '@/features/rides/components/CreateRideForm';
import { useCreatePersonalRide } from '@/features/rides/hooks/useCreatePersonalRide';

function defaultScheduledLocal() {
  const d = new Date(Date.now() + 86400000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * @param {{ routeId: number, routeTitle: string, headless?: boolean }} props
 */
export function ScheduleRideFromRoutePanel({ routeId, routeTitle, headless = false }) {
  const [mode, setMode] = useState('personal');
  const [scheduleBanner, setScheduleBanner] = useState(null);
  const [clubId, setClubId] = useState('');
  const [name, setName] = useState(() => (routeTitle ? `${routeTitle} — ride` : ''));
  const [description, setDescription] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('20');
  const [scheduledLocal, setScheduledLocal] = useState(defaultScheduledLocal);

  const { data: clubs = [] } = useQuery({
    queryKey: ['clubs', 'list'],
    queryFn: () => clubsApi.list(),
  });

  const memberClubs = useMemo(
    () => clubs.filter((c) => c.myRole === 'member' || c.myRole === 'admin'),
    [clubs],
  );

  const createPersonal = useCreatePersonalRide();

  const handlePersonalSubmit = (e) => {
    e.preventDefault();
    if (!routeId || !name.trim()) return;
    const scheduledDate = new Date(scheduledLocal);
    if (Number.isNaN(scheduledDate.getTime())) return;
    createPersonal.mutate(
      {
        name: name.trim(),
        description: description.trim(),
        routeId: Number(routeId),
        maxParticipants: Math.max(1, Number(maxParticipants) || 20),
        scheduledDate: scheduledDate.toISOString(),
      },
      {
        onSuccess: () => {
          setScheduleBanner('Personal ride scheduled. View it under My rides.');
          setDescription('');
          setScheduledLocal(defaultScheduledLocal());
        },
      },
    );
  };

  const rid = Number(routeId);
  const defaultClubName = memberClubs.find((c) => String(c.id) === clubId)?.name;

  return (
    <>
      {!headless ? (
        <>
          <p className="text-xs uppercase tracking-[0.16em] text-fg-subtle">Plan</p>
          <h2 className="mt-2 text-xl font-semibold">Ride!</h2>
        </>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Ride type">
        <button
          type="button"
          className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
            mode === 'personal'
              ? 'bg-rydo-purple/22 text-fg shadow-[0_0_20px_color-mix(in_srgb,var(--rydo-purple)_20%,transparent)]'
              : 'bg-surface text-fg-muted hover:bg-surface-strong'
          }`}
          onClick={() => {
            setMode('personal');
            setScheduleBanner(null);
          }}
        >
          Personal
        </button>
        <button
          type="button"
          className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
            mode === 'club'
              ? 'bg-rydo-purple/22 text-fg shadow-[0_0_20px_color-mix(in_srgb,var(--rydo-purple)_20%,transparent)]'
              : 'bg-surface text-fg-muted hover:bg-surface-strong'
          }`}
          onClick={() => {
            setMode('club');
            setScheduleBanner(null);
          }}
        >
          Club
        </button>
      </div>

      {mode === 'personal' ? (
        <form
          onSubmit={handlePersonalSubmit}
          className="mt-6 space-y-4"
          onFocus={() => setScheduleBanner(null)}
        >
          {scheduleBanner && mode === 'personal' ? (
            <p className="rounded-2xl border border-rydo-green/35 bg-rydo-green/10 px-4 py-3 text-sm text-rydo-green">
              {scheduleBanner}
            </p>
          ) : null}
          <FormField label="Ride name">
            <Input name="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </FormField>
          <FormField label="Description">
            <Input name="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </FormField>
          <FormField label="Date and time">
            <Input
              name="scheduledDate"
              type="datetime-local"
              value={scheduledLocal}
              onChange={(e) => setScheduledLocal(e.target.value)}
              required
            />
          </FormField>
          <FormField label="Max participants">
            <Input
              name="maxParticipants"
              type="number"
              min={1}
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(e.target.value)}
            />
          </FormField>
          {createPersonal.isError ? (
            <p className="text-sm text-red-400">{createPersonal.error?.message || 'Could not create ride.'}</p>
          ) : null}
          <Button type="submit" variant="neon" disabled={createPersonal.isPending || !rid}>
            {createPersonal.isPending ? 'Riding…' : 'Ride!'}
          </Button>
        </form>
      ) : memberClubs.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-4 text-sm text-fg-muted">
          <p>You need to join a club before scheduling a club ride.</p>
          <Link to={ROUTES.clubs} className="mt-3 inline-block text-rydo-purple hover:underline">
            Browse clubs
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4" onFocus={() => setScheduleBanner(null)}>
          {scheduleBanner && mode === 'club' ? (
            <p className="rounded-2xl border border-rydo-green/35 bg-rydo-green/10 px-4 py-3 text-sm text-rydo-green">
              {scheduleBanner}
            </p>
          ) : null}
          <FormField label="Club">
            <select
              className={modalControlClass}
              value={clubId}
              onChange={(e) => setClubId(e.target.value)}
              required
            >
              <option value="">Select a club</option>
              {memberClubs.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>
          {clubId ? (
            <CreateRideForm
              clubId={Number(clubId)}
              clubName={defaultClubName}
              embedded
              fixedRouteId={rid}
              defaultName={routeTitle ? `${routeTitle} — club ride` : ''}
              onSuccess={() => {
                setClubId('');
                setScheduleBanner('Club ride scheduled. Members can join from the ride page or My rides.');
              }}
            />
          ) : (
            <p className="text-sm text-fg-muted">Choose a club to continue.</p>
          )}
        </div>
      )}
    </>
  );
}
