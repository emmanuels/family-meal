import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns the weekId for the next or previous ISO week.
 * @param weekId ISO week string "YYYY-WWW" (e.g., "2026-W10")
 * @param delta  +1 for next week, -1 for previous week
 * Note: simplified 52-week assumption for V1 — adequate for production use.
 */
export function getAdjacentWeek(weekId: string, delta: 1 | -1): string {
  const match = weekId.match(/^(\d{4})-W(\d{1,2})$/)
  if (!match) throw new Error(`Invalid weekId: ${weekId}`)

  let year = parseInt(match[1], 10)
  let week = parseInt(match[2], 10) + delta

  if (week < 1) {
    year -= 1
    week = 52 // Simplified: most years have 52 weeks
  } else if (week > 52) {
    year += 1
    week = 1
  }

  return `${year}-W${String(week).padStart(2, '0')}`
}
