'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface CommentFormProps {
  reviewToken: string
}

export function CommentForm({ reviewToken }: CommentFormProps) {
  const [authorName, setAuthorName] = useState('')
  const [authorEmail, setAuthorEmail] = useState('')
  const [commentText, setCommentText] = useState('')
  const [selectedText, setSelectedText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!authorName.trim() || !commentText.trim()) {
      setError('Nome e comentário são obrigatórios.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: reviewToken,
          author_name: authorName,
          author_email: authorEmail,
          comment_text: commentText,
          selected_text: selectedText || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Erro ao enviar comentário.')
        return
      }

      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-12 border rounded-xl bg-green-50 border-green-200">
        <p className="text-lg font-semibold text-green-800">Comentários enviados com sucesso.</p>
        <p className="text-green-700 mt-1">Obrigado pela revisão.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {selectedText && (
        <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm">
          <p className="font-medium text-amber-800 mb-1">Comentando sobre o trecho:</p>
          <p className="text-amber-700 italic">"{selectedText}"</p>
          <button
            type="button"
            onClick={() => setSelectedText('')}
            className="text-xs text-amber-500 mt-1 underline"
          >
            Remover seleção
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="author_name">Seu nome *</Label>
          <Input
            id="author_name"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="Nome completo"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="author_email">Seu email</Label>
          <Input
            id="author_email"
            type="email"
            value={authorEmail}
            onChange={(e) => setAuthorEmail(e.target.value)}
            placeholder="email@empresa.com"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="comment_text">Comentários e sugestões *</Label>
        <Textarea
          id="comment_text"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Descreva aqui o que precisa ser ajustado, esclarecido ou corrigido..."
          className="min-h-[160px] resize-y"
          required
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</p>
      )}

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? 'Enviando...' : 'Enviar comentários'}
      </Button>
    </form>
  )
}
