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

  // Build non-overlapping intervals using plain string search.
  // Highlights processed in order; each claims the first occurrence in the text
  // that hasn't been taken by a prior highlight. This correctly handles:
  //   • two clients selecting the same passage (each gets a distinct occurrence)
  //   • one selection being a substring of another (no regex alternation pitfall)
  const intervals: Array<{ start: number; end: number; id: string; color?: string }> = []

  // Build a flexible regex that allows \n+ where the selection has \n
  // (browser selection collapses consecutive newlines, e.g. \n\n\n → \n\n)
  function toFlexibleRegex(searchText: string): RegExp {
    const escaped = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(escaped.replace(/\n+/g, '\\n+'), 'g')
  }

  for (const h of active) {
    let from = 0
    while (from <= text.length) {
      // Try exact match first
      let idx = text.indexOf(h.text, from)
      let end = idx >= 0 ? idx + h.text.length : -1

      // Fallback: flexible newline match
      if (idx === -1) {
        const regex = toFlexibleRegex(h.text)
        regex.lastIndex = from
        const match = regex.exec(text)
        if (!match) break
        idx = match.index
        end = match.index + match[0].length
      }

      const overlaps = intervals.some(iv => idx < iv.end && end > iv.start)
      if (!overlaps) {
        intervals.push({ start: idx, end, id: h.id, color: h.color })
        break
      }
      from = idx + 1
    }
  }

  intervals.sort((a, b) => a.start - b.start)

  const segments: Segment[] = []
  let cursor = 0
  for (const iv of intervals) {
    if (iv.start > cursor) segments.push({ text: text.slice(cursor, iv.start), highlightId: null })
    segments.push({ text: text.slice(iv.start, iv.end), highlightId: iv.id, color: iv.color })
    cursor = iv.end
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), highlightId: null })

  return segments.filter(s => s.text.length > 0)
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
