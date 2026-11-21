'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'

export default function NavigationProgress() {
  const pathname = usePathname()
  const [width, setWidth] = useState(0)
  const [visible, setVisible] = useState(false)
  const prevPathname = useRef(pathname)
  const isNavigating = useRef(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  const addTimer = useCallback((fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay)
    timers.current.push(id)
  }, [])

  const finish = useCallback(() => {
    clearTimers()
    isNavigating.current = false
    setWidth(100)
    addTimer(() => {
      setVisible(false)
      addTimer(() => setWidth(0), 60)
    }, 320)
  }, [clearTimers, addTimer])

  const start = useCallback(() => {
    clearTimers()
    isNavigating.current = true
    setVisible(true)
    setWidth(0)
    addTimer(() => setWidth(18), 30)
    addTimer(() => setWidth(42), 350)
    addTimer(() => setWidth(60), 800)
    addTimer(() => setWidth(73), 1500)
    addTimer(() => setWidth(82), 2400)
    addTimer(() => setWidth(88), 3500)
    // sécurité : max 8s
    addTimer(() => { if (isNavigating.current) finish() }, 8000)
  }, [clearTimers, addTimer, finish])

  // Complétion à chaque changement de pathname
  useEffect(() => {
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname
      if (isNavigating.current) finish()
    }
  }, [pathname, finish])

  // Interception des clics sur liens internes
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const a = (e.target as Element).closest('a')
      if (!a) return
      const href = a.getAttribute('href') ?? ''
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return
      if (a.getAttribute('target') === '_blank') return
      try {
        const url = new URL(href, window.location.href)
        if (url.origin !== window.location.origin) return
        if (url.pathname === window.location.pathname && url.search === window.location.search) return
      } catch { return }
      start()
    }
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [start])

  useEffect(() => () => clearTimers(), [clearTimers])

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none"
      style={{
        height: 2,
        opacity: visible ? 1 : 0,
        transition: visible
          ? 'opacity 80ms ease-in'
          : 'opacity 200ms ease-out 100ms',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${width}%`,
          background: 'linear-gradient(90deg, #2563EB, #3B82F6, #60A5FA)',
          boxShadow: '0 0 14px 2px rgba(59,130,246,0.65)',
          borderRadius: '0 2px 2px 0',
          transition: width === 100
            ? 'width 180ms ease-out'
            : 'width 500ms cubic-bezier(0.08, 0.5, 0.4, 1)',
        }}
      />
    </div>
  )
}
