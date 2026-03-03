import type { NextRequest } from 'next/server'
import { z, ZodError } from 'zod'
import { getWeekPlan, updatePlanningSlot, updatePlanningSlotNotes, duplicateWeekPlan, AirtableError } from '@/lib/airtable'

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

const PatchBodySchema = z
  .object({
    slotId: z.string().min(1),
    recipeId: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .refine((data) => data.recipeId !== undefined || data.notes !== undefined, {
    message: 'Either recipeId or notes must be provided',
  })

const PostBodySchema = z.object({
  action: z.literal('duplicate'),
  fromWeek: z.string().regex(/^\d{4}-W\d{1,2}$/),
  toWeek: z.string().regex(/^\d{4}-W\d{1,2}$/),
})

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body', code: 400 }, { status: 400 })
  }

  try {
    const { fromWeek, toWeek } = PostBodySchema.parse(body)
    const weekPlan = await duplicateWeekPlan(fromWeek, toWeek)
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
        { error: 'Invalid request body — expected { action: "duplicate", fromWeek, toWeek }', code: 400 },
        { status: 400 },
      )
    }
    return Response.json({ error: 'Internal server error', code: 500 }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body', code: 400 }, { status: 400 })
  }

  try {
    const { slotId, recipeId, notes } = PatchBodySchema.parse(body)
    if (recipeId !== undefined) {
      await updatePlanningSlot(slotId, recipeId ?? null)
    } else {
      await updatePlanningSlotNotes(slotId, notes ?? null)
    }
    return Response.json({ ok: true })
  } catch (err) {
    if (err instanceof AirtableError) {
      return Response.json(
        { error: err.message, code: err.statusCode },
        { status: err.statusCode },
      )
    }
    if (err instanceof ZodError) {
      return Response.json(
        { error: 'Invalid request body — expected { slotId, recipeId? } or { slotId, notes? }', code: 400 },
        { status: 400 },
      )
    }
    return Response.json({ error: 'Internal server error', code: 500 }, { status: 500 })
  }
}
