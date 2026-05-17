import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import type { Document, ReviewComment } from './types'

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'data', 'destaque-se.db')

let _db: Database.Database | null = null

function getDb(): Database.Database {
  if (_db) return _db

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })

  const db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      project_name TEXT NOT NULL,
      client_name TEXT NOT NULL,
      full_prompt TEXT NOT NULL,
      public_prompt TEXT NOT NULL,
      review_token TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'Rascunho',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      author_name TEXT NOT NULL,
      author_email TEXT NOT NULL DEFAULT '',
      comment_text TEXT NOT NULL,
      selected_text TEXT,
      status TEXT NOT NULL DEFAULT 'Aberto',
      created_at TEXT NOT NULL
    );
  `)

  migrateFromJson(db)

  _db = db
  return db
}

// One-time migration from legacy JSON files
function migrateFromJson(db: Database.Database) {
  const docsFile = path.join(process.cwd(), 'data', 'documents.json')
  const commentsFile = path.join(process.cwd(), 'data', 'comments.json')

  const alreadyMigrated =
    (db.prepare('SELECT COUNT(*) as n FROM documents').get() as { n: number }).n > 0

  if (alreadyMigrated || !fs.existsSync(docsFile)) return

  const docs: Document[] = JSON.parse(fs.readFileSync(docsFile, 'utf-8'))
  const comments: ReviewComment[] = fs.existsSync(commentsFile)
    ? JSON.parse(fs.readFileSync(commentsFile, 'utf-8'))
    : []

  const insertDoc = db.prepare(`
    INSERT OR IGNORE INTO documents
      (id, project_name, client_name, full_prompt, public_prompt, review_token, status, created_at, updated_at)
    VALUES
      (@id, @project_name, @client_name, @full_prompt, @public_prompt, @review_token, @status, @created_at, @updated_at)
  `)

  const insertComment = db.prepare(`
    INSERT OR IGNORE INTO comments
      (id, document_id, author_name, author_email, comment_text, selected_text, status, created_at)
    VALUES
      (@id, @document_id, @author_name, @author_email, @comment_text, @selected_text, @status, @created_at)
  `)

  const migrate = db.transaction(() => {
    for (const doc of docs) insertDoc.run(doc)
    for (const c of comments) insertComment.run(c)
  })

  migrate()
}

export function getAllDocuments(): Document[] {
  return getDb()
    .prepare('SELECT * FROM documents ORDER BY created_at DESC')
    .all() as Document[]
}

export function getDocumentById(id: string): Document | null {
  return (getDb().prepare('SELECT * FROM documents WHERE id = ?').get(id) as Document) ?? null
}

export function getDocumentByToken(token: string): Document | null {
  return (
    (getDb()
      .prepare('SELECT * FROM documents WHERE review_token = ?')
      .get(token) as Document) ?? null
  )
}

export function createDocument(doc: Document): Document {
  getDb()
    .prepare(`
      INSERT INTO documents
        (id, project_name, client_name, full_prompt, public_prompt, review_token, status, created_at, updated_at)
      VALUES
        (@id, @project_name, @client_name, @full_prompt, @public_prompt, @review_token, @status, @created_at, @updated_at)
    `)
    .run(doc)
  return doc
}

export function updateDocument(id: string, updates: Partial<Document>): Document | null {
  const current = getDocumentById(id)
  if (!current) return null

  const updated = { ...current, ...updates, updated_at: new Date().toISOString() }
  getDb()
    .prepare(`
      UPDATE documents SET
        project_name = @project_name,
        client_name  = @client_name,
        full_prompt  = @full_prompt,
        public_prompt = @public_prompt,
        status       = @status,
        updated_at   = @updated_at
      WHERE id = @id
    `)
    .run(updated)
  return updated
}

export function deleteDocument(id: string): boolean {
  const result = getDb().prepare('DELETE FROM documents WHERE id = ?').run(id)
  return result.changes > 0
}

export function getCommentsByDocumentId(documentId: string): ReviewComment[] {
  return getDb()
    .prepare('SELECT * FROM comments WHERE document_id = ? ORDER BY created_at ASC')
    .all(documentId) as ReviewComment[]
}

export function createComment(comment: ReviewComment): ReviewComment {
  getDb()
    .prepare(`
      INSERT INTO comments
        (id, document_id, author_name, author_email, comment_text, selected_text, status, created_at)
      VALUES
        (@id, @document_id, @author_name, @author_email, @comment_text, @selected_text, @status, @created_at)
    `)
    .run(comment)
  return comment
}

export function updateComment(id: string, updates: Partial<ReviewComment>): ReviewComment | null {
  const current = getDb().prepare('SELECT * FROM comments WHERE id = ?').get(id) as ReviewComment | undefined
  if (!current) return null

  const updated = { ...current, ...updates }
  getDb()
    .prepare('UPDATE comments SET status = @status WHERE id = @id')
    .run(updated)
  return updated
}
