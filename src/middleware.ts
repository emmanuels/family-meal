import { NextRequest, NextResponse } from 'next/server'

// ─── Exempt paths — never redirected or blocked ───────────────────────────────

const EXEMPT_PATHS = ['/login', '/api/auth']

function isExempt(pathname: string): boolean {
  return EXEMPT_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Already authenticated or accessing exempt route — let it through
  const familyCode = request.cookies.get('fm_family')?.value
  const validCode = process.env.FAMILY_CODE
  if ((validCode && familyCode === validCode) || isExempt(pathname)) {
    return NextResponse.next()
  }

  // API routes (excluding /api/auth) → 401 JSON
  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'Authentication required', code: 401 },
      { status: 401 }
    )
  }

  // Page routes → redirect to /login with return path
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('redirect', pathname)
  return NextResponse.redirect(loginUrl, { status: 307 })
}

// ─── Matcher — exclude static assets ─────────────────────────────────────────

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
