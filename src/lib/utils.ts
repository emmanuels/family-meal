import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Recipe, Ingredient, WeekPlan, ShoppingItem } from "@/types/index"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns the weekId for the next or previous ISO week.
 * @param weekId ISO week string "YYYY-WWW" (e.g., "2026-W10")
 * @param delta  +1 for next week, -1 for previous week
 * Note: simplified 52-week assumption for V1 — adequate for production use.
 */
export function getAdjacentWeek(weekId: string, delta: 1 | -1): string {
  const match = weekId.match(/^(\d{4})-W(\d{1,2})$/)
  if (!match) throw new Error(`Invalid weekId: ${weekId}`)

  let year = parseInt(match[1], 10)
  let week = parseInt(match[2], 10) + delta

  if (week < 1) {
    year -= 1
    week = 52 // Simplified: most years have 52 weeks
  } else if (week > 52) {
    year += 1
    week = 1
  }

  return `${year}-W${String(week).padStart(2, '0')}`
}

// ─── Shopping List Constants (Story 4.1) ──────────────────────────────────────

/**
 * RAYONS constant — Carrefour Drive aisle order (fixed, not alphabetized)
 * This order matches the physical layout at Carrefour Drive stores.
 */
export const RAYONS = [
  'Fruits & Légumes',
  'Produits frais',
  'Épicerie',
  'Surgelés',
  'Boissons',
] as const

/**
 * RAYON_KEYWORDS — keyword-to-rayon mapping for client-side auto-suggest.
 * Keys are lowercase French food terms; values are RAYONS entries.
 * Matching is substring-based: if the ingredient name contains a key, its rayon is suggested.
 */
const RAYON_KEYWORDS: Record<string, typeof RAYONS[number]> = {
  // Fruits & Légumes
  pomme: 'Fruits & Légumes',
  poire: 'Fruits & Légumes',
  banane: 'Fruits & Légumes',
  tomate: 'Fruits & Légumes',
  carotte: 'Fruits & Légumes',
  courgette: 'Fruits & Légumes',
  salade: 'Fruits & Légumes',
  poireau: 'Fruits & Légumes',
  oignon: 'Fruits & Légumes',
  citron: 'Fruits & Légumes',
  avocat: 'Fruits & Légumes',
  poivron: 'Fruits & Légumes',
  brocoli: 'Fruits & Légumes',
  epinard: 'Fruits & Légumes',
  épinard: 'Fruits & Légumes',
  champignon: 'Fruits & Légumes',
  concombre: 'Fruits & Légumes',
  aubergine: 'Fruits & Légumes',
  ail: 'Fruits & Légumes',
  'pomme de terre': 'Fruits & Légumes',
  // Produits frais
  lait: 'Produits frais',
  beurre: 'Produits frais',
  fromage: 'Produits frais',
  yaourt: 'Produits frais',
  creme: 'Produits frais',
  crème: 'Produits frais',
  oeuf: 'Produits frais',
  œuf: 'Produits frais',
  poulet: 'Produits frais',
  viande: 'Produits frais',
  jambon: 'Produits frais',
  saumon: 'Produits frais',
  poisson: 'Produits frais',
  tofu: 'Produits frais',
  quiche: 'Produits frais',
  // Épicerie
  farine: 'Épicerie',
  riz: 'Épicerie',
  pate: 'Épicerie',
  pâte: 'Épicerie',
  lentille: 'Épicerie',
  pois: 'Épicerie',
  haricot: 'Épicerie',
  huile: 'Épicerie',
  vinaigre: 'Épicerie',
  sucre: 'Épicerie',
  sel: 'Épicerie',
  poivre: 'Épicerie',
  moutarde: 'Épicerie',
  sauce: 'Épicerie',
  conserve: 'Épicerie',
  bouillon: 'Épicerie',
  chocolat: 'Épicerie',
  fecule: 'Épicerie',
  fécule: 'Épicerie',
  levure: 'Épicerie',
  // Surgelés
  surgele: 'Surgelés',
  surgelé: 'Surgelés',
  glace: 'Surgelés',
  // Boissons
  eau: 'Boissons',
  jus: 'Boissons',
  'lait vegetale': 'Boissons',
}

/**
 * suggestRayon — returns the best RAYONS match for a given ingredient name.
 * Runs entirely client-side — no API call.
 * @param name  Ingredient name as entered by the user
 * @returns     Matching Rayon or null if no keyword matches
 */
export function suggestRayon(name: string): typeof RAYONS[number] | null {
  const lower = name.toLowerCase().trim()
  if (!lower) return null
  // Sort by key length descending: longer/more specific keywords (e.g. "lait vegetale")
  // are checked before shorter ones (e.g. "lait") to avoid premature partial matches.
  const entries = Object.entries(RAYON_KEYWORDS).sort((a, b) => b[0].length - a[0].length)
  for (const [keyword, rayon] of entries) {
    if (lower.includes(keyword)) return rayon
  }
  return null
}

