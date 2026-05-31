import InfoTooltip from '@/shared/components/ui/info-tooltip/InfoTooltip';
import { cn } from '@/shared/lib/cn';

/**
 * @param {{
 *   children: import('react').ReactNode,
 *   hint?: import('react').ReactNode,
 *   topic?: string,
 *   className?: string,
 *   labelClassName?: string,
 *   as?: 'span' | 'label' | 'p',
 *   stopPropagation?: boolean,
 * }} props
 */
export default function LabelWithHelp({
  children,
  hint,
  topic,
  className,
  labelClassName,
  as: Tag = 'span',
  stopPropagation = false,
}) {
  return (
    <Tag className={cn('inline-flex items-center gap-1', className)}>
      <span className={labelClassName}>{children}</span>
      {hint ? (
        <InfoTooltip content={hint} topic={topic ?? (typeof children === 'string' ? children : 'More info')} stopPropagation={stopPropagation} />
      ) : null}
    </Tag>
  );
}
