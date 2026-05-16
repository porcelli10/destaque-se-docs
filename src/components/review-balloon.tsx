'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ReviewBalloonProps {
  authorName: string
  authorEmail: string
  commentText: string
  selectedText: string | null
  status: 'Aberto' | 'Resolvido'
  createdAt: string
  onResolve: () => void
}

export function ReviewBalloon({
  authorName,
  authorEmail,
  commentText,
  selectedText,
  status,
  createdAt,
  onResolve,
}: ReviewBalloonProps) {
  const resolved = status === 'Resolvido'

  return (
    <div
      className={`bg-white rounded-lg shadow-sm p-3 space-y-2 transition-opacity border-l-2 ${
        resolved ? 'border-l-slate-300 border border-l-0 opacity-50' : 'border-l-blue-400 border border-l-0'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="text-xs font-semibold text-slate-700 truncate">{authorName}</span>
          {authorEmail && (
            <span className="text-xs text-slate-400 ml-1 truncate">{authorEmail}</span>
          )}
          <div className="text-xs text-slate-400 mt-0.5">
            {format(new Date(createdAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
          </div>
        </div>
        <Badge
          variant={resolved ? 'outline' : 'destructive'}
          className="shrink-0 text-xs"
        >
          {status}
        </Badge>
      </div>

      {selectedText && (
        <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-800 italic leading-relaxed">
          &ldquo;{selectedText}&rdquo;
        </div>
      )}

      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{commentText}</p>

      {!resolved && (
        <Button
          size="sm"
          variant="outline"
          onClick={onResolve}
          className="w-full h-7 text-xs"
        >
          Resolver
        </Button>
      )}
    </div>
  )
}
