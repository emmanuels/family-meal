'use client'

import { useState } from 'react'
import { X, Copy as CopyIcon } from 'lucide-react'
import { toast } from 'sonner'

interface ClipboardFallbackModalProps {
  onClose: () => void
  content: string
}

/**
 * ClipboardFallbackModal — shows when Clipboard API unavailable
 * 
 * Displays shopping list in a textarea so user can copy manually.
 * Also provides a manual copy button that copies textarea content.
 * 
 * Used in AC5 (fallback when clipboard unavailable)
 */
export function ClipboardFallbackModal({
  onClose,
  content,
}: ClipboardFallbackModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      // Clipboard API is unavailable (that's why we're in this modal)
      // Go directly to manual selection fallback
      const textarea = document.querySelector('textarea')
      if (textarea) {
        textarea.select()
        document.execCommand('copy')
      }
      
      setCopied(true)
      toast.success('Copié!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Impossible de copier')
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-charcoal">Copier la liste</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-charcoal/60 hover:bg-warm/20"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Message */}
        <p className="mb-4 text-sm text-charcoal/70">
          Votre navigateur ne supporte pas l&apos;accès au presse-papiers. Veuillez copier
          manuellement le contenu ci-dessous.
        </p>

        {/* Textarea */}
        <textarea
          readOnly
          value={content}
          className="mb-4 h-48 w-full resize-none rounded border border-warm/40 bg-warm/5 p-3 font-mono text-xs text-charcoal"
        />

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 rounded-md bg-sage px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-sage/90"
          >
            <CopyIcon size={16} />
            {copied ? 'Copié!' : 'Copier le texte'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-md border border-warm/40 px-3 py-2 text-sm font-medium text-charcoal transition-colors hover:bg-warm/10"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
