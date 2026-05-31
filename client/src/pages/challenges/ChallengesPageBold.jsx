import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowLeft, Pin, PinOff, Sparkles } from 'lucide-react';
import AchievementList from '@/features/challenges/components/AchievementList';
import {
  useGamificationChallenges,
  useGamificationMe,
  usePinChallenge,
  useRecentXp,
} from '@/features/gamification/hooks/useGamification';
import ProgressRing from '@/shared/components/bold/viz/ProgressRing';
import BoldScreen from '@/shared/components/bold/BoldScreen';
import BoldScrollArea from '@/shared/components/bold/BoldScrollArea';
import DisplayTitle from '@/shared/components/bold/DisplayTitle';
import Eyebrow from '@/shared/components/bold/Eyebrow';
import IconButton from '@/shared/components/bold/IconButton';
import ChallengesPage from '@/pages/challenges/ChallengesPage';

function daysLeft(endDate) {
  if (!endDate) return null;
  const end = new Date(endDate).getTime();
  if (!Number.isFinite(end)) return null;
  const d = Math.ceil((end - Date.now()) / 86400000);
  return d > 0 ? d : 0;
}

function QuestCard({ quest, pinnedId, onPin, onUnpin }) {
  const left = daysLeft(quest.endDate);
  const isPinned = pinnedId === quest.id;
  return (
    <div className="rydo-panel p-4" id={quest.completedAt ? undefined : 'quests'}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Eyebrow>{quest.isFeatured ? 'Featured quest' : 'Quest'}</Eyebrow>
          <p className="mt-1 text-base font-bold leading-snug">{quest.title}</p>
          {left != null ? (
            <p className="rydo-subtle mt-1 text-xs">{left === 0 ? 'Ends today' : `${left} days left`}</p>
          ) : null}
        </div>
        <button
          type="button"
          className="rydo-iconbtn shrink-0"
          aria-label={isPinned ? 'Unpin from dashboard' : 'Pin to dashboard'}
          onClick={() => (isPinned ? onUnpin() : onPin(quest.id))}
        >
          {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
        </button>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-strong">
        <div
          className="h-full rounded-full bg-rydo-purple transition-all"
          style={{ width: `${Math.min(100, quest.progressPercent ?? 0)}%` }}
        />
      </div>
      <p className="rydo-subtle mt-2 text-xs">
        {Math.round(quest.currentValue ?? 0)} / {quest.targetValue} {quest.unit}
        {quest.completedAt ? ' · Complete' : ''}
      </p>
    </div>
  );
}

function ModifierCard({ mod, pinnedId, onPin, onUnpin }) {
  const isPinned = pinnedId === mod.id;
  return (
    <div className="rydo-bold-glass-row border-rydo-purple/30 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Eyebrow className="text-rydo-purple">XP modifier</Eyebrow>
          <p className="mt-1 text-base font-bold">{mod.title}</p>
          <p className="rydo-subtle mt-1 text-sm">+{mod.bonusPercent}% ride XP</p>
        </div>
        <button
          type="button"
          className="rydo-iconbtn shrink-0"
          aria-label={isPinned ? 'Unpin from dashboard' : 'Pin to dashboard'}
          onClick={() => (isPinned ? onUnpin() : onPin(mod.id))}
        >
          {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function ChallengesPageBoldMobile() {
  const { data: me, isLoading: meLoading } = useGamificationMe();
  const { data: ch, isLoading: chLoading } = useGamificationChallenges();
  const { data: xp } = useRecentXp(12);
  const pinMutation = usePinChallenge();
  const pinnedId = me?.pinnedChallengeInstanceId ?? null;

  const progress = (me?.levelProgressPercent ?? 0) / 100;
  const quests = ch?.quests ?? [];
  const modifiers = ch?.modifiers ?? [];

  const handlePin = (id) => pinMutation.mutate(id);
  const handleUnpin = () => pinMutation.mutate(null);

  if (meLoading || chLoading) {
    return (
      <BoldScreen className="animate-pulse">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-5">
          <div className="mt-8 h-24 shrink-0 rounded-2xl bg-surface-strong" />
        </div>
      </BoldScreen>
    );
  }

  return (
    <BoldScreen>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center gap-3 px-5 pb-1 pt-1">
          <IconButton icon={ArrowLeft} aria-label="Back" onClick={() => window.history.back()} />
          <DisplayTitle as="div" size="sm" className="flex-1 text-xl">
            Challenges
          </DisplayTitle>
          <Sparkles className="h-5 w-5 text-[var(--rydo-amber)]" aria-hidden />
        </header>

        <BoldScrollArea className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 pt-3 [&>*]:shrink-0">
          <div className="rydo-bold-glass-row flex items-center gap-4 p-4">
            <ProgressRing value={progress} size={88} strokeWidth={6}>
              <span className="rydo-stat-hero text-[34px] leading-none">{me?.level ?? 1}</span>
            </ProgressRing>
            <div className="min-w-0 flex-1">
              <Eyebrow>Level {me?.level ?? 1}</Eyebrow>
              <p className="mt-1 text-sm font-semibold">
                {me?.xpIntoLevel ?? 0} / {(me?.xpIntoLevel ?? 0) + (me?.xpToNextLevel ?? 0)} XP
              </p>
              <p className="rydo-subtle mt-1 text-xs">{me?.totalXp ?? 0} XP total</p>
            </div>
          </div>

          {modifiers.map((m) => (
            <ModifierCard
              key={m.id}
              mod={m}
              pinnedId={pinnedId}
              onPin={handlePin}
              onUnpin={handleUnpin}
            />
          ))}

          {quests.map((q) => (
            <QuestCard
              key={q.id}
              quest={q}
              pinnedId={pinnedId}
              onPin={handlePin}
              onUnpin={handleUnpin}
            />
          ))}

          <div className="rydo-panel p-4">
            <Eyebrow>Achievements</Eyebrow>
            <AchievementList achievements={ch?.achievements} />
          </div>

          {xp?.items?.length ? (
            <div className="rydo-panel p-4">
              <Eyebrow>Recent XP</Eyebrow>
              <ul className="mt-2 space-y-2">
                {xp.items.map((row) => (
                  <li key={row.id} className="flex justify-between text-sm">
                    <span className="rydo-subtle truncate pr-2">{row.description}</span>
                    <span className="rydo-tnum font-semibold text-rydo-green">+{row.amount}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </BoldScrollArea>
      </div>
    </BoldScreen>
  );
}

export default function ChallengesPageBold() {
  const { hash } = useLocation();
  useMemo(() => {
    if (!hash) return;
    const el = document.querySelector(hash);
    el?.scrollIntoView?.({ behavior: 'smooth' });
  }, [hash]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col md:hidden">
        <ChallengesPageBoldMobile />
      </div>
      <div className="hidden min-h-0 flex-1 flex-col overflow-y-auto p-6 md:flex">
        <ChallengesPage />
      </div>
    </div>
  );
}
