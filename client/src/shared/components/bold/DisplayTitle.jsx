import { cn } from '@/shared/lib/cn';

const sizes = {
  sm: 'text-xl leading-tight',
  md: 'text-2xl leading-[1.02]',
  lg: 'text-[32px] leading-none tracking-[-0.02em]',
  xl: 'text-[38px] leading-[0.96] tracking-[-0.02em]',
  hero: 'text-[64px] leading-[0.9] tracking-[-0.03em]',
};

export default function DisplayTitle({ as: Tag = 'h1', size = 'md', className, children, ...props }) {
  return (
    <Tag className={cn('rydo-display m-0 text-balance text-fg', sizes[size], className)} {...props}>
      {children}
    </Tag>
  );
}
