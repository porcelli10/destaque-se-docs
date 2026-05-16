import fs from 'fs'
import path from 'path'
import type { Document, ReviewComment } from './types'

const DATA_DIR = path.join(process.cwd(), 'data')
const DOCS_FILE = path.join(DATA_DIR, 'documents.json')
const COMMENTS_FILE = path.join(DATA_DIR, 'comments.json')

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(DOCS_FILE)) fs.writeFileSync(DOCS_FILE, '[]')
  if (!fs.existsSync(COMMENTS_FILE)) fs.writeFileSync(COMMENTS_FILE, '[]')
}

function readDocs(): Document[] {
  ensureDataDir()
  return JSON.parse(fs.readFileSync(DOCS_FILE, 'utf-8'))
}

function writeDocs(docs: Document[]) {
  ensureDataDir()
  fs.writeFileSync(DOCS_FILE, JSON.stringify(docs, null, 2))
}

function readComments(): ReviewComment[] {
  ensureDataDir()
  return JSON.parse(fs.readFileSync(COMMENTS_FILE, 'utf-8'))
}

function writeComments(comments: ReviewComment[]) {
  ensureDataDir()
  fs.writeFileSync(COMMENTS_FILE, JSON.stringify(comments, null, 2))
}

export function getAllDocuments(): Document[] {
  return readDocs().sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

export function getDocumentById(id: string): Document | null {
  return readDocs().find((d) => d.id === id) ?? null
}

export function getDocumentByToken(token: string): Document | null {
  return readDocs().find((d) => d.review_token === token) ?? null
}

export function createDocument(doc: Document): Document {
  const docs = readDocs()
  docs.push(doc)
  writeDocs(docs)
  return doc
}

export function updateDocument(id: string, updates: Partial<Document>): Document | null {
  const docs = readDocs()
  const idx = docs.findIndex((d) => d.id === id)
  if (idx === -1) return null
  docs[idx] = { ...docs[idx], ...updates, updated_at: new Date().toISOString() }
  writeDocs(docs)
  return docs[idx]
}

export function deleteDocument(id: string): boolean {
  const docs = readDocs()
  const next = docs.filter((d) => d.id !== id)
  if (next.length === docs.length) return false
  writeDocs(next)
  return true
}

export function getCommentsByDocumentId(documentId: string): ReviewComment[] {
  return readComments()
    .filter((c) => c.document_id === documentId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
}

export function createComment(comment: ReviewComment): ReviewComment {
  const comments = readComments()
  comments.push(comment)
  writeComments(comments)
  return comment
}

export function updateComment(id: string, updates: Partial<ReviewComment>): ReviewComment | null {
  const comments = readComments()
  const idx = comments.findIndex((c) => c.id === id)
  if (idx === -1) return null
  comments[idx] = { ...comments[idx], ...updates }
  writeComments(comments)
  return comments[idx]
}
