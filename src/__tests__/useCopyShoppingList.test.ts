/**
 * useCopyShoppingList Hook Tests
 * 
 * ⚠️ TEST INSTALLATION REQUIRED:
 * Run: pnpm add -D vitest @testing-library/react @testing-library/react-hooks
 * 
 * These test templates are ready to execute once vitest is installed in package.json.
 * 
 * Test Cases (8 total):
 * TC1: Format shopping list with rayon headers
 * TC2: Fetch endpoint with current week parameter
 * TC3: Copy to clipboard on success
 * TC4: Error handling - network failure
 * TC5: Clipboard fallback - API unavailable
 * TC6: Loading state during fetch
 * TC7: Empty shopping list handling
 * TC8: Rapid clicks with disabled state
 * 
 * To implement:
 * 1. Install vitest and dependencies above
 * 2. Create .test files with describe/it blocks
 * 3. Mock fetch, navigator.clipboard, and Zustand store
 * 4. Assert on hook return values and side effects
 */

export const TESTS_PLACEHOLDER = `
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCopyShoppingList } from '@/hooks/useCopyShoppingList'
import type { ShoppingItem } from '@/types/index'

describe('useCopyShoppingList', () => {
  it('TC1: Format shopping list with rayon headers', () => {
    // Mock hook and verify formatShoppingList output
    // Expected: Rayon headers with items grouped correctly
  })

  it('TC2: Fetch endpoint with current week', async () => {
    // Mock fetch and verify call to /api/shopping-list?week={{currentWeek}}
  })

  it('TC3: Copy to clipboard on success', async () => {
    // Verify navigator.clipboard.writeText called and success toast shown
  })

  it('TC4: Error handling - network failure', async () => {
    // Verify error state and error toast on fetch failure
  })

  it('TC5: Clipboard fallback - API unavailable', async () => {
    // Set navigator.clipboard to null and verify clipboardAvailable = false
  })

  it('TC6: Loading state during fetch', async () => {
    // Verify isLoading = true during fetch, false after
  })

  it('TC7: Empty shopping list handling', async () => {
    // Fetch returns empty array, verify no copy and warning toast
  })

  it('TC8: Rapid clicks with disabled state', async () => {
    // Verify button disabled prevents multiple simultaneous calls
  })
})
`
// Transition: isLoading = false after response
// Prevents: Multiple simultaneous requests

// ─── Test Case 7: Empty shopping list handling ────────────────────────────────
// Scenario: No meals planned (shopping list empty)
// Expected: formatShoppingList() returns "Aucun repas planifié pour cette semaine"
// Copy: Doesn't copy empty list (prevent accidental blank clipboard)
// UX: Maybe show info toast instead

// ─── Test Case 8: Rapid clicks debouncing ────────────────────────────────────
// Scenario: User rapid-clicks FAB 3 times while loading
// Expected: Only 1 API request made, not 3
// Implementation: Button disabled during isLoading, prevents multiple calls

export const TEST_PLAN = 'See comments above for comprehensive test cases'