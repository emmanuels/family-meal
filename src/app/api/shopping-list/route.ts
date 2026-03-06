import type { NextRequest } from 'next/server'
import { z, ZodError } from 'zod'
import { getWeekPlan, getRecipes, getAllIngredients, AirtableError } from '@/lib/airtable'
import { aggregateShoppingList } from '@/lib/utils'

/**
 * GET /api/shopping-list?week=YYYY-WWW
 * 
 * Returns a consolidated shopping list for the specified week.
 * 
 * Aggregation runs on the server (not the client) to satisfy NFR3 (< 1s response).
 * The server sends a pre-sorted, pre-consolidated list to the client.
 * 
 * Query Parameters:
 *   week: ISO week string "YYYY-WWW" (required, e.g., "2026-W10")
 * 
 * Response: ShoppingItem[]
 *   [
 *     { name: "Pommes", quantity: 800, unit: "g", rayon: "Fruits & Légumes" },
 *     { name: "Beurre", quantity: 250, unit: "g", rayon: "Produits frais" },
 *     ...
 *   ]
 */
const SearchParamsSchema = z.object({
  week: z.string().regex(/^\d{4}-W\d{1,2}$/, 'Invalid week format (expected YYYY-WWW)'),
})

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const { week } = SearchParamsSchema.parse({
      week: request.nextUrl.searchParams.get('week'),
    })

    // Fetch week plan and recipes in parallel for better performance
    const [weekPlan, recipes, ingredients] = await Promise.all([
      getWeekPlan(week),
      getRecipes(),
      getAllIngredients(),
    ])

    // Aggregate ingredients from all recipes in the week plan
    const shoppingList = aggregateShoppingList(recipes, weekPlan, ingredients)

    return Response.json(shoppingList)
  } catch (err) {
    if (err instanceof ZodError) {
      return Response.json(
        {
          error: 'Invalid query parameters — expected ?week=YYYY-WWW (e.g., ?week=2026-W10)',
          code: 400,
        },
        { status: 400 },
      )
    }
    if (err instanceof AirtableError) {
      return Response.json(
        { error: err.message, code: err.statusCode },
        { status: err.statusCode },
      )
    }
    // Fallback for unexpected errors
    return Response.json(
      { error: 'Internal server error', code: 500 },
      { status: 500 },
    )
  }
}
