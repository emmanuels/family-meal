import type { Recipe, Ingredient, MealSlot, WeekPlan } from '@/types/index'
import { RecipeSchema, IngredientSchema, MealSlotSchema, WeekPlanSchema } from '@/types/index'

// ─── FIELDS Constant ──────────────────────────────────────────────────────────
// CRITICAL: Only location in the codebase where French Airtable field names appear.
// All other files import typed domain objects — no French strings outside this file.

const FIELDS = {
  recipe: {
    customId: 'ID Recette',
    name: 'Nom',
    category: 'Catégorie',
    isVegetarian: 'Végétarien',
    season: 'Saison',
    notes: 'Notes',
    ingredientIds: 'Ingrédients',
  },
  planning: {
    date: 'Semaine',
    day: 'Jour',
    slotType: 'Type de repas',
    recipeIds: 'ID Recette',
    recipeName: 'Nom recette',
    notes: 'Notes',
  },
  ingredient: {
    customId: 'ID Ingrédient',
    recipeIds: 'ID Recette',
    name: 'Nom ingrédient',
    quantity: 'Quantité',
    unit: 'Unité',
    rayon: 'Rayon',
  },
} as const

// ─── Error Class ──────────────────────────────────────────────────────────────

export class AirtableError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message)
    this.name = 'AirtableError'
  }
}

// ─── Day Name → DayIndex Mapping ─────────────────────────────────────────────
// Airtable stores day as a French name string; we expose DayIndex (0 = Monday).

const DAY_NAME_TO_INDEX: Record<string, number> = {
  Lundi: 0,
  Mardi: 1,
  Mercredi: 2,
  Jeudi: 3,
  Vendredi: 4,
  Samedi: 5,
  Dimanche: 6,
}

// Slot type display order (Petit-déjeuner first, Goûter last)
const SLOT_TYPE_ORDER = [
  'Petit-déjeuner',
  'Déjeuner Midi',
  'Déjeuner Pique-nique',
  'Dîner',
  'Goûter',
] as const

// ─── Day Parsing ──────────────────────────────────────────────────────────────

/** Converts a French day name to DayIndex. Throws AirtableError on unrecognized names. */
function parseDayIndex(dayName: string | undefined, recordId: string): number {
  const index = DAY_NAME_TO_INDEX[dayName ?? '']
  if (index === undefined) {
    throw new AirtableError(
      `Unrecognized day name in Planning record "${recordId}": "${dayName}"`,
      502,
    )
  }
  return index
}

// ─── Week Utilities ───────────────────────────────────────────────────────────

/**
 * Converts an ISO week string "YYYY-WWW" → { start, end } in "YYYY-MM-DD".
 * start = Monday, end = Sunday of that ISO week.
 */
function weekIdToDateRange(weekId: string): { start: string; end: string } {
  const match = weekId.match(/^(\d{4})-W(\d{1,2})$/)
  if (!match) {
    throw new AirtableError(
      `Invalid week format "${weekId}" — expected YYYY-WWW (e.g. "2026-W10")`,
      400,
    )
  }
  const year = parseInt(match[1], 10)
  const weekNum = parseInt(match[2], 10)

  if (weekNum < 1 || weekNum > 53) {
    throw new AirtableError(
      `Invalid week number ${weekNum} in "${weekId}" — valid range is W01–W53`,
      400,
    )
  }

  // Jan 4 is always in ISO week 1 (ISO 8601)
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dow = jan4.getUTCDay() === 0 ? 7 : jan4.getUTCDay() // Mon=1 … Sun=7

  // Monday of week 1
  const weekOneMon = new Date(jan4)
  weekOneMon.setUTCDate(jan4.getUTCDate() - (dow - 1))

  // Monday of the requested week
  const monday = new Date(weekOneMon)
  monday.setUTCDate(weekOneMon.getUTCDate() + (weekNum - 1) * 7)

  // Sunday
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)

  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { start: fmt(monday), end: fmt(sunday) }
}

// ─── Internal Fetch Helpers ───────────────────────────────────────────────────

interface AirtableListResponse {
  records: Array<{ id: string; fields: Record<string, unknown> }>
  offset?: string
}

async function airtableFetch(
  table: string,
  params?: URLSearchParams,
): Promise<AirtableListResponse> {
  // Validate env vars on every call — fail fast with a clear message
  const apiKey = process.env.AIRTABLE_API_KEY
  const baseId = process.env.AIRTABLE_BASE_ID

  if (!apiKey) throw new AirtableError('AIRTABLE_API_KEY environment variable is not set', 500)
  if (!baseId) throw new AirtableError('AIRTABLE_BASE_ID environment variable is not set', 500)

  const baseUrl = `https://api.airtable.com/v0/${baseId}`
  const url = params
    ? `${baseUrl}/${encodeURIComponent(table)}?${params.toString()}`
    : `${baseUrl}/${encodeURIComponent(table)}`

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    const { status } = res
    if (status === 401) throw new AirtableError('Airtable authentication failed — check API key', 401)
    if (status === 404) throw new AirtableError(`Airtable table not found: "${table}"`, 404)
    if (status === 422) throw new AirtableError('Airtable formula or field name error', 422)
    if (status === 429) throw new AirtableError('Airtable rate limit exceeded — retry later', 429)
    throw new AirtableError(`Airtable API error ${status}`, status)
  }

  return res.json() as Promise<AirtableListResponse>
}

