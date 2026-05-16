'use client'

import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { PendingComment } from '@/components/review-page-client'

interface CommentSidebarProps {
  authorName: string
  authorEmail: string
  onAuthorNameChange: (v: string) => void
  onAuthorEmailChange: (v: string) => void
  pendingComments: PendingComment[]
  onCommentTextChange: (id: string, text: string) => void
  onRemoveComment: (id: string) => void
  onAddGeneral: () => void
  onSubmit: () => void
  submitting: boolean
  error: string | null
}

export function CommentSidebar({
  authorName,
  authorEmail,
  onAuthorNameChange,
  onAuthorEmailChange,
  pendingComments,
  onCommentTextChange,
  onRemoveComment,
  onAddGeneral,
  onSubmit,
  submitting,
  error,
}: CommentSidebarProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const prevLengthRef = useRef(pendingComments.length)

  useEffect(() => {
    if (pendingComments.length > prevLengthRef.current && listRef.current) {
      listRef.current.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
    prevLengthRef.current = pendingComments.length
  }, [pendingComments.length])

  const canSubmit =
    authorName.trim().length > 0 &&
    pendingComments.length > 0 &&
    pendingComments.some(c => c.comment_text.trim().length > 0) &&
    !submitting

  return (
    <div className="flex flex-col gap-4">
      {/* Identidade */}
      <div className="bg-white border rounded-xl p-4 space-y-3 shadow-sm">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Seus dados</p>
        <div className="space-y-1">
          <Label htmlFor="author_name">Nome *</Label>
          <Input
            id="author_name"
            value={authorName}
            onChange={e => onAuthorNameChange(e.target.value)}
            placeholder="Seu nome"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="author_email">Email</Label>
          <Input
            id="author_email"
            type="email"
            value={authorEmail}
            onChange={e => onAuthorEmailChange(e.target.value)}
            placeholder="email@empresa.com"
          />
        </div>
      </div>

      {/* Lista de comentários pendentes */}
      <div className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Comentários{pendingComments.length > 0 ? ` (${pendingComments.length})` : ''}
        </p>

        {pendingComments.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">
            Selecione um trecho do texto para comentar ou adicione um comentário geral.
          </p>
        ) : (
          <div ref={listRef} className="space-y-3">
            {pendingComments.map(comment => (
              <div key={comment.id} className="border rounded-lg p-3 space-y-2 bg-slate-50">
                {comment.selected_text && (
                  <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-800 italic">
                    &ldquo;{comment.selected_text}&rdquo;
                  </div>
                )}
                <Textarea
                  value={comment.comment_text}
                  onChange={e => onCommentTextChange(comment.id, e.target.value)}
                  placeholder={
                    comment.selected_text
                      ? 'O que precisa ajustar nesse trecho?'
                      : 'Comentário geral sobre o documento...'
                  }
                  className="min-h-[80px] resize-none text-sm"
                />
                <button
                  type="button"
                  onClick={() => onRemoveComment(comment.id)}
                  className="text-xs text-slate-400 hover:text-red-500 underline"
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onAddGeneral}
        >
          + Comentário geral
        </Button>
      </div>

      {/* Erro */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</p>
      )}

      {/* Submit */}
      <Button onClick={onSubmit} disabled={!canSubmit} className="w-full">
        {submitting
          ? 'Enviando...'
          : pendingComments.length === 0
            ? 'Enviar comentários'
            : `Enviar ${pendingComments.length} comentário${pendingComments.length > 1 ? 's' : ''}`}
      </Button>
    </div>
  )
}
