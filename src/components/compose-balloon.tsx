'use client'

import { Textarea } from '@/components/ui/textarea'

interface ComposeBalloonProps {
  selectedText: string | null
  commentText: string
  onChange: (text: string) => void
  onRemove: () => void
}

export function ComposeBalloon({ selectedText, commentText, onChange, onRemove }: ComposeBalloonProps) {
  return (
    <div className="bg-white border-l-2 border-l-blue-400 border border-l-0 rounded-lg shadow-sm p-3 space-y-2">
      {selectedText && (
        <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-800 italic leading-relaxed">
          &ldquo;{selectedText}&rdquo;
        </div>
      )}
      <Textarea
        value={commentText}
        onChange={e => onChange(e.target.value)}
        placeholder={selectedText ? 'O que precisa ajustar nesse trecho?' : 'Comentário geral...'}
        className="min-h-[72px] resize-none text-sm"
      />
      <button
        type="button"
        onClick={onRemove}
        className="text-xs text-slate-400 hover:text-red-500 underline"
      >
        Remover
      </button>
    </div>
  )
}
