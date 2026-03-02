'use client'

export function ErrorBanner() {
  return (
    <div className="mx-4 mt-4 border-l-4 border-terracotta bg-warm p-3">
      <p className="text-sm text-charcoal">
        Unable to load the meal plan. Check your connection and try again.
      </p>
    </div>
  )
}
