import { NextResponse } from 'next/server'
import { getDocumentById, updateDocument, deleteDocument } from '@/lib/storage'
import { parsePublicPrompt, validateHideTags } from '@/lib/prompt-utils'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const doc = getDocumentById(id)
  if (!doc) return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 })
  return NextResponse.json(doc)
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const doc = getDocumentById(id)
  if (!doc) return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 })

  const body = await request.json()
  const { project_name, client_name, full_prompt, status } = body

  if (full_prompt !== undefined) {
    const validation = validateHideTags(full_prompt)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 422 })
    }
  }

  const updated = updateDocument(id, {
    ...(project_name !== undefined && { project_name: project_name.trim() }),
    ...(client_name !== undefined && { client_name: client_name.trim() }),
    ...(full_prompt !== undefined && {
      full_prompt,
      public_prompt: parsePublicPrompt(full_prompt),
    }),
    ...(status !== undefined && { status }),
  })

  return NextResponse.json(updated)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ok = deleteDocument(id)
  if (!ok) return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 })
  return NextResponse.json({ success: true })
}
