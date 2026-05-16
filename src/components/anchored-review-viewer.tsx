'use client'

import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { AnchoredCommentLayout, type BalloonEntry } from '@/components/anchored-comment-layout'
import { ReviewBalloon } from '@/components/review-balloon'
import { CopyButton } from '@/components/copy-button'
import { getBalloonColor } from '@/lib/balloon-colors'
import { format } from 'date-fns'
import type { ReviewComment } from '@/lib/types'

interface AnchoredReviewViewerProps {
  publicPrompt: string
  comments: ReviewComment[]
}

export function AnchoredReviewViewer({ publicPrompt, comments }: AnchoredReviewViewerProps) {
  const router = useRouter()

  const balloons = useMemo<BalloonEntry[]>(
    () => comments.map(c => ({ id: c.id, selected_text: c.selected_text })),
    [comments]
  )

  const allCommentsText = comments
    .map(
      c =>
        `[${c.author_name} — ${format(new Date(c.created_at), 'dd/MM/yyyy HH:mm')}]\n${
          c.selected_text ? `Trecho: "${c.selected_text}"\n` : ''
        }${c.comment_text}`
    )
    .join('\n\n---\n\n')

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
          Comentários recebidos ({comments.length})
        </h2>
        <CopyButton getText={() => allCommentsText} label="Copiar todos os comentários" />
      </div>

      <AnchoredCommentLayout
        text={publicPrompt}
        balloons={balloons}
        renderBalloon={(id, index) => {
          const comment = comments.find(c => c.id === id)
          if (!comment) return null
          return (
            <ReviewBalloon
              authorName={comment.author_name}
              authorEmail={comment.author_email}
              commentText={comment.comment_text}
              selectedText={comment.selected_text}
              status={comment.status}
              createdAt={comment.created_at}
              onResolve={() => handleResolve(id)}
              accentColor={getBalloonColor(index).border}
            />
          )
        }}
      />
    </div>
  )
}
