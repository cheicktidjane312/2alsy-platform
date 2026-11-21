import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  glow?: boolean
}

export default function Card({ children, className, hover = true, glow }: CardProps) {
  return (
    <div
      className={cn(
        'glass-card rounded-xl p-4 md:p-6',
        hover && 'hover:border-[rgba(59,130,246,0.35)]',
        glow && 'accent-glow',
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mb-4', className)}>{children}</div>
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn('text-lg font-bold text-blue-400 tracking-wide', className)}>
      {children}
    </h2>
  )
}
