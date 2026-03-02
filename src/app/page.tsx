'use client'

import { useIsMobile } from '@/hooks/useIsMobile'
import { MobilePlanningView } from '@/components/planning/MobilePlanningView'
import { DesktopPlanningView } from '@/components/planning/DesktopPlanningView'

export default function Home() {
  const isMobile = useIsMobile()
  return (
    <main className="min-h-screen bg-cream">
      {isMobile ? <MobilePlanningView /> : <DesktopPlanningView />}
    </main>
  )
}
