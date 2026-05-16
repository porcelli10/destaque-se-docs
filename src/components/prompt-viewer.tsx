'use client'

interface Segment {
  text: string
  highlight: boolean
}

export function buildHighlightedSegments(text: string, highlights: string[]): Segment[] {
  const active = highlights.filter(h => h.length > 0)
  if (active.length === 0) return [{ text, highlight: false }]

  const escaped = active.map(h => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(`(${escaped.join('|')})`, 'g')
  const parts = text.split(regex)

  return parts
    .filter(part => part.length > 0)
    .map(part => ({ text: part, highlight: active.includes(part) }))
}

interface PromptViewerProps {
  text: string
  highlights: string[]
}

export function PromptViewer({ text, highlights }: PromptViewerProps) {
  const segments = buildHighlightedSegments(text, highlights)

  return (
    <p className="whitespace-pre-wrap font-sans text-slate-800 text-sm leading-relaxed">
      {segments.map((seg, i) =>
        seg.highlight ? (
          <mark key={i} className="bg-yellow-200 rounded-sm not-italic">
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </p>
  )
}
