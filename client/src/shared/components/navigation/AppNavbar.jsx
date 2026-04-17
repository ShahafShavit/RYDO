import { Link } from 'react-router-dom';
import { primaryNavigation } from '@/shared/config/navigation';
import AppLogo from '@/shared/components/navigation/AppLogo';
import Button from '@/shared/components/ui/button/Button';
import { ROUTES } from '@/app/router/route-paths';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function AppNavbar() {
  const { isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-(--rydo-z-sticky) border-b border-border bg-black/20 backdrop-blur-2xl ">
      <div className="rydo-container flex h-18 items-center justify-between gap-6">
        <Link to={ROUTES.home} className="inline-flex items-center">
          <AppLogo />
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {primaryNavigation.map((item) => (
            <Link
              key={item.href}
              to={{ pathname: ROUTES.home, hash: item.href }}
              className="text-2sm text-fg transition hover:text-fg-muted"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link to={ROUTES.dashboard}><Button variant="secondary">Dashboard</Button></Link>
          ) : (
            <>
              <Link to={ROUTES.login}><Button variant="ghost">Login</Button></Link>
              <Link to={ROUTES.register}><Button variant="neon">Register</Button></Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
