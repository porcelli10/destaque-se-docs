import { NextResponse } from 'next/server'
import { createComment, getDocumentByToken, updateDocument } from '@/lib/storage'
import { generateToken } from '@/lib/token'
import type { ReviewComment } from '@/lib/types'

export async function POST(request: Request) {
  const body = await request.json()
  const { document_id, author_name, author_email, comment_text, selected_text } = body

  if (!document_id || !author_name?.trim() || !comment_text?.trim()) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando.' }, { status: 400 })
  }

  // document_id here is actually the review_token — public routes never expose internal IDs
  const doc = getDocumentByToken(document_id)
  if (!doc) return NextResponse.json({ error: 'Revisão não encontrada.' }, { status: 404 })

  const comment: ReviewComment = {
    id: generateToken(),
    document_id: doc.id,
    author_name: author_name.trim(),
    author_email: author_email?.trim() ?? '',
    comment_text: comment_text.trim(),
    selected_text: selected_text?.trim() || null,
    status: 'Aberto',
    created_at: new Date().toISOString(),
  }

  createComment(comment)

  if (doc.status === 'Enviado ao cliente') {
    updateDocument(doc.id, { status: 'Comentado pelo cliente' })
  }

  return NextResponse.json(comment, { status: 201 })
}
