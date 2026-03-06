import { describe, it, expect, beforeEach, vi } from 'vitest'
import { aggregateShoppingList, RAYONS, rayonSortKey, normalizeUnit } from '@/lib/utils'
import type { Recipe, Ingredient, WeekPlan, MealSlot, ShoppingItem, MealType } from '@/types/index'

describe('Shopping List Aggregation', () => {
  let mockRecipes: Recipe[]
  let mockIngredients: Ingredient[]
  let mockWeekPlan: WeekPlan

  beforeEach(() => {
    // Set up mock data
    mockRecipes = [
      {
        id: 'rec-recipe-1',
        customId: 'R001',
        name: 'Pâtes Carbonara',
        category: 'Dîner' as MealType,
        isVegetarian: false,
        season: 'Toutes saisons',
        notes: null,
        ingredientIds: ['rec-ing-1', 'rec-ing-2', 'rec-ing-3'],
      },
      {
        id: 'rec-recipe-2',
        customId: 'R002',
        name: 'Salade Niçoise',
        category: 'Déjeuner Midi' as MealType,
        isVegetarian: true,
        season: 'Printemps / Été',
        notes: null,
        ingredientIds: ['rec-ing-1', 'rec-ing-4', 'rec-ing-5'],
      },
    ]

    mockIngredients = [
      // Recipe 1 ingredients
      {
        id: 'rec-ing-1',
        customId: 'I001',
        name: 'Œufs',
        quantity: 4,
        unit: 'pièce',
        rayon: 'Produits frais',
        recipeId: 'rec-recipe-1',
      },
      {
        id: 'rec-ing-2',
        customId: 'I002',
        name: 'Pâtes',
        quantity: 400,
        unit: 'g',
        rayon: 'Épicerie',
        recipeId: 'rec-recipe-1',
      },
      {
        id: 'rec-ing-3',
        customId: 'I003',
        name: 'Lardons',
        quantity: 200,
        unit: 'g',
        rayon: 'Produits frais',
        recipeId: 'rec-recipe-1',
      },
      // Recipe 2 ingredients
      {
        id: 'rec-ing-4',
        customId: 'I004',
        name: 'Tomates',
        quantity: 500,
        unit: 'g',
        rayon: 'Fruits & Légumes',
        recipeId: 'rec-recipe-2',
      },
      {
        id: 'rec-ing-5',
        customId: 'I005',
        name: 'Œufs',
        quantity: 2,
        unit: 'pièce',
        rayon: 'Produits frais',
        recipeId: 'rec-recipe-2',
      },
    ]

    // Create a minimal week plan with 2 filled slots
    const baseSlot: Omit<MealSlot, 'id' | 'recipeId' | 'recipeName' | 'notes'> = {
      date: '2026-03-04',
      day: 0, // Monday
      slotType: 'Dîner' as MealType,
    }

    const slots: MealSlot[] = []
    const mealTypes: MealType[] = ['Petit-déjeuner', 'Déjeuner Midi', 'Dîner', 'Goûter']

    for (let i = 0; i < 28; i++) {
      if (i === 0) {
        slots.push({
          id: `slot-${i}`,
          ...baseSlot,
          recipeId: 'rec-recipe-1',
          recipeName: 'Pâtes Carbonara',
          notes: null,
        })
      } else if (i === 1) {
        slots.push({
          id: `slot-${i}`,
          ...baseSlot,
          day: 0,
          slotType: 'Déjeuner Midi' as MealType,
          recipeId: 'rec-recipe-2',
          recipeName: 'Salade Niçoise',
          notes: null,
        })
      } else {
        slots.push({
          id: `slot-${i}`,
          ...baseSlot,
          day: Math.floor(i / 4),
          slotType: mealTypes[i % 4],
          recipeId: null,
          recipeName: null,
          notes: null,
        })
      }
    }

    mockWeekPlan = {
      weekId: '2026-W10',
      weekStart: '2026-03-02',
      slots,
    }
  })

  describe('rayonSortKey', () => {
    it('should return correct index for known rayon', () => {
      expect(rayonSortKey('Fruits & Légumes')).toBe(0)
      expect(rayonSortKey('Produits frais')).toBe(1)
      expect(rayonSortKey('Épicerie')).toBe(2)
      expect(rayonSortKey('Surgelés')).toBe(3)
      expect(rayonSortKey('Boissons')).toBe(4)
    })

    it('should return max+1 for unknown rayon', () => {
      expect(rayonSortKey('Imaginary Rayon')).toBe(RAYONS.length)
      expect(rayonSortKey('Unknown')).toBe(RAYONS.length)
    })
  })

  describe('aggregateShoppingList', () => {
    it('should aggregate ingredients from all filled slots', () => {
      const result = aggregateShoppingList(mockRecipes, mockWeekPlan, mockIngredients)

      // Should have 5 unique ingredient items
      expect(result.length).toBe(5)
      expect(result.some((item) => item.name === 'Œufs')).toBe(true)
      expect(result.some((item) => item.name === 'Pâtes')).toBe(true)
    })

    it('should consolidate same ingredient + unit by summing quantities', () => {
      const result = aggregateShoppingList(mockRecipes, mockWeekPlan, mockIngredients)

      // Œufs appears in both recipes with unit 'pièce': 4 + 2 = 6
      const eggsItem = result.find((item) => item.name === 'Œufs')
      expect(eggsItem).toBeDefined()
      expect(eggsItem?.quantity).toBe(6)
      expect(eggsItem?.unit).toBe('pièce')
    })

    it('should only include ingredients from filled slots', () => {
      const result = aggregateShoppingList(mockRecipes, mockWeekPlan, mockIngredients)

      // Only 2 slots are filled in mockWeekPlan, so only ingredients from those 2 recipes
      const hasOnlyExpectedIngredients = result.every((item) =>
        ['Œufs', 'Pâtes', 'Lardons', 'Tomates'].includes(item.name),
      )
      expect(hasOnlyExpectedIngredients).toBe(true)
    })

    it('should skip empty slots (recipeId === null)', () => {
      const weekWithAllEmpty: WeekPlan = {
        ...mockWeekPlan,
        slots: mockWeekPlan.slots.map((slot) => ({
          ...slot,
          recipeId: null,
          recipeName: null,
        })),
      }

      const result = aggregateShoppingList(mockRecipes, weekWithAllEmpty, mockIngredients)
      expect(result.length).toBe(0)
    })

    it('should sort by rayon order first', () => {
      const result = aggregateShoppingList(mockRecipes, mockWeekPlan, mockIngredients)

      // Check that rayons are in the correct order
      const rayonSequence = result.map((item) => rayonSortKey(item.rayon))
      for (let i = 1; i < rayonSequence.length; i++) {
        expect(rayonSequence[i]).toBeGreaterThanOrEqual(rayonSequence[i - 1])
      }
    })

    it('should sort by name within same rayon', () => {
      const result = aggregateShoppingList(mockRecipes, mockWeekPlan, mockIngredients)

      // Group by rayon and check name sorting within each group
      const grouped: Record<string, ShoppingItem[]> = {}
      for (const item of result) {
        if (!grouped[item.rayon]) grouped[item.rayon] = []
        grouped[item.rayon].push(item)
      }

      for (const items of Object.values(grouped)) {
        for (let i = 1; i < items.length; i++) {
          expect(items[i].name.localeCompare(items[i - 1].name)).toBeGreaterThanOrEqual(0)
        }
      }
    })

    it('should handle incompatible units as separate items', () => {
      // Add another egg ingredient with incompatible unit
      const extendedIngredients: Ingredient[] = [
        ...mockIngredients,
        {
          id: 'rec-ing-6',
          customId: 'I006',
          name: 'Œufs',
          quantity: 12,
          unit: 'botte', // incompatible with 'pièce'
          rayon: 'Produits frais',
          recipeId: 'rec-recipe-1',
        },
      ]

      // Update mock recipe to include the new ingredient
      mockRecipes[0]!.ingredientIds.push('rec-ing-6')

      const result = aggregateShoppingList(mockRecipes, mockWeekPlan, extendedIngredients)

      // Should have 2 separate egg items: one with quantity 6 unit 'pièce', one with 12 unit 'botte'
      const eggItems = result.filter((item) => item.name === 'Œufs')
      expect(eggItems.length).toBe(2)
      expect(eggItems.some((item) => item.unit === 'pièce' && item.quantity === 6)).toBe(true)
      expect(eggItems.some((item) => item.unit === 'botte' && item.quantity === 12)).toBe(true)
    })

    it('should preserve rayon value for each item', () => {
      const result = aggregateShoppingList(mockRecipes, mockWeekPlan, mockIngredients)

      for (const item of result) {
        expect(item.rayon).toBeTruthy()
        // Each item should have a valid rayon (either in RAYONS or a custom one)
        expect(typeof item.rayon).toBe('string')
      }
    })
  })
})
