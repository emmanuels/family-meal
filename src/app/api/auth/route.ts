import { NextRequest, NextResponse } from 'next/server'

// ─── POST /api/auth — validate passphrase, set cookie ────────────────────────

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? ''
  let code: string | null = null
  let redirect = '/'

  // Parse body: support both JSON (fetch) and form-urlencoded (native form POST)
  if (contentType.includes('application/json')) {
    const body = await request.json() as { code?: string; redirect?: string }
    code = body.code ?? null
    redirect = body.redirect ?? '/'
  } else {
    // application/x-www-form-urlencoded (native <form method="POST">)
    const form = await request.formData()
    code = form.get('code') as string | null
    redirect = (form.get('redirect') as string | null) ?? '/'
  }

  // Sanitize redirect to prevent open redirect — only allow relative paths (H1)
  if (!redirect.startsWith('/')) redirect = '/'

  const validCode = process.env.FAMILY_CODE
  if (!validCode) {
    return NextResponse.json(
      { error: 'FAMILY_CODE not configured', code: 500 },
      { status: 500 }
    )
  }

  // Constant-time comparison to prevent timing attacks (AC2)
  const isValid =
    code !== null &&
    code.length === validCode.length &&
    Buffer.from(code).equals(Buffer.from(validCode))

  if (!isValid) {
    // Slow down brute-force attempts (M1)
    await new Promise((r) => setTimeout(r, 500))
    // Form flow: redirect back to login with error param (AC3)
    if (!contentType.includes('application/json')) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('error', '1')
      loginUrl.searchParams.set('redirect', redirect)
      return NextResponse.redirect(loginUrl, { status: 303 })
    }
    // JSON flow: return 401 (AC3)
    return NextResponse.json(
      { error: 'Code famille incorrect', code: 401 },
      { status: 401 }
    )
  }

  // Success — set HTTP-only cookie and redirect to original destination (AC2)
  const response = NextResponse.redirect(new URL(redirect, request.url), { status: 303 })
  response.cookies.set('fm_family', validCode, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 2592000, // 30 days
    path: '/',
  })
  return response
}

// ─── DELETE /api/auth — clear cookie (logout) ────────────────────────────────

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete('fm_family')
  return response
}
