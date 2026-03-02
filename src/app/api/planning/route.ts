import type { NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { getWeekPlan, AirtableError } from '@/lib/airtable'

export async function GET(request: NextRequest) {
  const week = request.nextUrl.searchParams.get('week')

  if (!week) {
    return Response.json(
      { error: 'Missing required query param: week (format: YYYY-WWW)', code: 400 },
      { status: 400 },
    )
  }

  try {
    const weekPlan = await getWeekPlan(week)
    return Response.json(weekPlan)
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
