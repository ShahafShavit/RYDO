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
 *   mobileOnly?: boolean,
 *   descenderSafe?: boolean,
 * }} props
 */
export default function TruncatedText({
  children,
  as: Component = 'span',
  className,
  title,
  dir = 'auto',
  lineClamp = 1,
  mobileOnly = false,
  descenderSafe = false,
  ...props
}) {
  const textTitle =
    title ?? (typeof children === 'string' || typeof children === 'number' ? String(children) : undefined);

  const clampClass = (() => {
    if (descenderSafe) {
      if (mobileOnly) {
        return lineClamp === 2 ? 'rydo-truncate-mobile-2' : 'rydo-truncate-mobile-1';
      }
      return lineClamp === 2 ? 'rydo-truncate-clamp-2' : 'rydo-truncate-ellipsis-1';
    }
    if (mobileOnly) {
      return lineClamp === 2
        ? 'max-md:line-clamp-2 max-md:break-words md:overflow-visible md:whitespace-normal md:line-clamp-none'
        : 'max-md:truncate md:overflow-visible md:whitespace-normal md:text-clip';
    }
    return lineClamp === 2 ? 'line-clamp-2 break-words' : 'truncate';
  })();

  return (
    <Component
      title={textTitle}
      dir={dir}
      className={cn('block w-full min-w-0', !descenderSafe && 'overflow-hidden', clampClass, className)}
      {...props}
    >
      {children}
    </Component>
  );
}
