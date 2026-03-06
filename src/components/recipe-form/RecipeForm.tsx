'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import type { Recipe, MealType, Season } from '@/types/index'
import { useAppStore } from '@/store/store'
import { IngredientRow, type IngredientRowData } from './IngredientRow'

interface RecipeFormProps {
  onCancel: () => void
  onSuccess?: (recipe: Recipe) => void
}

const MEAL_TYPES: MealType[] = [
  'Petit-déjeuner',
  'Déjeuner Midi',
  'Déjeuner Pique-nique',
  'Goûter',
  'Dîner',
]

const SEASONS: Season[] = ['Toutes saisons', 'Printemps-Été', 'Automne-Hiver']

interface FormErrors {
  name?: string
  category?: string
  season?: string
}

export function RecipeForm({ onCancel, onSuccess }: RecipeFormProps) {
  // Form state
  const [name, setName] = useState('')
  const [category, setCategory] = useState<MealType | ''>('')
  const [isVegetarian, setIsVegetarian] = useState(true)
  const [prepTime, setPrepTime] = useState(30)
  const [season, setSeason] = useState<Season>('Toutes saisons')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [ingredients, setIngredients] = useState<IngredientRowData[]>([])
  // Stable row keys prevent React from remounting IngredientRow on removal,
  // which would reset each row's local rayonManuallySet state.
  const [ingredientKeys, setIngredientKeys] = useState<number[]>([])
  const nextRowKey = useRef(0)

  // Zustand store
  const addRecipe = useAppStore((state) => state.addRecipe)

  // Validation logic
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!name.trim()) {
      newErrors.name = 'Ce champ est requis'
    } else if (name.length > 100) {
      newErrors.name = 'Max 100 caractères'
    }

    if (!category) {
      newErrors.category = 'Ce champ est requis'
    }

    if (!season) {
      newErrors.season = 'Ce champ est requis'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Client-side validation
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          category,
          isVegetarian,
          prepTime: prepTime || 30,
          season,
          ingredients: ingredients.filter((i) => i.name.trim() !== ''),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage =
          errorData.message || 'Impossible de sauvegarder la recette'
        toast.error(errorMessage)
        return
      }

      const responseData = (await response.json()) as Recipe & { ingredientWarnings?: string[] }
      const { ingredientWarnings, ...newRecipe } = responseData
      addRecipe(newRecipe as Recipe)

      // Reset form after successful save
      setName('')
      setCategory('')
      setIsVegetarian(true)
      setPrepTime(30)
      setSeason('Toutes saisons')
      setErrors({})
      setIngredients([])
      setIngredientKeys([])

      if (ingredientWarnings && ingredientWarnings.length > 0) {
        toast.warning(
          `Recette ajoutée, mais ${ingredientWarnings.length} ingrédient(s) non sauvegardé(s) : ${ingredientWarnings.join(', ')}`,
        )
      } else {
        toast.success('Recette ajoutée')
      }
      onSuccess?.(newRecipe as Recipe)
    } catch (error) {
      console.error('Recipe save error:', error)
      toast.error('Impossible de sauvegarder la recette')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border-2 border-[#C8E6D9] bg-[#F7F3EE] p-4"
    >
      {/* Nom field */}
      <div>
        <label htmlFor="nom" className="block text-sm font-medium text-[#2D2D2D]">
          Nom <span className="text-red-600">*</span>
        </label>
        <input
          id="nom"
          type="text"
          maxLength={100}
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (errors.name) {
              setErrors({ ...errors, name: undefined })
            }
          }}
          className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-[#2D2D2D] placeholder-gray-400 focus:border-[#C8E6D9] focus:outline-none focus:ring-2 focus:ring-[#C8E6D9]"
          placeholder="Ex: Pâtes Carbonara"
        />
        {errors.name && <p className="mt-1 text-sm text-[#D97566]">{errors.name}</p>}
      </div>

      {/* Catégorie field */}
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-[#2D2D2D]">
          Catégorie <span className="text-red-600">*</span>
        </label>
        <select
          id="category"
          required
          value={category}
          onChange={(e) => {
            setCategory(e.target.value as MealType)
            if (errors.category) {
              setErrors({ ...errors, category: undefined })
            }
          }}
          className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-[#2D2D2D] focus:border-[#C8E6D9] focus:outline-none focus:ring-2 focus:ring-[#C8E6D9]"
        >
          <option value="">-- Sélectionner une catégorie --</option>
          {MEAL_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        {errors.category && <p className="mt-1 text-sm text-[#D97566]">{errors.category}</p>}
      </div>

      {/* Végétarien toggle */}
      <div className="flex items-center space-x-3">
        <label htmlFor="vegetarian" className="text-sm font-medium text-[#2D2D2D]">
          Végétarien
        </label>
        <input
          id="vegetarian"
          type="checkbox"
          checked={isVegetarian}
          onChange={(e) => setIsVegetarian(e.target.checked)}
          className="h-5 w-5 rounded accent-[#C8E6D9]"
        />
      </div>

      {/* Temps de préparation field */}
      <div>
        <label htmlFor="prepTime" className="block text-sm font-medium text-[#2D2D2D]">
          Temps de préparation (minutes)
        </label>
        <input
          id="prepTime"
          type="number"
          min="0"
          max="500"
          value={prepTime}
          onChange={(e) => setPrepTime(Math.max(0, parseInt(e.target.value) || 30))}
          className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-[#2D2D2D] focus:border-[#C8E6D9] focus:outline-none focus:ring-2 focus:ring-[#C8E6D9]"
        />
      </div>

      {/* Saison field */}
      <div>
        <label htmlFor="season" className="block text-sm font-medium text-[#2D2D2D]">
          Saison <span className="text-red-600">*</span>
        </label>
        <select
          id="season"
          required
          value={season}
          onChange={(e) => {
            setSeason(e.target.value as Season)
            if (errors.season) {
              setErrors({ ...errors, season: undefined })
            }
          }}
          className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-[#2D2D2D] focus:border-[#C8E6D9] focus:outline-none focus:ring-2 focus:ring-[#C8E6D9]"
        >
          {SEASONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {errors.season && <p className="mt-1 text-sm text-[#D97566]">{errors.season}</p>}
      </div>

      {/* Ingredient rows */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-medium text-[#2D2D2D]">Ingrédients</span>
          <button
            type="button"
            onClick={() => {
              setIngredients([...ingredients, { name: '', quantity: 0, unit: '', rayon: '' }])
              setIngredientKeys([...ingredientKeys, nextRowKey.current++])
            }}
            className="rounded bg-[#C8E6D9] px-3 py-1 text-xs font-medium text-[#2D2D2D] hover:bg-[#B5DCC8]"
          >
            + Ajouter un ingrédient
          </button>
        </div>
        <div className="space-y-2">
          {ingredients.map((ingredient, index) => (
            <IngredientRow
              key={ingredientKeys[index]}
              value={ingredient}
              onChange={(updated) => {
                const next = [...ingredients]
                next[index] = updated
                setIngredients(next)
              }}
              onRemove={() => {
                setIngredients(ingredients.filter((_, i) => i !== index))
                setIngredientKeys(ingredientKeys.filter((_, i) => i !== index))
              }}
            />
          ))}
        </div>
      </div>

      {/* Button group */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 rounded bg-[#C8E6D9] px-4 py-2 font-medium text-[#2D2D2D] hover:bg-[#B5DCC8] disabled:opacity-50"
        >
          {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 rounded bg-[#EDE8E0] px-4 py-2 font-medium text-[#2D2D2D] hover:bg-[#E0DAD3] disabled:opacity-50"
        >
          Annuler
        </button>
      </div>
    </form>
  )
}
