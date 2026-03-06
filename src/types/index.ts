import { z } from 'zod'

// ─── Union Types ──────────────────────────────────────────────────────────────

/** Meal type — shared between Recipe category and Planning slot type */
export type MealType =
  | 'Petit-déjeuner'
  | 'Déjeuner Midi'
  | 'Déjeuner Pique-nique'
  | 'Dîner'
  | 'Goûter'

/** Season of a recipe */
export type Season = 'Toutes saisons' | 'Printemps-Été' | 'Automne-Hiver'

/** ISO week day: 0 = Monday … 6 = Sunday (ISO convention — never Sunday = 0) */
export type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6

/** Carrefour grocery aisle */
export type Rayon = 'Boulangerie' | 'Fruits & Légumes' | 'Produits frais' | 'Épicerie'

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

export const MealTypeSchema = z.enum([
  'Petit-déjeuner',
  'Déjeuner Midi',
  'Déjeuner Pique-nique',
  'Goûter',
  'Dîner',
])

export const SeasonSchema = z.enum([
  'Toutes saisons',
  'Printemps-Été',
  'Automne-Hiver',
])

export const RecipeSchema = z.object({
  id: z.string(),
  customId: z.string(),
  name: z.string(),
  category: MealTypeSchema,
  isVegetarian: z.boolean(),
  season: SeasonSchema,
  notes: z.string().nullable(),
  ingredientIds: z.array(z.string()),
})

export const IngredientSchema = z.object({
  id: z.string(),
  customId: z.string(),
  name: z.string(),
  quantity: z.number(),
  unit: z.string(),
  rayon: z.string(),
  recipeId: z.string(),
})

export const MealSlotSchema = z.object({
  id: z.string(),
  /** ISO date "YYYY-MM-DD" of this meal */
  date: z.string(),
  /** 0 = Monday … 6 = Sunday */
  day: z.number().min(0).max(6),
  slotType: MealTypeSchema,
  /** Airtable record ID of the linked recipe, or null if slot is empty */
  recipeId: z.string().nullable(),
  /** Formula lookup — recipe name for display, or null */
  recipeName: z.string().nullable(),
  /** Freeform notes, e.g. omnivore variant "+ jambon ×2", or null */
  notes: z.string().nullable(),
})

export const WeekPlanSchema = z.object({
  /** ISO week string "YYYY-WWW" (e.g. "2026-W10") */
  weekId: z.string(),
  /** Monday's date "YYYY-MM-DD" */
  weekStart: z.string(),
  /** All planning slots for the week, sorted by day then slot type */
  slots: z.array(MealSlotSchema),
})

export const ShoppingItemSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  unit: z.string(),
  rayon: z.string(),
})

// ─── TypeScript Types (inferred from Zod schemas) ────────────────────────────

export type Recipe = z.infer<typeof RecipeSchema>
export type Ingredient = z.infer<typeof IngredientSchema>
export type MealSlot = z.infer<typeof MealSlotSchema>
export type WeekPlan = z.infer<typeof WeekPlanSchema>
export type ShoppingItem = z.infer<typeof ShoppingItemSchema>
