import { NavLink } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { dashboardNavigation, adminNavigation } from '@/shared/config/navigation';
import { ROUTES } from '@/app/router/route-paths';
import AppLogo from '@/shared/components/navigation/AppLogo';
import Button from '@/shared/components/ui/button/Button';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';

const MotionDiv = motion.div;
const MotionButton = motion.button;

export default function MobileNavbar({ isAdminLayout }) {
    const [isOpen, setIsOpen] = useState(false);
    const { logout, isAdmin } = useAuth();
    const navItems = isAdminLayout ? adminNavigation : dashboardNavigation;
    const reducedMotion = useReducedMotion();
    const firstLinkRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const t = window.setTimeout(() => {
            firstLinkRef.current?.focus();
        }, reducedMotion ? 0 : 40);
        return () => window.clearTimeout(t);
    }, [isOpen, reducedMotion]);

    useEffect(() => {
        if (!isOpen) return;
        function onKeyDown(e) {
            if (e.key === 'Escape') setIsOpen(false);
        }
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen]);

    const tFast = { duration: reducedMotion ? 0.09 : 0.14, ease: [0.32, 0.72, 0, 1] };

    return (
        <>
            <div className="md:hidden sticky top-0 z-50 w-full border-b border-border bg-black/40 backdrop-blur-xl">
                <div className="flex items-center justify-between px-4 py-4">
                    <div className="flex items-center gap-3">
                        <span className={`h-3 w-3 rounded-full ${isAdminLayout ? 'bg-rydo-purple shadow-[0_0_18px_color-mix(in_srgb,var(--rydo-purple)_75%,transparent)]' : 'bg-rydo-green shadow-[0_0_18px_color-mix(in_srgb,var(--rydo-green)_65%,transparent)]'}`} />
                        <AppLogo />
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsOpen((o) => !o)}
                        className="text-fg p-2 rounded-lg transition-colors hover:bg-surface-strong"
                        aria-expanded={isOpen}
                        aria-controls="mobile-nav-panel"
                        aria-label={isOpen ? 'Close menu' : 'Open menu'}
                    >
                        {isOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>

                <AnimatePresence>
                    {isOpen && (
                        <MotionDiv
                            id="mobile-nav-panel"
                            role="navigation"
                            aria-label="Main"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={tFast}
                            className={`absolute top-full left-0 w-full border-b border-border p-4 flex flex-col gap-2 shadow-[0_24px_48px_rgba(0,0,0,0.45)] ${isAdminLayout ? 'bg-[var(--rydo-bg-deep)]' : 'bg-[var(--rydo-bg-deep)]'}`}
                        >
                            {navItems.map((item, index) => (
                                <NavLink
                                    key={item.label}
                                    ref={index === 0 ? firstLinkRef : undefined}
                                    to={item.to}
                                    onClick={() => setIsOpen(false)}
                                    className={({ isActive }) =>
                                        `rounded-2xl px-4 py-3 text-sm transition-[background-color,color,box-shadow] duration-300 ease-out ${isActive && !item.to.includes('?upload=true')
                                            ? 'bg-rydo-purple/18 text-fg shadow-[0_0_24px_color-mix(in_srgb,var(--rydo-purple)_18%,transparent)]'
                                            : 'text-fg-muted hover:bg-surface hover:text-fg'
                                        }`
                                    }
                                >
                                    {item.label}
                                </NavLink>
                            ))}
                            {!isAdminLayout && isAdmin && (
                                <NavLink to={ROUTES.admin} onClick={() => setIsOpen(false)} className="w-full block">
                                    <Button variant="secondary" className="w-full justify-center">
                                        Admin Mode
                                    </Button>
                                </NavLink>
                            )}
                            {isAdminLayout && (
                                <NavLink to={ROUTES.dashboard} onClick={() => setIsOpen(false)} className="w-full block">
                                    <Button variant="secondary" className="w-full justify-center">
                                        Exit Admin
                                    </Button>
                                </NavLink>
                            )}
                            <div className="mt-4 pt-4 border-t border-border">
                                <button
                                    type="button"
                                    onClick={() => {
                                        logout();
                                        setIsOpen(false);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm text-red-400 hover:bg-surface transition-colors duration-200"
                                >
                                    <LogOut size={18} />
                                    Logout
                                </button>
                            </div>
                        </MotionDiv>
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <MotionButton
                        type="button"
                        aria-hidden
                        tabIndex={-1}
                        className="fixed inset-0 z-40 md:hidden bg-black/45 cursor-default border-0 p-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={tFast}
                        onClick={() => setIsOpen(false)}
                    />
                )}
            </AnimatePresence>
        </>
    );
}
