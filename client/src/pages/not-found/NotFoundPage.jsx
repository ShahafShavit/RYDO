import { Link } from 'react-router-dom';
import Button from '@/shared/components/ui/button/Button';
import { ROUTES } from '@/app/router/route-paths';

export default function NotFoundPage() {
  return (
    <section className="grid min-h-screen place-items-center px-6">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.16em] text-fg-subtle">404</p>
        <h1 className="mt-3 text-5xl font-semibold">Page not found</h1>
        <div className="mt-8">
          <Link to={ROUTES.home}><Button variant="neon">Back home</Button></Link>
        </div>
      </div>
    </section>
  );
}
