'use client'

import { useState, useRef, useLayoutEffect, useCallback, useMemo } from 'react'
import { PromptViewer, type Highlight } from '@/components/prompt-viewer'

export interface BalloonEntry {
  id: string
  selected_text: string | null
}

interface AnchoredCommentLayoutProps {
  text: string
  balloons: BalloonEntry[]
  renderBalloon: (id: string, index: number) => React.ReactNode
  onTextRef?: (el: HTMLDivElement | null) => void
}

const GAP = 8

export function AnchoredCommentLayout({
  text,
  balloons,
  renderBalloon,
  onTextRef,
}: AnchoredCommentLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const balloonRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const [tops, setTops] = useState<Record<string, number>>({})
  const [columnHeight, setColumnHeight] = useState(0)
  const [measured, setMeasured] = useState(false)

  const highlights = useMemo<Highlight[]>(
    () =>
      balloons
        .filter(b => b.selected_text !== null)
        .map(b => ({ id: b.id, text: b.selected_text! })),
    // recompute only when ids or selected_texts change, not on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [balloons.map(b => `${b.id}:${b.selected_text}`).join('|')]
  )

  const measure = useCallback(() => {
    if (!textRef.current || !containerRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()

    // Step 1: measure anchor Y positions for each highlighted balloon
    const anchorYs: Record<string, number> = {}
    for (const balloon of balloons) {
      if (!balloon.selected_text) continue
      const mark = textRef.current.querySelector(`[data-highlight-id="${balloon.id}"]`)
      if (mark) {
        const rect = mark.getBoundingClientRect()
        anchorYs[balloon.id] = rect.top - containerRect.top
      }
    }

    // Step 2: measure current balloon heights
    const heights: Record<string, number> = {}
    for (const [id, el] of balloonRefs.current) {
      heights[id] = el.getBoundingClientRect().height
    }

    // Step 3: sort by anchor Y (general comments → end)
    const sorted = [...balloons].sort((a, b) => {
      const aY = a.selected_text !== null ? (anchorYs[a.id] ?? Infinity) : Infinity
      const bY = b.selected_text !== null ? (anchorYs[b.id] ?? Infinity) : Infinity
      return aY - bY
    })

    // Step 4: push-down algorithm
    const newTops: Record<string, number> = {}
    let currentBottom = 0
    for (const balloon of sorted) {
      const anchor =
        balloon.selected_text !== null ? (anchorYs[balloon.id] ?? currentBottom) : currentBottom
      const top = Math.max(anchor, currentBottom)
      newTops[balloon.id] = top
      currentBottom = top + (heights[balloon.id] ?? 100) + GAP
    }

    // Step 5: column height = max(text height, last balloon bottom)
    const textHeight = textRef.current.getBoundingClientRect().height
    const newColumnHeight = Math.max(textHeight, currentBottom)

    setTops(newTops)
    setColumnHeight(newColumnHeight)
    setMeasured(true)
  }, [balloons])

  // Re-measure whenever balloons or text change
  useLayoutEffect(() => {
    measure()
  }, [measure])

  // Re-measure on container or balloon resize
  useLayoutEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver(measure)
    observer.observe(containerRef.current)
    for (const [, el] of balloonRefs.current) {
      observer.observe(el)
    }
    return () => observer.disconnect()
  }, [measure])

  function setTextRefCallback(el: HTMLDivElement | null) {
    textRef.current = el
    onTextRef?.(el)
  }

  function setBalloonRef(id: string, el: HTMLDivElement | null) {
    if (el) {
      balloonRefs.current.set(id, el)
    } else {
      balloonRefs.current.delete(id)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-0 items-start" ref={containerRef}>
      {/* Left: prompt text */}
      <div className="bg-white border md:border-r-0 md:rounded-l-xl rounded-xl md:rounded-r-none p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
          Conteúdo para revisão
        </h2>
        <div ref={setTextRefCallback}>
          <PromptViewer text={text} highlights={highlights} />
        </div>
      </div>

      {/* Right: balloon column (desktop only) */}
      <div
        className="relative hidden md:block border rounded-r-xl bg-slate-50/60 shadow-sm"
        style={{ minHeight: columnHeight || undefined }}
      >
        {balloons.map((b, i) => (
          <div
            key={b.id}
            ref={el => setBalloonRef(b.id, el)}
            className="absolute w-full px-2 py-1 transition-[top] duration-150"
            style={{ top: tops[b.id] ?? 0, opacity: measured ? 1 : 0 }}
          >
            {renderBalloon(b.id, i)}
          </div>
        ))}
      </div>

      {/* Mobile: balloons below text, in creation order */}
      <div className="md:hidden space-y-3 mt-4">
        {balloons.map((b, i) => (
          <div key={b.id}>{renderBalloon(b.id, i)}</div>
        ))}
      </div>
    </div>
  )
}
