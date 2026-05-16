import { NextResponse } from 'next/server'
import { createDocument, getAllDocuments } from '@/lib/storage'
import { parsePublicPrompt, validateHideTags } from '@/lib/prompt-utils'
import { generateToken } from '@/lib/token'
import type { Document } from '@/lib/types'

export async function GET() {
  const docs = getAllDocuments()
  return NextResponse.json(docs)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { project_name, client_name, full_prompt } = body

  if (!project_name?.trim() || !client_name?.trim() || !full_prompt?.trim()) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando.' }, { status: 400 })
  }

  const validation = validateHideTags(full_prompt)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 422 })
  }

  const now = new Date().toISOString()
  const doc: Document = {
    id: generateToken(),
    project_name: project_name.trim(),
    client_name: client_name.trim(),
    full_prompt,
    public_prompt: parsePublicPrompt(full_prompt),
    review_token: generateToken(),
    status: 'Rascunho',
    created_at: now,
    updated_at: now,
  }

  createDocument(doc)
  return NextResponse.json(doc, { status: 201 })
}
