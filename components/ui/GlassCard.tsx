'use client'

import { cn } from '@/lib/utils'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  glow?: boolean
}

export default function GlassCard({ children, className, hover = true, glow = false }: GlassCardProps) {
  return (
    <div
      className={cn(
        'relative rounded-2xl p-6 glass-card',
        hover && 'hover:border-[rgba(59,130,246,0.35)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.5),0_0_20px_rgba(30,64,175,0.15)]',
        glow && 'accent-glow',
        className
      )}
    >
      {/* Top highlight bar */}
      <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
      {children}
    </div>
  )
}
