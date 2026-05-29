import { cn } from '@/shared/lib/cn';

export default function IconButton({
  icon: Icon,
  size = 'md',
  className,
  iconClassName,
  disabled,
  'aria-label': ariaLabel,
  ...props
}) {
  const dim = size === 'lg' ? 'rydo-iconbtn-lg' : '';
  const iconSize = size === 'lg' ? 'h-5 w-5' : 'h-[18px] w-[18px]';
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      className={cn('rydo-iconbtn', dim, disabled && 'cursor-not-allowed opacity-50', className)}
      {...props}
    >
      {Icon ? (
        <Icon className={cn(iconSize, iconClassName)} strokeWidth={2} aria-hidden />
      ) : null}
    </button>
  );
}
