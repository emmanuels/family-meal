'use client'

import { useIsMobile } from '@/hooks/useIsMobile'
import { MobilePlanningView } from '@/components/planning/MobilePlanningView'

function DesktopPlanningView() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream">
      <h1 className="font-playfair text-4xl text-charcoal">Desktop view — coming in Story 1.5</h1>
    </div>
  )
}

export default function Home() {
  const isMobile = useIsMobile()
  return (
    <main className="min-h-screen bg-cream">
      {isMobile ? <MobilePlanningView /> : <DesktopPlanningView />}
    </main>
  )
}
