'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CopyButton } from '@/components/copy-button'
import type { ReviewComment } from '@/lib/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface CommentsSectionProps {
  comments: ReviewComment[]
}

export function CommentsSection({ comments }: CommentsSectionProps) {
  const router = useRouter()

  async function handleResolve(id: string) {
    await fetch(`/api/comments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Resolvido' }),
    })
    router.refresh()
  }

  const allCommentsText = comments
    .map(
      (c) =>
        `[${c.author_name} — ${format(new Date(c.created_at), 'dd/MM/yyyy HH:mm')}]\n${c.selected_text ? `Trecho: "${c.selected_text}"\n` : ''}${c.comment_text}`
    )
    .join('\n\n---\n\n')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">
          Comentários recebidos {comments.length > 0 && `(${comments.length})`}
        </h2>
        {comments.length > 0 && (
          <CopyButton getText={() => allCommentsText} label="Copiar todos os comentários" />
        )}
      </div>

      {comments.length === 0 ? (
        <div className="text-center py-12 text-slate-400 border rounded-lg bg-white">
          Nenhum comentário recebido ainda.
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <Card key={comment.id}>
              <CardContent className="pt-4 pb-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">{comment.author_name}</span>
                      {comment.author_email && (
                        <span className="text-sm text-slate-400">{comment.author_email}</span>
                      )}
                      <Badge variant={comment.status === 'Resolvido' ? 'outline' : 'destructive'}>
                        {comment.status}
                      </Badge>
                    </div>
                    <span className="text-xs text-slate-400">
                      {format(new Date(comment.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <CopyButton getText={() => comment.comment_text} label="Copiar" />
                    {comment.status === 'Aberto' && (
                      <Button size="sm" variant="outline" onClick={() => handleResolve(comment.id)}>
                        Marcar resolvido
                      </Button>
                    )}
                  </div>
                </div>

                {comment.selected_text && (
                  <div className="bg-amber-50 border border-amber-200 rounded p-2 text-sm text-amber-800">
                    <span className="font-medium">Trecho selecionado:</span> &quot;{comment.selected_text}&quot;
                  </div>
                )}

                <p className="text-slate-700 text-sm whitespace-pre-wrap">{comment.comment_text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
