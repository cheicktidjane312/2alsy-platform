import { cn } from '@/lib/utils'

type BadgeVariant = 'open' | 'late' | 'closed' | 'corrected' | 'default'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variantMap: Record<BadgeVariant, string> = {
  open: 'badge-open',
  late: 'badge-late',
  closed: 'badge-closed',
  corrected: 'badge-corrected',
  default: 'bg-white/10 text-slate-300 border border-white/10',
}

export default function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', variantMap[variant], className)}>
      {children}
    </span>
  )
}
