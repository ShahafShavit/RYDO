import { NavLink } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
import { useState } from 'react';
import { dashboardNavigation, adminNavigation } from '@/shared/config/navigation';
import { ROUTES } from '@/app/router/route-paths';
import AppLogo from '@/shared/components/navigation/AppLogo';
import Button from '@/shared/components/ui/button/Button';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function MobileNavbar({ isAdminLayout }) {
    const [isOpen, setIsOpen] = useState(false);
    const { logout, isAdmin } = useAuth();
    const navItems = isAdminLayout ? adminNavigation : dashboardNavigation;

    return (
        <div className="md:hidden sticky top-0 z-50 w-full border-b border-white/8 bg-black/40 backdrop-blur-2xl">
            <div className="flex items-center justify-between px-4 py-4">
                <div className="flex items-center gap-3">
                    <span className={`h-3 w-3 rounded-full ${isAdminLayout ? 'bg-[#7B5CFF] shadow-[0_0_18px_rgba(123,92,255,0.75)]' : 'bg-[#21F1A8] shadow-[0_0_18px_rgba(33,241,168,0.65)]'}`} />
                    <AppLogo />
                </div>
                <button onClick={() => setIsOpen(!isOpen)} className="text-white p-2" aria-label="Toggle Menu">
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 w-full bg-[#171717] border-b border-white/8 p-4 flex flex-col gap-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.label}
                            to={item.to}
                            onClick={() => setIsOpen(false)}
                            className={({ isActive }) =>
                                `rounded-2xl px-4 py-3 text-sm transition ${isActive && !item.to.includes('?upload=true')
                                    ? 'bg-[#7B5CFF]/18 text-white shadow-[0_0_24px_rgba(123,92,255,0.18)]'
                                    : 'text-white/72 hover:bg-white/5 hover:text-white'
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
                    <div className="mt-4 pt-4 border-t border-white/8">
                        <button
                            onClick={() => { logout(); setIsOpen(false); }}
                            className="w-full flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm text-red-400 hover:bg-white/5 transition"
                        >
                            <LogOut size={18} />
                            Logout
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
