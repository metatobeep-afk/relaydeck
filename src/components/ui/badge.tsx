import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variant === 'default' && 'bg-slate-100 text-slate-700',
        variant === 'success' && 'bg-green-100 text-green-800',
        variant === 'warning' && 'bg-yellow-100 text-yellow-800',
        variant === 'error' && 'bg-red-100 text-red-800',
        variant === 'info' && 'bg-blue-100 text-blue-800',
        className
      )}
      {...props}
    />
  )
}

export function StatusBadge({ className, label, color }: { className?: string; label: string; color: string }) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', color, className)}>
      {label}
    </span>
  )
}
