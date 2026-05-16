'use client'

export interface Highlight {
  id: string
  text: string
}

interface Segment {
  text: string
  highlightId: string | null
}

export function buildHighlightedSegments(text: string, highlights: Highlight[]): Segment[] {
  const active = highlights.filter(h => h.text.length > 0)
  if (active.length === 0) return [{ text, highlightId: null }]

  const escaped = active.map(h => h.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(`(${escaped.join('|')})`, 'g')
  const parts = text.split(regex)

  const textToId = new Map(active.map(h => [h.text, h.id]))

  return parts
    .filter(part => part.length > 0)
    .map(part => {
      const id = textToId.get(part)
      return { text: part, highlightId: id ?? null }
    })
}

interface PromptViewerProps {
  text: string
  highlights: Highlight[]
}

export function PromptViewer({ text, highlights }: PromptViewerProps) {
  const segments = buildHighlightedSegments(text, highlights)

  return (
    <p className="whitespace-pre-wrap font-sans text-slate-800 text-sm leading-relaxed">
      {segments.map((seg, i) =>
        seg.highlightId ? (
          <mark
            key={i}
            data-highlight-id={seg.highlightId}
            className="bg-yellow-200 rounded-sm not-italic"
          >
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </p>
  )
}
