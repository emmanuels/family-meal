import { getRecipes, AirtableError } from '@/lib/airtable'

export async function GET() {
  try {
    const recipes = await getRecipes()
    return Response.json(recipes)
  } catch (err) {
    if (err instanceof AirtableError) {
      return Response.json(
        { error: err.message, code: err.statusCode },
        { status: err.statusCode },
      )
    }
    return Response.json({ error: 'Internal server error', code: 500 }, { status: 500 })
  }
}
