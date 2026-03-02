'use client'

import { useEffect, useState } from 'react'

/**
 * Returns true when the viewport is narrower than 768px (mobile breakpoint).
 * Includes SSR guard: defaults to false on the server (renders desktop layout).
 * Subscribes to matchMedia change events for live updates on resize.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    // SSR guard: window is not available during server-side rendering
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 767px)').matches
  })

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isMobile
}
