import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Settings, LogOut, Inbox } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ROUTES } from '@/app/router/route-paths';
import { generatePath } from 'react-router-dom';
import { cn } from '@/shared/lib/cn';
import UserAvatar from '@/shared/components/user/UserAvatar';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { useInboxSummary } from '@/features/social/hooks/useInboxSummary';

const MotionDiv = motion.div;

export default function UserProfileDropdown() {
    const { user, logout } = useAuth();
    const { data: inboxSummary } = useInboxSummary();
    const unreadInbox = inboxSummary?.unreadCount ?? 0;
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const reducedMotion = useReducedMotion();

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        function onKeyDown(e) {
            if (e.key === 'Escape') setIsOpen(false);
        }
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen]);

    const handleLogout = () => {
        logout();
    };

    const tFast = { duration: reducedMotion ? 0.09 : 0.14, ease: [0.32, 0.72, 0, 1] };

    const hasUnread = unreadInbox > 0;
    const showBadgeOnAvatar = !isOpen && hasUnread;
    const showBadgeOnInbox = isOpen && hasUnread;

    const unreadBadgeEl = (
        <span
            className="inline-flex min-h-[1.125rem] min-w-[1.125rem] shrink-0 items-center justify-center rounded-full bg-rydo-purple px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-[var(--rydo-bg-deep)]"
            aria-hidden
        >
            {unreadInbox > 99 ? '99+' : unreadInbox}
        </span>
    );

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <AnimatePresence>
                {isOpen && (
                    <MotionDiv
                        className="absolute bottom-full left-0 z-(--rydo-z-sticky) mb-2 w-full origin-bottom rounded-2xl border border-border-strong bg-(--rydo-bg-deep) p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.28),inset_0_1px_0_color-mix(in_srgb,var(--rydo-text)_10%,transparent)]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={tFast}
                        role="menu"
                        aria-label="Account"
                    >
                        <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                                setIsOpen(false);
                                if (user?.id) navigate(generatePath(ROUTES.userProfile, { userId: String(user.id) }));
                            }}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-fg/90 transition-colors hover:bg-surface-strong hover:text-fg"
                        >
                            <User className="h-4 w-4 shrink-0 text-fg-muted" />
                            Profile
                        </button>
                        <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                                setIsOpen(false);
                                navigate(ROUTES.inbox);
                            }}
                            className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-fg/90 transition-colors hover:bg-surface-strong hover:text-fg"
                        >
                            <span className="flex items-center gap-2.5 min-w-0">
                                <Inbox className="h-4 w-4 shrink-0 text-fg-muted" />
                                Inbox
                            </span>
                            {showBadgeOnInbox ? unreadBadgeEl : null}
                        </button>
                        <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                                setIsOpen(false);
                                navigate(ROUTES.settings);
                            }}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-fg/90 transition-colors hover:bg-surface-strong hover:text-fg"
                        >
                            <Settings className="h-4 w-4 shrink-0 text-fg-muted" />
                            Settings
                        </button>
                        <div className="my-1 h-px w-full bg-border" />
                        <button
                            type="button"
                            role="menuitem"
                            onClick={handleLogout}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-[#FF5C5C] transition-colors hover:bg-[#FF5C5C]/12 hover:text-[#FF5C5C]"
                        >
                            <LogOut className="h-4 w-4 shrink-0" />
                            Logout
                        </button>
                    </MotionDiv>
                )}
            </AnimatePresence>

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-haspopup="menu"
                aria-label={
                    hasUnread
                        ? `Account menu, ${unreadInbox > 99 ? '99+' : unreadInbox} unread inbox items`
                        : 'Account menu'
                }
                className={cn(
                    "flex w-full items-center justify-between rounded-2xl border border-border bg-surface p-3 text-left transition-colors duration-300 hover:bg-surface-strong",
                    isOpen && "bg-surface-strong border-border-strong"
                )}
            >
                <div className="flex items-center min-w-0 gap-3">
                    <span className="relative shrink-0">
                        <UserAvatar
                            avatarUrl={user?.avatarUrl}
                            displayName={user?.fullName}
                            sizeClass="h-9 w-9"
                            textClass="text-xs"
                        />
                        {showBadgeOnAvatar ? (
                            <span className="absolute -right-1 -top-1">{unreadBadgeEl}</span>
                        ) : null}
                    </span>
                    <div className="min-w-0 pr-1">
                        <h3 className="truncate text-sm font-medium text-fg">{user?.fullName || 'User'}</h3>
                        <p className="truncate text-xs text-fg-subtle">{user?.email || 'user@example.com'}</p>
                    </div>
                </div>
            </button>
        </div>
    );
}
