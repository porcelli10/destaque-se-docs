'use client'

export interface Highlight {
  id: string
  text: string
  color?: string
}

interface Segment {
  text: string
  highlightId: string | null
  color?: string
}

export function buildHighlightedSegments(text: string, highlights: Highlight[]): Segment[] {
  const active = highlights.filter(h => h.text.length > 0)
  if (active.length === 0) return [{ text, highlightId: null }]

  const escaped = active.map(h => h.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(`(${escaped.join('|')})`, 'g')
  const parts = text.split(regex)

  const textToId = new Map(active.map(h => [h.text, h.id]))
  const textToColor = new Map(active.map(h => [h.text, h.color]))

  return parts
    .filter(part => part.length > 0)
    .map(part => {
      const id = textToId.get(part)
      return { text: part, highlightId: id ?? null, color: textToColor.get(part) }
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
            className="rounded-sm not-italic"
            style={{ backgroundColor: seg.color ?? '#fde68a' }}
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
