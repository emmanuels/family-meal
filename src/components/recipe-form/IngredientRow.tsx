'use client'

import { useState } from 'react'
import { RAYONS, suggestRayon } from '@/lib/utils'

export interface IngredientRowData {
  name: string
  quantity: number
  unit: string
  rayon: string
}

interface IngredientRowProps {
  value: IngredientRowData
  onChange: (v: IngredientRowData) => void
  onRemove: () => void
}

export function IngredientRow({ value, onChange, onRemove }: IngredientRowProps) {
  // Track whether the user manually overrode the auto-suggested rayon.
  // When true, typing in the name field will no longer overwrite the rayon.
  const [rayonManuallySet, setRayonManuallySet] = useState(false)

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newName = e.target.value
    const suggestion = suggestRayon(newName)

    // Auto-suggest rayon only if the user has not manually overridden it
    if (suggestion && !rayonManuallySet) {
      onChange({ ...value, name: newName, rayon: suggestion })
    } else {
      onChange({ ...value, name: newName })
    }
  }

  function handleRayonChange(e: React.ChangeEvent<HTMLSelectElement>) {
    // If user clears the dropdown back to empty, re-enable auto-suggest
    setRayonManuallySet(e.target.value !== '')
    onChange({ ...value, rayon: e.target.value })
  }

  return (
    <div className="flex flex-wrap items-start gap-2 rounded border border-[#C8E6D9] bg-white p-2">
      {/* Ingredient name */}
      <div className="min-w-[140px] flex-1">
        <label className="block text-xs font-medium text-[#2D2D2D]">Ingrédient</label>
        <input
          type="text"
          value={value.name}
          onChange={handleNameChange}
          placeholder="Ex: lentilles corail"
          className="mt-1 w-full rounded border border-gray-300 bg-[#F7F3EE] px-2 py-1 text-sm text-[#2D2D2D] placeholder-gray-400 focus:border-[#C8E6D9] focus:outline-none focus:ring-1 focus:ring-[#C8E6D9]"
        />
      </div>

      {/* Quantity */}
      <div className="w-20">
        <label className="block text-xs font-medium text-[#2D2D2D]">Qté</label>
        <input
          type="number"
          min="0"
          step="any"
          value={value.quantity || ''}
          onChange={(e) =>
            onChange({ ...value, quantity: parseFloat(e.target.value) || 0 })
          }
          placeholder="200"
          className="mt-1 w-full rounded border border-gray-300 bg-[#F7F3EE] px-2 py-1 text-sm text-[#2D2D2D] focus:border-[#C8E6D9] focus:outline-none focus:ring-1 focus:ring-[#C8E6D9]"
        />
      </div>

      {/* Unit */}
      <div className="w-20">
        <label className="block text-xs font-medium text-[#2D2D2D]">Unité</label>
        <input
          type="text"
          value={value.unit}
          onChange={(e) => onChange({ ...value, unit: e.target.value })}
          placeholder="g / ml / pcs"
          className="mt-1 w-full rounded border border-gray-300 bg-[#F7F3EE] px-2 py-1 text-sm text-[#2D2D2D] placeholder-gray-400 focus:border-[#C8E6D9] focus:outline-none focus:ring-1 focus:ring-[#C8E6D9]"
        />
      </div>

      {/* Rayon */}
      <div className="w-40">
        <label className="block text-xs font-medium text-[#2D2D2D]">Rayon</label>
        <select
          value={value.rayon}
          onChange={handleRayonChange}
          className="mt-1 w-full rounded border border-gray-300 bg-[#F7F3EE] px-2 py-1 text-sm text-[#2D2D2D] focus:border-[#C8E6D9] focus:outline-none focus:ring-1 focus:ring-[#C8E6D9]"
        >
          <option value="">-- Rayon --</option>
          {RAYONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* Remove button */}
      <div className="flex items-end pb-1">
        <button
          type="button"
          onClick={onRemove}
          className="rounded bg-[#EDE8E0] px-2 py-1 text-xs font-medium text-[#2D2D2D] hover:bg-[#D97566] hover:text-white"
        >
          Supprimer
        </button>
      </div>
    </div>
  )
}
