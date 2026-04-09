import { cn } from '@/shared/lib/cn';

export default function Loader({ fullscreen = false }) {
  return (
    <div className={cn(fullscreen ? 'grid min-h-screen place-items-center' : 'grid min-h-[160px] place-items-center')}>
      <div className="flex items-center gap-3 text-sm text-white/72">
        <span className="h-3 w-3 animate-pulse rounded-full bg-[#21F1A8]" />
        Loading...
      </div>
    </div>
  );
}
