'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ReviewBalloon } from '@/components/review-balloon'
import { getBalloonColor } from '@/lib/balloon-colors'
import { validateHideTags } from '@/lib/prompt-utils'
import type { ReviewComment } from '@/lib/types'

interface AdminPromptEditorProps {
  documentId: string
  fullPrompt: string
  comments: ReviewComment[]
}

function stripOcultarMarkers(text: string): string {
  return text.replace(/\[OCULTAR\]/g, '').replace(/\[\/OCULTAR\]/g, '')
}

export function AdminPromptEditor({ documentId, fullPrompt, comments }: AdminPromptEditorProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editedPrompt, setEditedPrompt] = useState(fullPrompt)
  const [copied, setCopied] = useState(false)
  const [saveLabel, setSaveLabel] = useState('Salvar prompt')
  const [error, setError] = useState<string | null>(null)

  const validation = validateHideTags(editedPrompt)

  function handleCopy() {
    navigator.clipboard.writeText(stripOcultarMarkers(editedPrompt))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleSave() {
    setError(null)
    if (!validation.valid) {
      setError(validation.error)
      return
    }
    startTransition(async () => {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_prompt: editedPrompt }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Erro ao salvar.')
        return
      }
      setSaveLabel('Salvo!')
      setTimeout(() => setSaveLabel('Salvar prompt'), 2000)
      router.refresh()
    })
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 border rounded-lg bg-white">
        Nenhum comentário recebido ainda.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-slate-800 mr-auto">
          Revisar e editar — {comments.length} comentário{comments.length !== 1 ? 's' : ''}
        </h2>
        <Button variant="outline" size="sm" onClick={handleSave} disabled={isPending}>
          {isPending ? 'Salvando...' : saveLabel}
        </Button>
        <Button size="sm" onClick={handleCopy}>
          {copied ? 'Copiado!' : 'Copiar prompt editado'}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-4 items-start">
        {/* Left: editable prompt */}
        <div className="bg-white border rounded-xl shadow-sm p-6 space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Prompt completo
          </p>
          <Textarea
            value={editedPrompt}
            onChange={e => setEditedPrompt(e.target.value)}
            className="font-mono text-sm resize-y min-h-[480px] leading-relaxed"
          />
          {!validation.valid && editedPrompt && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
              ⚠️ {validation.error}
            </p>
          )}
        </div>

        {/* Right: comment balloons, scroll naturally with the page */}
        <div className="space-y-3">
          {comments.map((comment, index) => (
            <ReviewBalloon
              key={comment.id}
              authorName={comment.author_name}
              authorEmail={comment.author_email}
              commentText={comment.comment_text}
              selectedText={comment.selected_text}
              status={comment.status}
              createdAt={comment.created_at}
              onResolve={async () => {
                await fetch(`/api/comments/${comment.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: 'Resolvido' }),
                })
                router.refresh()
              }}
              accentColor={getBalloonColor(index).border}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