/**
 * Fetches ALL records from a table, consuming Airtable pagination automatically.
 * Prevents silent data truncation at the default 100-record page limit.
 */
async function airtableFetchAll(
  table: string,
  baseParams?: URLSearchParams,
): Promise<Array<{ id: string; fields: Record<string, unknown> }>> {
  const allRecords: Array<{ id: string; fields: Record<string, unknown> }> = []
  let offset: string | undefined

  do {
    const params = new URLSearchParams(baseParams)
    if (offset) params.set('offset', offset)
    const page = await airtableFetch(table, params)
    allRecords.push(...page.records)
    offset = page.offset
  } while (offset)

  return allRecords
}

// ─── Record Mappers ───────────────────────────────────────────────────────────

type RawFields = Record<string, unknown>

function mapRecipe(id: string, fields: RawFields): Recipe {
  return RecipeSchema.parse({
    id,
    customId: fields[FIELDS.recipe.customId] ?? '',
    name: fields[FIELDS.recipe.name] ?? '',
    category: fields[FIELDS.recipe.category] ?? '',
    isVegetarian: fields[FIELDS.recipe.isVegetarian] === 'TRUE',
    season: fields[FIELDS.recipe.season] ?? 'Toutes saisons',
    notes: (fields[FIELDS.recipe.notes] as string | undefined) ?? null,
    ingredientIds: (fields[FIELDS.recipe.ingredientIds] as string[] | undefined) ?? [],
  })
}

function mapMealSlot(id: string, fields: RawFields): MealSlot {
  const dayName = fields[FIELDS.planning.day] as string | undefined
  const recipeIds = fields[FIELDS.planning.recipeIds] as string[] | undefined
  return MealSlotSchema.parse({
    id,
    date: fields[FIELDS.planning.date] ?? '',
    day: parseDayIndex(dayName, id),
    slotType: fields[FIELDS.planning.slotType] ?? '',
    recipeId: recipeIds?.[0] ?? null,
    recipeName: (fields[FIELDS.planning.recipeName] as string | undefined) ?? null,
    notes: (fields[FIELDS.planning.notes] as string | undefined) ?? null,
  })
}

function mapIngredient(id: string, fields: RawFields): Ingredient {
  const recipeIds = fields[FIELDS.ingredient.recipeIds] as string[] | undefined
  return IngredientSchema.parse({
    id,
    customId: fields[FIELDS.ingredient.customId] ?? '',
    name: fields[FIELDS.ingredient.name] ?? '',
    quantity: fields[FIELDS.ingredient.quantity] ?? 0,
    unit: fields[FIELDS.ingredient.unit] ?? '',
    rayon: fields[FIELDS.ingredient.rayon] ?? '',
    recipeId: recipeIds?.[0] ?? '',
  })
}

// ─── Public Service Functions ─────────────────────────────────────────────────

/** Fetch the complete recipe library (all pages). */
export async function getRecipes(): Promise<Recipe[]> {
  const records = await airtableFetchAll('Recettes')
  return records.map(({ id, fields }) => mapRecipe(id, fields))
}

/**
 * Fetch all planning slots for a given ISO week.
 * @param weekId  ISO week string "YYYY-WWW" (e.g. "2026-W10")
 */
export async function getWeekPlan(weekId: string): Promise<WeekPlan> {
  const { start, end } = weekIdToDateRange(weekId)

  // Field names referenced via FIELDS const — never hardcoded in formula strings
  const params = new URLSearchParams({
    filterByFormula: `AND(NOT(IS_BEFORE({${FIELDS.planning.date}}, '${start}')), NOT(IS_AFTER({${FIELDS.planning.date}}, '${end}')))`,
  })

  const records = await airtableFetchAll('Planning', params)

  const slots = records
    .map(({ id, fields }) => mapMealSlot(id, fields))
    .sort((a, b) => {
      if (a.day !== b.day) return a.day - b.day
      return (
        (SLOT_TYPE_ORDER as readonly string[]).indexOf(a.slotType) -
        (SLOT_TYPE_ORDER as readonly string[]).indexOf(b.slotType)
      )
    })

  return WeekPlanSchema.parse({ weekId, weekStart: start, slots })
}

/**
 * Fetch all ingredients for a given recipe's Airtable record ID.
 * @param recipeId  Airtable record ID (e.g. "rec3UYmUC66UCFfoF")
 */
export async function getIngredients(recipeId: string): Promise<Ingredient[]> {
  // Field name referenced via FIELDS const — not hardcoded in the formula string
  const params = new URLSearchParams({
    filterByFormula: `FIND("${recipeId}", ARRAYJOIN({${FIELDS.ingredient.recipeIds}}, ","))`,
  })
  const records = await airtableFetchAll('Ingrédients', params)
  return records.map(({ id, fields }) => mapIngredient(id, fields))
}
