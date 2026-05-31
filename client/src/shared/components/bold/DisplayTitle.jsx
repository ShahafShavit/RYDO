import TruncatedText from '@/shared/components/ui/TruncatedText';
import { cn } from '@/shared/lib/cn';

const sizes = {
  sm: 'text-xl leading-tight',
  md: 'text-2xl leading-[1.08]',
  lg: 'text-[32px] leading-[1.4] tracking-[-0.02em]',
  xl: 'text-[38px] leading-[1.1] tracking-[-0.02em]',
  hero: 'text-[64px] leading-[1.05] tracking-[-0.03em]',
};

/**
 * @param {{
 *   as?: keyof JSX.IntrinsicElements,
 *   size?: keyof typeof sizes,
 *   truncate?: boolean | 'mobile',
 *   lineClamp?: 1 | 2,
 *   title?: string,
 *   className?: string,
 *   children: import('react').ReactNode,
 * }} props
 */
export default function DisplayTitle({
  as: Tag = 'h1',
  size = 'md',
  truncate,
  lineClamp = 1,
  title,
  className,
  children,
  ...props
}) {
  const displayClass = cn(
    'rydo-display rydo-display-title m-0 text-fg',
    sizes[size],
    !truncate && 'text-balance',
    className,
  );

  if (truncate) {
    return (
      <TruncatedText
        as={Tag}
        lineClamp={lineClamp}
        mobileOnly={truncate === 'mobile'}
        descenderSafe
        title={title}
        className={displayClass}
        {...props}
      >
        {children}
      </TruncatedText>
    );
  }

  return (
    <Tag className={displayClass} {...props}>
      {children}
    </Tag>
  );
}
