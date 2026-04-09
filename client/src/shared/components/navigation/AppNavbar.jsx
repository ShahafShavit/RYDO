import { Link } from 'react-router-dom';
import { primaryNavigation } from '@/shared/config/navigation';
import AppLogo from '@/shared/components/navigation/AppLogo';
import Button from '@/shared/components/ui/button/Button';
import { ROUTES } from '@/app/router/route-paths';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function AppNavbar() {
  const { isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-black/20 backdrop-blur-2xl ">
      <div className="rydo-container flex h-18 items-center justify-between gap-6">
        <Link to={ROUTES.home} className="inline-flex items-center">
          <AppLogo />
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {primaryNavigation.map((item) => (
            <a key={item.href} href={item.href} className="text-2sm text-white transition hover:text-white/50">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link to={ROUTES.dashboard}><Button variant="secondary">Dashboard</Button></Link>
          ) : (
            <>
              <Link to={ROUTES.login}><Button variant="ghost">Login</Button></Link>
              <Link to={ROUTES.register}><Button variant="neon">Start riding</Button></Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
