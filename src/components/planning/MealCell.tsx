'use client'

import React, { useState, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/store'
import { toast } from 'sonner'
import type { MealSlot, MealType } from '@/types/index'

interface MealCellProps {
  slot: MealSlot | null
  slotType: MealType
  isVegetarian: boolean
  variant: 'mobile' | 'desktop'
  /** Optional tap handler — provided only for non-empty mobile slots (FR4 slot swap) */
  onTap?: () => void
  /** Optional loading state to disable editing (AC10) */
  isLoading?: boolean
  /** When true, all editing interactions are disabled (past week read-only mode) */
  readOnly?: boolean
}

export const MealCell = React.memo(function MealCell({
  slot,
  slotType,
  isVegetarian,
  variant,
  onTap,
  isLoading = false,
  readOnly = false,
}: MealCellProps) {
  const isEmpty = slot === null || slot.recipeId === null
  const [isEditingAnnotation, setIsEditingAnnotation] = useState(false)
  const [editingText, setEditingText] = useState(slot?.notes || '')
  const [isSaving, setIsSaving] = useState(false)
  const [isHovering, setIsHovering] = useState(false)

  // AC4: Wrap with useCallback to prevent recreation on parent re-renders
  const handleSaveAnnotation = useCallback(async () => {
    if (!slot) return

    const previousNotes = slot.notes
    const newNotes = editingText || null

    // Optimistic update
    useAppStore.getState().updateSlotNotes(slot.id, newNotes)
    setIsEditingAnnotation(false)
    setIsSaving(true)

    try {
      const res = await fetch('/api/planning', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId: slot.id, notes: newNotes }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      toast.success('Annotation sauvegardée')
    } catch {
      // Rollback
      useAppStore.getState().updateSlotNotes(slot.id, previousNotes)
      toast.error("Impossible de sauvegarder l'annotation")
    } finally {
      setIsSaving(false)
    }
  }, [slot, editingText])

  const handleDeleteRecipe = useCallback(async () => {
    if (!slot) return

    const previousRecipe = slot.recipeId
    const previousName = slot.recipeName

    // Optimistic update
    useAppStore.getState().updateSlot(slot.id, null, null)
    setIsSaving(true)

    try {
      const res = await fetch('/api/planning', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId: slot.id, recipeId: null }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      toast.success('Repas supprimé')
    } catch {
      // Rollback
      useAppStore.getState().updateSlot(slot.id, previousRecipe, previousName)
      toast.error('Impossible de supprimer le repas')
    } finally {
      setIsSaving(false)
    }
  }, [slot])

  const isDisabled = isLoading || isSaving
  // In read-only mode: no tap, no annotation editing, no delete
  const effectiveOnTap = readOnly ? undefined : onTap

  return (
    <div
      className={cn(
        'relative flex flex-col justify-between rounded px-3 py-2',
        variant === 'mobile' ? 'h-[84px]' : 'h-[76px]',
        isEmpty && 'border border-dashed border-warm',
        isEmpty && effectiveOnTap && 'cursor-pointer active:opacity-70',
        !isEmpty && isVegetarian && 'bg-sage-light',
        !isEmpty && !isVegetarian && 'bg-cream border border-warm',
        !isEmpty && effectiveOnTap && 'cursor-pointer active:opacity-80',
        isDisabled && 'opacity-50',
      )}
      onClick={effectiveOnTap && !isEditingAnnotation ? effectiveOnTap : undefined}
      onMouseEnter={() => !isEmpty && !readOnly && setIsHovering(true)}
      onMouseLeave={() => !isEmpty && setIsHovering(false)}
    >
      {/* Slot type label — shown on mobile only; desktop MealGrid provides row headers */}
      {variant === 'mobile' && <p className="text-xs text-charcoal/50">{slotType}</p>}

      {isEmpty ? (
        /* Empty state: + icon centred */
        <div className="flex flex-1 items-center justify-center">
          <span className="text-xl text-charcoal/30">+</span>
        </div>
      ) : isEditingAnnotation ? (
        /* Edit mode: annotation input (AC4, AC5) */
        <div className="flex flex-col gap-1">
          <Input
            type="text"
            value={editingText}
            onChange={(e) => setEditingText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveAnnotation()
              if (e.key === 'Escape') {
                setIsEditingAnnotation(false)
                setEditingText(slot?.notes || '')
              }
            }}
            onBlur={handleSaveAnnotation}
            placeholder="Ajouter annotation omnivore..."
            disabled={isDisabled}
            className="text-xs"
            autoFocus
          />
        </div>
      ) : (
        <>
          {/* Recipe name — 2-line clamp for readability */}
          <p className="line-clamp-2 text-xs font-medium leading-tight text-charcoal">{slot.recipeName}</p>
          
          {/* Dietary indicators — AC1 & AC2 */}
          {/* Green badge: fully vegetarian (no omnivore variant) */}
          {isVegetarian && !slot.notes && (
            <Badge
              variant="outline"
              className={cn(
                "max-w-full rounded border-green-300 bg-green-50 px-1.5 py-0 text-xs text-green-700",
                !readOnly && "cursor-pointer",
              )}
              onClick={(e) => {
                e.stopPropagation()
                if (!isDisabled && !readOnly) setIsEditingAnnotation(true)
              }}
            >
              Végétarien
            </Badge>
          )}

          {/* Orange badge: has omnivore annotation */}
          {/* AC5: Annotation text is rendered as text (not HTML) - safe from XSS injection */}
          {slot.notes && (
            <Badge
              variant="outline"
              className={cn(
                "max-w-full truncate rounded border-terracotta/30 bg-terracotta-light/20 px-1.5 py-0 text-xs text-terracotta",
                !readOnly && "cursor-pointer",
              )}
              onClick={(e) => {
                e.stopPropagation()
                if (!isDisabled && !readOnly) setIsEditingAnnotation(true)
              }}
            >
              {slot.notes}
            </Badge>
          )}

          {/* × delete button — shows on hover, hidden in read-only mode (AC8) */}
          {isHovering && !isDisabled && !readOnly && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDeleteRecipe()
              }}
              className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs hover:bg-red-600"
              title="Supprimer le repas"
            >
              ×
            </button>
          )}
        </>
      )}
    </div>
  )
})
