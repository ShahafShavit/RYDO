import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { env } from '@/shared/config/env';
import { cn } from '@/shared/lib/cn';

const PULL_THRESHOLD = 72;
const MAX_PULL = 120;

const BoldScrollArea = forwardRef(function BoldScrollArea({ className, children, ...props }, ref) {
  const queryClient = useQueryClient();
  const scrollRef = useRef(null);
  const touchStartY = useRef(0);
  const pulling = useRef(false);
  const pullDistanceRef = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useImperativeHandle(ref, () => scrollRef.current);

  const setPull = useCallback((value) => {
    pullDistanceRef.current = value;
    setPullDistance(value);
  }, []);

  const runRefresh = useCallback(async () => {
    setRefreshing(true);
    setPull(PULL_THRESHOLD);
    try {
      await queryClient.refetchQueries({ type: 'active' });
    } finally {
      setRefreshing(false);
      setPull(0);
    }
  }, [queryClient, setPull]);

  useEffect(() => {
    if (!env.isNativeApp) return undefined;

    const el = scrollRef.current;
    if (!el) return undefined;

    const onTouchStart = (event) => {
      if (refreshing || el.scrollTop > 0) {
        pulling.current = false;
        return;
      }
      touchStartY.current = event.touches[0]?.clientY ?? 0;
      pulling.current = true;
    };

    const onTouchMove = (event) => {
      if (!pulling.current || refreshing || el.scrollTop > 0) {
        if (el.scrollTop > 0) {
          pulling.current = false;
          setPull(0);
        }
        return;
      }

      const currentY = event.touches[0]?.clientY ?? touchStartY.current;
      const delta = currentY - touchStartY.current;
      if (delta <= 0) {
        setPull(0);
        return;
      }

      event.preventDefault();
      setPull(Math.min(delta * 0.45, MAX_PULL));
    };

    const onTouchEnd = () => {
      if (!pulling.current) return;
      pulling.current = false;

      if (pullDistanceRef.current >= PULL_THRESHOLD && !refreshing) {
        void runRefresh();
        return;
      }

      setPull(0);
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [refreshing, runRefresh, setPull]);

  const showIndicator = env.isNativeApp && (pullDistance > 0 || refreshing);
  const readyToRefresh = pullDistance >= PULL_THRESHOLD || refreshing;

  return (
    <div className={cn('relative flex min-h-0 flex-1 flex-col', env.isNativeApp && 'rydo-bold-scroll-area')}>
      {showIndicator ? (
        <div
          className={cn('rydo-ptr-indicator', readyToRefresh && 'rydo-ptr-indicator--active')}
          style={{ height: `${Math.max(pullDistance, refreshing ? PULL_THRESHOLD : 0)}px` }}
          aria-hidden
        >
          <div className={cn('rydo-ptr-spinner', refreshing && 'rydo-ptr-spinner--spinning')} />
        </div>
      ) : null}
      <div
        ref={scrollRef}
        className={cn(className)}
        style={
          env.isNativeApp && pullDistance > 0 && !refreshing
            ? { transform: `translateY(${pullDistance}px)` }
            : undefined
        }
        {...props}
      >
        {children}
      </div>
    </div>
  );
});

export default BoldScrollArea;
