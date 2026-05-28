import { cn } from '@/shared/lib/cn';

/**
 * Block-level truncated text that respects grid/flex min-width chains.
 * Prefer over `inline-block max-w-full truncate`, which fails inside grid items.
 *
 * @param {{
 *   children: import('react').ReactNode,
 *   as?: keyof JSX.IntrinsicElements | import('react').ComponentType,
 *   className?: string,
 *   title?: string,
 *   dir?: 'auto' | 'ltr' | 'rtl',
 *   lineClamp?: 1 | 2,
 * }} props
 */
export default function TruncatedText({
  children,
  as: Component = 'span',
  className,
  title,
  dir = 'auto',
  lineClamp = 1,
  ...props
}) {
  const textTitle =
    title ?? (typeof children === 'string' || typeof children === 'number' ? String(children) : undefined);

  return (
    <Component
      title={textTitle}
      dir={dir}
      className={cn(
        'block w-full min-w-0 overflow-hidden',
        lineClamp === 2 ? 'line-clamp-2 break-words' : 'truncate',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
