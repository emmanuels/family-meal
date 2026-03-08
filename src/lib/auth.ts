import type { NextRequest } from 'next/server'

// ─── Session Cookie Helper ─────────────────────────────────────────────────────
// Server-only utility — do NOT import from client components.

/**
 * Extract the family code from the fm_family HTTP-only cookie.
 * Returns null if the cookie is absent or empty.
 * Middleware is the primary auth guard; this is defense-in-depth for API routes.
 */
export function getFamilyCodeFromRequest(request: NextRequest): string | null {
  return request.cookies.get('fm_family')?.value ?? null
}
