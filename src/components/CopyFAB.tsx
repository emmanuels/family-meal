'use client'

import { Copy } from 'lucide-react'
import { useCopyShoppingList } from '@/hooks/useCopyShoppingList'
import { ClipboardFallbackModal } from './ClipboardFallbackModal'
import { useState } from 'react'

/**
 * CopyFAB — Floating Action Button for copying shopping list
 * 
 * Positioned absolutely (bottom-right) over meal grids on both mobile + desktop.
 * Fetches shopping list from Story 4.1 endpoint, formats, and copies to clipboard.
 * Shows fallback modal if clipboard API unavailable.
 * 
 * AC1: Visible on mobile + desktop ✓
 * AC2: Calls /api/shopping-list endpoint ✓
 * AC3: Formats with rayon headers ✓
 * AC4: Shows success toast ✓
 * AC5: Fallback modal if needed ✓
 * AC6: Styled consistently ✓
 */
export function CopyFAB({ className }: { className?: string }) {
  const { copy, isLoading, error, clipboardAvailable, formattedContent } =
    useCopyShoppingList()
  const [showFallback, setShowFallback] = useState(false)

  const handleClick = async () => {
    try {
      await copy()
      // If copy succeeded, don't show fallback
    } catch {
      // If clipboard unavailable AND we have formatted content, show fallback
      if (!clipboardAvailable && formattedContent) {
        setShowFallback(true)
      }
    }
  }

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`fixed bottom-4 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-sage text-white shadow-lg transition-all duration-200 hover:bg-sage/90 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${className || ''}`}
        aria-label="Copier la liste de courses"
        title="Copier la liste de courses"
      >
        {isLoading ? (
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <Copy size={24} />
        )}
      </button>

      {/* Clipboard Fallback Modal */}
      {showFallback && !clipboardAvailable && formattedContent && (
        <ClipboardFallbackModal
          onClose={() => setShowFallback(false)}
          content={formattedContent}
        />
      )}
    </>
  )
}
