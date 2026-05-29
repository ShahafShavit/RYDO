import { cn } from '@/shared/lib/cn';

export default function GradientCTA({
  children,
  icon: Icon,
  className,
  type = 'button',
  heightClass = 'h-14',
  ...props
}) {
  return (
    <button
      type={type}
      className={cn('rydo-gradient-cta text-base px-[22px]', heightClass, className)}
      {...props}
    >
      {Icon ? <Icon className="h-[19px] w-[19px]" strokeWidth={2.2} aria-hidden /> : null}
      {children}
    </button>
  );
}
