import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'

export async function POST(request: Request) {
  const { password } = await request.json()

  const expected = process.env.ADMIN_PASSWORD ?? ''
  const valid =
    password.length === expected.length &&
    timingSafeEqual(Buffer.from(password), Buffer.from(expected))

  if (!valid) {
    return NextResponse.json({ error: 'Senha incorreta.' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set('admin_session', process.env.ADMIN_SECRET ?? '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 dias
  })
  return response
}
