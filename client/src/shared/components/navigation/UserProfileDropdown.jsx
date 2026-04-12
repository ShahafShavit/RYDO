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
                        className="absolute bottom-full left-0 mb-2 w-full rounded-2xl rydo-glass border border-white/8 p-1.5 shadow-xl z-50 origin-bottom"
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
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-white/72 transition-colors hover:bg-white/5 hover:text-white"
                        >
                            <User className="w-4 h-4" />
                            Profile
                        </button>
                        <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                                setIsOpen(false);
                                navigate(ROUTES.settings);
                            }}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-white/72 transition-colors hover:bg-white/5 hover:text-white"
                        >
                            <Settings className="w-4 h-4" />
                            Settings
                        </button>
                        <div className="my-1 h-px w-full bg-white/8" />
                        <button
                            type="button"
                            role="menuitem"
                            onClick={handleLogout}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-[#FF5C5C]/90 transition-colors hover:bg-[#FF5C5C]/10 hover:text-[#FF5C5C]"
                        >
                            <LogOut className="w-4 h-4" />
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
                    "flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/5 p-3 text-left transition-colors duration-300 hover:bg-white/10",
                    isOpen && "bg-white/10 border-white/20"
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
                        <h3 className="truncate text-sm font-medium text-white">{user?.fullName || 'User'}</h3>
                        <p className="truncate text-xs text-white/45">{user?.email || 'user@example.com'}</p>
                    </div>
                </div>
            </button>
        </div>
    );
}
