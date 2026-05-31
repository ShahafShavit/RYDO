import { Link } from 'react-router-dom';
import { ChevronRight, Sparkles } from 'lucide-react';
import { ROUTES } from '@/app/router/route-paths';
import Eyebrow from '@/shared/components/bold/Eyebrow';

function daysLeft(endDate) {
  if (!endDate) return null;
  const end = new Date(endDate).getTime();
  if (!Number.isFinite(end)) return null;
  return Math.max(0, Math.ceil((end - Date.now()) / 86400000));
}

export default function DashboardFeaturedChallengeCard({ card, pinnedChallengeInstanceId }) {
  if (!card) return null;

  const isModifier = card.kind === 'modifier';
  const isPinned =
    pinnedChallengeInstanceId != null && card.id != null && card.id === pinnedChallengeInstanceId;
  const left = daysLeft(card.endDate);

  return (
    <Link
      to={ROUTES.challenges}
      className="rydo-bold-glass-row flex items-stretch gap-3 p-3 transition hover:border-border-strong"
    >
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <Eyebrow className="inline-flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-[var(--rydo-amber)]" aria-hidden />
          {isModifier
            ? isPinned
              ? 'Pinned XP event'
              : 'Live XP event'
            : isPinned
              ? 'Pinned quest'
              : 'Featured quest'}
        </Eyebrow>
        <p className="mt-1 text-sm font-bold leading-snug">{card.title}</p>
        <p className="rydo-subtle mt-1 text-xs">
          {isModifier
            ? `+${card.bonusPercent}% ride XP`
            : `${Math.round(card.progressPercent ?? 0)}% · ${left != null ? `${left}d left` : ''}`}
        </p>
      </div>
      <ChevronRight className="h-[18px] w-[18px] shrink-0 self-center text-fg-subtle" aria-hidden />
    </Link>
  );
}
