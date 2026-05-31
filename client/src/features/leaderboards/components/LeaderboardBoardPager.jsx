import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LEADERBOARD_BOARD_IDS,
  LEADERBOARD_BOARD_CONFIG,
  isValidLeaderboardBoardId,
} from '@/features/leaderboards/leaderboard-boards';
import Eyebrow from '@/shared/components/bold/Eyebrow';
import LeaderboardBoardPanel from '@/features/leaderboards/components/LeaderboardBoardPanel';
import { useLeaderboardConfetti } from '@/features/leaderboards/hooks/useLeaderboardConfetti';
import { cn } from '@/shared/lib/cn';

export default function LeaderboardBoardPager({
  data,
  formatKm,
  formatElevation,
  currentUserId,
  initialBoardId,
  compact = false,
  maxListRows,
  className,
  showYourStanding = false,
}) {
  const scrollerRef = useRef(null);
  const panelRefs = useRef([]);
  const programmaticScrollRef = useRef(false);
  const scrollReleaseTimerRef = useRef(null);
  const [activeBoard, setActiveBoard] = useState(() => {
    if (isValidLeaderboardBoardId(initialBoardId)) return initialBoardId;
    return LEADERBOARD_BOARD_IDS[2] ?? LEADERBOARD_BOARD_IDS[0];
  });

  const releaseProgrammaticScroll = useCallback(() => {
    programmaticScrollRef.current = false;
    if (scrollReleaseTimerRef.current) {
      window.clearTimeout(scrollReleaseTimerRef.current);
      scrollReleaseTimerRef.current = null;
    }
  }, []);

  const scrollToBoard = useCallback(
    (boardId) => {
      const idx = LEADERBOARD_BOARD_IDS.indexOf(boardId);
      if (idx < 0 || !scrollerRef.current) return;
      const panel = panelRefs.current[idx];
      if (!panel) return;

      programmaticScrollRef.current = true;
      setActiveBoard(boardId);
      scrollerRef.current.scrollTo({ left: panel.offsetLeft, behavior: 'smooth' });

      if (scrollReleaseTimerRef.current) {
        window.clearTimeout(scrollReleaseTimerRef.current);
      }
      scrollReleaseTimerRef.current = window.setTimeout(releaseProgrammaticScroll, 500);
    },
    [releaseProgrammaticScroll],
  );

  useEffect(() => {
    if (!isValidLeaderboardBoardId(initialBoardId)) return;
    scrollToBoard(initialBoardId);
  }, [initialBoardId, scrollToBoard]);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return undefined;

    const onScrollEnd = () => {
      if (programmaticScrollRef.current) {
        releaseProgrammaticScroll();
      }
    };
    root.addEventListener('scrollend', onScrollEnd);

    const observer = new IntersectionObserver(
      (entries) => {
        if (programmaticScrollRef.current) return;

        let best = null;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (!best || entry.intersectionRatio > best.intersectionRatio) {
            best = entry;
          }
        }
        if (best?.target?.dataset?.boardId) {
          setActiveBoard(best.target.dataset.boardId);
        }
      },
      { root, threshold: [0.55, 0.75, 0.9] },
    );

    for (const el of panelRefs.current) {
      if (el) observer.observe(el);
    }
    return () => {
      root.removeEventListener('scrollend', onScrollEnd);
      observer.disconnect();
      releaseProgrammaticScroll();
    };
  }, [data, releaseProgrammaticScroll]);

  useLeaderboardConfetti({
    enabled: showYourStanding,
    data,
    currentUserId,
    activeBoard,
  });

  const activeCfg = LEADERBOARD_BOARD_CONFIG[activeBoard];

  return (
    <div className={cn('min-w-0', className)}>
      <div className="mb-2 text-center">
        <Eyebrow>{activeCfg?.title}</Eyebrow>
        <p className="rydo-subtle mt-0.5 text-[11px] font-semibold">{activeCfg?.subtitle}</p>
      </div>

      <div
        ref={scrollerRef}
        className={cn(
          'flex overflow-x-auto snap-x snap-mandatory',
          '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
          'touch-pan-x',
        )}
        aria-label="Leaderboard categories"
      >
        {LEADERBOARD_BOARD_IDS.map((boardId, idx) => (
          <div
            key={boardId}
            ref={(el) => {
              panelRefs.current[idx] = el;
            }}
            data-board-id={boardId}
            className="w-full shrink-0 snap-center px-0.5"
          >
            <LeaderboardBoardPanel
              boardId={boardId}
              rows={data?.[boardId] ?? []}
              formatKm={formatKm}
              formatElevation={formatElevation}
              currentUserId={currentUserId}
              compact={compact}
              maxListRows={maxListRows}
              showTitle={false}
              showYourStanding={showYourStanding}
            />
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5" role="tablist" aria-label="Board categories">
        {LEADERBOARD_BOARD_IDS.map((boardId) => {
          const bcfg = LEADERBOARD_BOARD_CONFIG[boardId];
          const Icon = bcfg.Icon;
          const isActive = activeBoard === boardId;
          return (
            <button
              key={boardId}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={bcfg.subtitle}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full border transition',
                isActive
                  ? 'border-rydo-purple/50 bg-rydo-purple/15 text-fg'
                  : 'border-border bg-surface-strong/60 text-fg-subtle',
              )}
              onClick={() => scrollToBoard(boardId)}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
            </button>
          );
        })}
      </div>
    </div>
  );
}
