import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Settings, LogOut } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ROUTES } from '@/app/router/route-paths';
import { generatePath } from 'react-router-dom';
import { cn } from '@/shared/lib/cn';
import UserAvatar from '@/shared/components/user/UserAvatar';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';

const MotionDiv = motion.div;

export default function UserProfileDropdown() {
    const { user, logout } = useAuth();
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
                className={cn(
                    "flex w-full items-center justify-between rounded-2xl border border-border bg-surface p-3 text-left transition-colors duration-300 hover:bg-surface-strong",
                    isOpen && "bg-surface-strong border-border-strong"
                )}
            >
                <div className="flex items-center min-w-0 gap-3">
                    <UserAvatar
                        avatarUrl={user?.avatarUrl}
                        displayName={user?.fullName}
                        sizeClass="h-9 w-9"
                        textClass="text-xs"
                    />
                    <div className="min-w-0 pr-1">
                        <h3 className="truncate text-sm font-medium text-fg">{user?.fullName || 'User'}</h3>
                        <p className="truncate text-xs text-fg-subtle">{user?.email || 'user@example.com'}</p>
                    </div>
                </div>
            </button>
        </div>
    );
}
