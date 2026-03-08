// Server Component — no 'use client' needed; native form POST works without JS

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string; error?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { redirect, error } = await searchParams
  const redirectTo = redirect ?? '/'
  const hasError = error === '1'

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm">
        {/* App name */}
        <h1 className="mb-8 text-center font-playfair text-3xl font-semibold text-charcoal">
          FamilyMeal
        </h1>

        <form
          method="POST"
          action="/api/auth"
          className="flex flex-col gap-4 rounded-xl border border-warm bg-white p-6 shadow-sm"
        >
          {/* Error message (AC3) */}
          {hasError && (
            <p role="alert" className="text-center text-sm text-terracotta">
              Code famille incorrect
            </p>
          )}

          {/* Hidden redirect field — forwarded to /api/auth (AC2) */}
          <input type="hidden" name="redirect" value={redirectTo} />

          {/* Password input (AC5) */}
          <label htmlFor="code-input" className="sr-only">
            Code famille
          </label>
          <input
            id="code-input"
            type="password"
            name="code"
            placeholder="Code famille"
            autoComplete="current-password"
            required
            className="w-full rounded-lg border border-warm bg-cream px-4 py-3 text-sm text-charcoal placeholder:text-charcoal/40 focus:border-sage focus:outline-none focus:ring-1 focus:ring-sage"
          />

          {/* Submit button (AC5) */}
          <button
            type="submit"
            className="w-full rounded-lg bg-sage px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-sage/90 active:bg-sage/80"
          >
            Accéder
          </button>
        </form>
      </div>
    </main>
  )
}
