'use client'

import { useAppStore } from '@/store/store'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { RecipeForm } from '@/components/recipe-form/RecipeForm'

export function QuickAddDrawer() {
  const quickAddOpen = useAppStore((s) => s.quickAddOpen)
  const toggleQuickAdd = useAppStore((s) => s.toggleQuickAdd)

  return (
    <Sheet open={quickAddOpen} onOpenChange={(open) => { if (!open && useAppStore.getState().quickAddOpen) toggleQuickAdd() }}>
      <SheetContent side="right" className="w-[480px] sm:max-w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nouvelle recette</SheetTitle>
          <SheetDescription className="sr-only">Formulaire de création de recette</SheetDescription>
        </SheetHeader>
        <div className="mt-4">
          <RecipeForm onCancel={toggleQuickAdd} onSuccess={() => { if (useAppStore.getState().quickAddOpen) toggleQuickAdd() }} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
