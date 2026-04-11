import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ROUTES } from '@/app/router/route-paths';
import { clubsApi } from '@/features/clubs/api/clubs-api';
import Button from '@/shared/components/ui/button/Button';
import FormField from '@/shared/components/ui/form-field/FormField';
import Input from '@/shared/components/ui/input/Input';
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
          <p className="text-xs uppercase tracking-[0.16em] text-white/42">Plan</p>
          <h2 className="mt-2 text-xl font-semibold">Schedule a ride</h2>
          <p className="mt-2 text-sm text-white/64">
            Create a personal ride on this route, or schedule it for a club you belong to.
          </p>
        </>
      ) : (
        <p className="text-sm text-white/64">
          Create a personal ride on this route, or schedule it for a club you belong to.
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Ride type">
        <button
          type="button"
          className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
            mode === 'personal'
              ? 'bg-[#7B5CFF]/22 text-white shadow-[0_0_20px_rgba(123,92,255,0.2)]'
              : 'bg-white/5 text-white/72 hover:bg-white/10'
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
              ? 'bg-[#7B5CFF]/22 text-white shadow-[0_0_20px_rgba(123,92,255,0.2)]'
              : 'bg-white/5 text-white/72 hover:bg-white/10'
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
            <p className="rounded-2xl border border-[#21F1A8]/35 bg-[#21F1A8]/10 px-4 py-3 text-sm text-[#b8ffe8]">
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
            {createPersonal.isPending ? 'Scheduling…' : 'Schedule personal ride'}
          </Button>
        </form>
      ) : memberClubs.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/72">
          <p>You need to join a club before scheduling a club ride.</p>
          <Link to={ROUTES.clubs} className="mt-3 inline-block text-[#7B5CFF] hover:underline">
            Browse clubs
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4" onFocus={() => setScheduleBanner(null)}>
          {scheduleBanner && mode === 'club' ? (
            <p className="rounded-2xl border border-[#21F1A8]/35 bg-[#21F1A8]/10 px-4 py-3 text-sm text-[#b8ffe8]">
              {scheduleBanner}
            </p>
          ) : null}
          <FormField label="Club">
            <select
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-[#7B5CFF]/60 focus:outline-none"
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
            <p className="text-sm text-white/56">Choose a club to continue.</p>
          )}
        </div>
      )}
    </>
  );
}
