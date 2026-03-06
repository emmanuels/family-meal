import { ZodError } from 'zod'
import { getAllIngredients, AirtableError } from '@/lib/airtable'

export async function GET() {
  try {
    const ingredients = await getAllIngredients()
    return Response.json(ingredients)
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
