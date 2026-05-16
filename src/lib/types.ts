export type DocumentStatus =
  | 'Rascunho'
  | 'Enviado ao cliente'
  | 'Comentado pelo cliente'
  | 'Finalizado'

export type CommentStatus = 'Aberto' | 'Resolvido'

export interface Document {
  id: string
  project_name: string
  client_name: string
  full_prompt: string
  public_prompt: string
  review_token: string
  status: DocumentStatus
  created_at: string
  updated_at: string
}

export interface ReviewComment {
  id: string
  document_id: string
  author_name: string
  author_email: string
  comment_text: string
  selected_text: string | null
  status: CommentStatus
  created_at: string
}