/**
 * RAYON_ORDER Map — fast O(1) lookup of rayon position for sorting
 */
export const RAYON_ORDER = new Map<string, number>(
  RAYONS.map((rayon, index) => [rayon, index])
)

/**
 * rayonSortKey — returns the sort order for a rayon
 * Known rayons return their index; unknown rayons return max+1 (sorted to end)
 */
export function rayonSortKey(rayon: string): number {
  const key = RAYON_ORDER.get(rayon)
  return key !== undefined ? key : RAYONS.length // unknown rayons sort last
}

/**
 * normalizeUnit — standardizes unit strings for consolidation
 * Converts "g", "gram", "gramme" → "g"; "ml", "millilitre" → "ml"
 * Other units are preserved as-is (for counting units like "botte", "pièce")
 */
export function normalizeUnit(unit: string): string {
  const lower = unit.toLowerCase().trim()
  if (['g', 'gram', 'gramme'].includes(lower)) return 'g'
  if (['ml', 'millilitre', 'milliliter'].includes(lower)) return 'ml'
  return lower // unknown units preserved as-is
}

/**
 * aggregateShoppingList — consolidates ingredients from all recipes in a week plan
 * 
 * Algorithm:
 * 1. Filter slots to only those with recipeId !== null
 * 2. Build ingredient lookup Map for O(1) access by recipeId
 * 3. Accumulate ingredients by (name + normalizedUnit) key, summing quantities
 * 4. Incompatible units (e.g., "200g" + "1 botte" of same ingredient) remain separate
 * 5. Sort by rayon order, then by name
 * 
 * @param recipes All recipes in the system
 * @param weekPlan The current week's meal plan (28 slots)
 * @param ingredients All ingredients in the system
 * @returns Array of consolidated ShoppingItem objects, sorted by rayon and name
 * 
 * @example
 * aggregateShoppingList(recipes, weekPlan, ingredients)
 * // → [
 * //   { name: 'Pommes', quantity: 800, unit: 'g', rayon: 'Fruits & Légumes' },
 * //   { name: 'Carottes', quantity: 500, unit: 'g', rayon: 'Fruits & Légumes' },
 * //   { name: 'Beurre', quantity: 250, unit: 'g', rayon: 'Produits frais' },
 * //   { name: 'Farine', quantity: 350, unit: 'g', rayon: 'Épicerie' },
 * //   { name: 'Sel', quantity: 1, unit: 'botte', rayon: 'Épicerie' },
 * // ]
 */
export function aggregateShoppingList(
  recipes: Recipe[],
  weekPlan: WeekPlan,
  ingredients: Ingredient[],
): ShoppingItem[] {
  // Build ingredient lookup Map: recipeId → Ingredient[]
  const ingredientsByRecipeId = new Map<string, Ingredient[]>()
  
  for (const ingredient of ingredients) {
    const recipeId = ingredient.recipeId
    if (!ingredientsByRecipeId.has(recipeId)) {
      ingredientsByRecipeId.set(recipeId, [])
    }
    ingredientsByRecipeId.get(recipeId)!.push(ingredient)
  }

  // Accumulator: key = (name + '|' + normalizedUnit) → { quantity, unit, rayon, originalUnit }
  const accumulator = new Map<
    string,
    { quantity: number; unit: string; rayon: string; name: string }
  >()

  // Process only filled slots (recipeId !== null)
  for (const slot of weekPlan.slots) {
    if (!slot.recipeId) continue // Skip empty slots

    // Get all ingredients for this recipe
    const slotIngredients = ingredientsByRecipeId.get(slot.recipeId) ?? []

    for (const ingredient of slotIngredients) {
      const normalizedUnit = normalizeUnit(ingredient.unit)
      const key = `${ingredient.name}|${normalizedUnit}`

      if (accumulator.has(key)) {
        // Sum quantities for matching ingredient + unit
        const existing = accumulator.get(key)!
        existing.quantity += ingredient.quantity
      } else {
        // First occurrence of this ingredient
        accumulator.set(key, {
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit, // Preserve original unit for display
          rayon: ingredient.rayon,
        })
      }
    }
  }

  // Convert accumulator to ShoppingItem array
  const items: ShoppingItem[] = Array.from(accumulator.values())

  // Sort by rayon order, then by name
  items.sort((a, b) => {
    const rayonCmp = rayonSortKey(a.rayon) - rayonSortKey(b.rayon)
    if (rayonCmp !== 0) return rayonCmp
    return a.name.localeCompare(b.name)
  })

  return items
}
