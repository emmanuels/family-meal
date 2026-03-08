import type { NextRequest } from 'next/server'
import { z, ZodError } from 'zod'
import { getWeekPlan, updatePlanningSlot, updatePlanningSlotNotes, duplicateWeekPlan, createPlanningSlot, AirtableError } from '@/lib/airtable'
import { getFamilyCodeFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const familyCode = getFamilyCodeFromRequest(request)
  if (!familyCode) {
    return Response.json({ error: 'Authentication required', code: 401 }, { status: 401 })
  }

  const week = request.nextUrl.searchParams.get('week')

  if (!week) {
    return Response.json(
      { error: 'Missing required query param: week (format: YYYY-WWW)', code: 400 },
      { status: 400 },
    )
  }

  try {
    const weekPlan = await getWeekPlan(week, familyCode)
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
  const familyCode = getFamilyCodeFromRequest(request)
  if (!familyCode) {
    return Response.json({ error: 'Authentication required', code: 401 }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body', code: 400 }, { status: 400 })
  }

  try {
    const { fromWeek, toWeek } = PostBodySchema.parse(body)
    const weekPlan = await duplicateWeekPlan(fromWeek, toWeek, familyCode)
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
  const familyCode = getFamilyCodeFromRequest(request)
  if (!familyCode) {
    return Response.json({ error: 'Authentication required', code: 401 }, { status: 401 })
  }
  // Note: updatePlanningSlot/updatePlanningSlotNotes operate by Airtable record ID.
  // Ownership verification (confirming the slot's Famille matches familyCode before
  // patching) is an accepted risk for V1 — slot IDs are opaque and not user-discoverable.
  // If multi-family becomes adversarial, add a GET + Famille check before patching.

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body', code: 400 }, { status: 400 })
  }

  try {
    const { slotId, recipeId, notes } = PatchBodySchema.parse(body)
    
    // Support both recipeId and notes in a single call (for Story 3.6 swaps)
    if (recipeId !== undefined && notes !== undefined) {
      await updatePlanningSlot(slotId, recipeId ?? null)
      await updatePlanningSlotNotes(slotId, notes ?? null)
    } else if (recipeId !== undefined) {
      await updatePlanningSlot(slotId, recipeId ?? null)
    } else if (notes !== undefined) {
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
        { error: 'Invalid request body — expected { slotId, recipeId? } or { slotId, notes? } or both', code: 400 },
        { status: 400 },
      )
    }
    return Response.json({ error: 'Internal server error', code: 500 }, { status: 500 })
  }
}

const PutBodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dayIndex: z.number().min(0).max(6),
  mealType: z.string().min(1),
  recipeId: z.string().min(1),
})

export async function PUT(request: NextRequest) {
  const familyCode = getFamilyCodeFromRequest(request)
  if (!familyCode) {
    return Response.json({ error: 'Authentication required', code: 401 }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body', code: 400 }, { status: 400 })
  }

  try {
    const { date, dayIndex, mealType, recipeId } = PutBodySchema.parse(body)
    const id = await createPlanningSlot(date, dayIndex, mealType, recipeId, familyCode)
    return Response.json({ id })
  } catch (err) {
    if (err instanceof AirtableError) {
      return Response.json(
        { error: err.message, code: err.statusCode },
        { status: err.statusCode },
      )
    }
    if (err instanceof ZodError) {
      return Response.json(
        { error: 'Invalid request body — expected { date, dayIndex, mealType, recipeId }', code: 400 },
        { status: 400 },
      )
    }
    return Response.json({ error: 'Internal server error', code: 500 }, { status: 500 })
  }
}
