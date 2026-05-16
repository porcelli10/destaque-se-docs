import { NextResponse } from 'next/server'
import { updateComment } from '@/lib/storage'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()
  const updated = updateComment(id, body)
  if (!updated) return NextResponse.json({ error: 'Comentário não encontrado.' }, { status: 404 })
  return NextResponse.json(updated)
}
