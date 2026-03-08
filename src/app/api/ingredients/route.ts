import type { NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { getAllIngredients, AirtableError } from '@/lib/airtable'
import { getFamilyCodeFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const familyCode = getFamilyCodeFromRequest(request)
  if (!familyCode) {
    return Response.json({ error: 'Authentication required', code: 401 }, { status: 401 })
  }

  try {
    const ingredients = await getAllIngredients(familyCode)
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
