import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { ROUTES } from '@/app/router/route-paths';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  LEADERBOARD_BOARD_IDS,
  LEADERBOARD_BOARD_CONFIG,
  leaderboardRankRowClass,
} from '@/features/leaderboards/leaderboard-boards';
import Eyebrow from '@/shared/components/bold/Eyebrow';
import DisplayTitle from '@/shared/components/bold/DisplayTitle';
import IconButton from '@/shared/components/bold/IconButton';
import BoldScreen from '@/shared/components/bold/BoldScreen';
import UserAvatar from '@/shared/components/user/UserAvatar';
import { cn } from '@/shared/lib/cn';

const LB_RING = {
  1: 'rgba(240,178,74,0.95)',
  2: 'rgba(195,205,215,0.9)',
  3: 'rgba(186,124,72,0.95)',
};

function formatValue(row, formatKm, formatElevation) {
  if (row.unit === 'km') return formatKm(row.value, 1);
  if (row.unit === 'm') return formatElevation(row.value, 0);
  if (row.unit === 'rides' || row.unit === 'routes') return String(Math.round(row.value));
  return String(row.value);
}

function PodiumCol({ row, lift, formatKm, formatElevation, currentUserId }) {
  const ring = LB_RING[row.rank];
  const isMe = currentUserId != null && Number(row.userId) === Number(currentUserId);
  const label = isMe ? 'You' : (row.displayName || '').split(' ')[0];

  return (
    <div className="flex flex-col items-center gap-2" style={{ paddingBottom: lift }}>
      <div className="relative">
        <div
          className="rounded-full"
          style={{
            boxShadow: `0 0 0 2.5px ${ring}, 0 0 24px ${ring.replace('0.9', '0.4').replace('0.95', '0.4')}`,
          }}
        >
          <UserAvatar
            avatarUrl={row.avatarUrl}
            displayName={row.displayName}
            sizeClass={row.rank === 1 ? 'h-[60px] w-[60px]' : 'h-[50px] w-[50px]'}
            textClass={row.rank === 1 ? 'text-xl' : 'text-base'}
          />
        </div>
        <span
          className="absolute -bottom-1.5 left-1/2 flex h-[22px] w-[22px] -translate-x-1/2 items-center justify-center rounded-full bg-[#141414] text-xs font-extrabold"
          style={{ boxShadow: `0 0 0 2px ${ring}`, color: ring }}
        >
          {row.rank}
        </span>
      </div>
      <div className="mt-1 max-w-[96px] text-center">
        <p className="truncate text-xs font-bold">{label}</p>
        <p
          className="rydo-tnum mt-0.5 bg-gradient-to-r from-[var(--rydo-green-bright)] to-rydo-purple bg-clip-text text-[13px] font-extrabold text-transparent"
        >
          {formatValue(row, formatKm, formatElevation)}
        </p>
      </div>
    </div>
  );
}

export default function LeaderboardsPageBold({ data, formatKm, formatElevation }) {
  const { user } = useAuth();
  const [activeBoard, setActiveBoard] = useState(LEADERBOARD_BOARD_IDS[2] ?? LEADERBOARD_BOARD_IDS[0]);
  const cfg = LEADERBOARD_BOARD_CONFIG[activeBoard];
  const rows = data?.[activeBoard] ?? [];
  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);

  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;

  return (
    <BoldScreen>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-5 pb-1 pt-1">
          <IconButton icon={Trophy} className="text-[var(--rydo-amber)]" aria-label="Leaderboards" />
          <div className="min-w-0 flex-1">
            <Eyebrow>Community</Eyebrow>
            <DisplayTitle as="div" size="sm" className="mt-0.5 text-xl">
              Leaderboards
            </DisplayTitle>
          </div>
        </div>

        <div className="rydo-chiprow px-5 pt-3">
          {LEADERBOARD_BOARD_IDS.map((boardId) => {
            const bcfg = LEADERBOARD_BOARD_CONFIG[boardId];
            const Icon = bcfg.Icon;
            return (
              <button
                key={boardId}
                type="button"
                className={cn('rydo-chip', activeBoard === boardId && 'rydo-chip-on')}
                onClick={() => setActiveBoard(boardId)}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {bcfg.subtitle}
              </button>
            );
          })}
        </div>

        <div className="px-5 pt-4 text-center">
          <Eyebrow>{cfg.title}</Eyebrow>
        </div>

        {podiumOrder.length >= 3 ? (
          <div className="flex items-end justify-center gap-1.5 px-4 pt-3.5">
            <PodiumCol row={top3[1]} lift={18} formatKm={formatKm} formatElevation={formatElevation} currentUserId={user?.id} />
            <PodiumCol row={top3[0]} lift={0} formatKm={formatKm} formatElevation={formatElevation} currentUserId={user?.id} />
            <PodiumCol row={top3[2]} lift={26} formatKm={formatKm} formatElevation={formatElevation} currentUserId={user?.id} />
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 pb-4 pt-4">
          {rest.map((row) => {
            const isMe = user?.id != null && Number(row.userId) === Number(user.id);
            const accent = leaderboardRankRowClass(row.rank);
            return (
              <Link
                key={`${row.userId}-${row.rank}`}
                to={ROUTES.userProfile.replace(':userId', String(row.userId))}
                className={cn(
                  'rydo-panel flex items-center gap-3 px-3.5 py-2.5 no-underline',
                  isMe && 'border-transparent bg-gradient-to-r from-[rgba(33,241,168,0.12)] to-[rgba(123,92,255,0.16)]',
                  !isMe && accent,
                )}
              >
                <span className="rydo-tnum w-5 text-center text-sm font-extrabold text-fg-subtle">
                  {row.rank}
                </span>
                <UserAvatar avatarUrl={row.avatarUrl} displayName={row.displayName} sizeClass="h-9 w-9" textClass="text-xs" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-fg">
                    {isMe ? 'You' : row.displayName}
                  </p>
                </div>
                <span className="rydo-tnum text-sm font-bold text-fg">
                  {formatValue(row, formatKm, formatElevation)}
                </span>
              </Link>
            );
          })}
          {rows.length === 0 ? (
            <p className="rydo-subtle px-2 text-sm">No data yet.</p>
          ) : null}
        </div>
      </div>
    </BoldScreen>
  );
}
