import { NextRequest, NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import type { Recipe } from '@/types/index'
import { MealTypeSchema, SeasonSchema } from '@/types/index'
import { getRecipes, AirtableError, FIELDS } from '@/lib/airtable'
import { getFamilyCodeFromRequest } from '@/lib/auth'

// ─── Request Validation Schemas ───────────────────────────────────────────────

const IngredientInputSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().min(0),
  unit: z.string(),
  rayon: z.string(),
})

const RecipeCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name max 100 chars'),
  category: MealTypeSchema,
  isVegetarian: z.boolean(),
  prepTime: z.number().min(0).max(500),
  season: SeasonSchema,
  ingredients: z.array(IngredientInputSchema).optional().default([]),
})

type RecipeCreateRequest = z.infer<typeof RecipeCreateSchema>
type IngredientInput = z.infer<typeof IngredientInputSchema>

// ─── GET Handler (Read all recipes) ────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const familyCode = getFamilyCodeFromRequest(request)
  if (!familyCode) {
    return Response.json({ error: 'Authentication required', code: 401 }, { status: 401 })
  }

  try {
    const recipes = await getRecipes(familyCode)
    return Response.json(recipes)
  } catch (err) {
    if (err instanceof AirtableError) {
      return Response.json(
        { error: err.message, code: err.statusCode },
        { status: err.statusCode },
      )
    }
    if (err instanceof ZodError) {
      return Response.json(
        { error: 'Data validation error — Airtable schema may have changed', code: 502 },
        { status: 502 },
      )
    }
    return Response.json({ error: 'Internal server error', code: 500 }, { status: 500 })
  }
}

// ─── POST Handler (Create new recipe) ──────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  const familyCode = getFamilyCodeFromRequest(request)
  if (!familyCode) {
    return NextResponse.json({ error: 'Authentication required', code: 401 }, { status: 401 })
  }

  try {
    // Parse request body
    const body = await request.json()

    // Validate request with Zod
    let validatedData: RecipeCreateRequest
    try {
      validatedData = RecipeCreateSchema.parse(body)
    } catch (validationError) {
      if (validationError instanceof ZodError) {
        const firstError = validationError.issues[0]
        return NextResponse.json(
          {
            error: 'Validation failed',
            field: firstError.path.join('.'),
            message: firstError.message,
          },
          { status: 400 },
        )
      }
      throw validationError
    }

    // Get environment variables
    const baseId = process.env.AIRTABLE_BASE_ID
    const apiKey = process.env.AIRTABLE_API_KEY

    if (!baseId || !apiKey) {
      console.error('Missing Airtable credentials')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 },
      )
    }

    // Build Airtable request body using FIELDS mapping
    const airtableBody = {
      fields: {
        [FIELDS.recipe.name]: validatedData.name,
        [FIELDS.recipe.category]: validatedData.category,
        [FIELDS.recipe.isVegetarian]: validatedData.isVegetarian ? 'TRUE' : 'FALSE',
        [FIELDS.recipe.season]: validatedData.season,
        [FIELDS.recipe.famille]: familyCode,
      },
    }

    // Call Airtable REST API
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/Recettes`
    const airtableResponse = await fetch(airtableUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(airtableBody),
    })

    if (!airtableResponse.ok) {
      const airtableError = await airtableResponse.json().catch(() => ({}))
      console.error('Airtable error:', airtableError)

      // Parse actual error message from Airtable
      const errorMessage = airtableError.error?.message || 'Failed to create recipe'

      return NextResponse.json(
        {
          error: 'Failed to create recipe',
          message: errorMessage,
        },
        { status: airtableResponse.status === 422 ? 400 : 500 },
      )
    }

    const airtableRecord = await airtableResponse.json()
    const recordId = airtableRecord.id

    // Write each ingredient to the Ingrédients table (sequential — Airtable free tier: 5 req/s)
    const validIngredients: IngredientInput[] = validatedData.ingredients.filter(
      (i) => i.name.trim() !== '',
    )
    const failedIngredients: string[] = []
    for (const ingredient of validIngredients) {
      try {
        const ingredientUrl = `https://api.airtable.com/v0/${baseId}/Ingrédients`
        const ingredientResponse = await fetch(ingredientUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fields: {
              [FIELDS.ingredient.name]: ingredient.name,
              [FIELDS.ingredient.quantity]: ingredient.quantity,
              [FIELDS.ingredient.unit]: ingredient.unit,
              [FIELDS.ingredient.rayon]: ingredient.rayon,
              [FIELDS.ingredient.recipeIds]: [recordId],
              [FIELDS.ingredient.famille]: familyCode,
            },
          }),
        })
        if (!ingredientResponse.ok) {
          const err = await ingredientResponse.json().catch(() => ({}))
          console.error('Airtable ingredient error:', ingredient.name, err)
          failedIngredients.push(ingredient.name)
        }
      } catch (err) {
        console.error('Failed to create ingredient:', ingredient.name, err)
        failedIngredients.push(ingredient.name)
      }
    }

    // Build response with created recipe
    const createdRecipe: Recipe = {
      id: recordId,
      customId: '', // Will be populated by Airtable formula
      name: validatedData.name,
      category: validatedData.category,
      isVegetarian: validatedData.isVegetarian,
      season: validatedData.season,
      notes: null,
      ingredientIds: [],
    }

    return NextResponse.json(
      failedIngredients.length > 0
        ? { ...createdRecipe, ingredientWarnings: failedIngredients }
        : createdRecipe,
      { status: 200 },
    )
  } catch (error) {
    console.error('Recipe creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
