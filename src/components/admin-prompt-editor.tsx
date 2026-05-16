'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ReviewBalloon } from '@/components/review-balloon'
import type { ReviewComment } from '@/lib/types'

interface AdminPromptEditorProps {
  fullPrompt: string
  comments: ReviewComment[]
}

function stripOcultarMarkers(text: string): string {
  return text.replace(/\[OCULTAR\]/g, '').replace(/\[\/OCULTAR\]/g, '')
}

export function AdminPromptEditor({ fullPrompt, comments }: AdminPromptEditorProps) {
  const router = useRouter()
  const [editedPrompt, setEditedPrompt] = useState(fullPrompt)
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(stripOcultarMarkers(editedPrompt))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleResolve(id: string) {
    await fetch(`/api/comments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Resolvido' }),
    })
    router.refresh()
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
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">
          Revisar com edição — {comments.length} comentário{comments.length !== 1 ? 's' : ''}
        </h2>
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? 'Copiado!' : 'Copiar prompt editado'}
        </Button>
      </div>

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
        </div>

        {/* Right: comment balloons */}
        <div className="space-y-3 md:sticky md:top-6">
          {comments.map(comment => (
            <ReviewBalloon
              key={comment.id}
              authorName={comment.author_name}
              authorEmail={comment.author_email}
              commentText={comment.comment_text}
              selectedText={comment.selected_text}
              status={comment.status}
              createdAt={comment.created_at}
              onResolve={() => handleResolve(comment.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
