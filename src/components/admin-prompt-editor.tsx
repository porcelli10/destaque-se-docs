'use client'

import { useState, useTransition, useMemo, useRef, useLayoutEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ReviewBalloon } from '@/components/review-balloon'
import { buildHighlightedSegments } from '@/components/prompt-viewer'
import { getBalloonColor } from '@/lib/balloon-colors'
import { validateHideTags } from '@/lib/prompt-utils'
import type { ReviewComment } from '@/lib/types'

interface AdminPromptEditorProps {
  documentId: string
  fullPrompt: string
  comments: ReviewComment[]
}

function stripOcultarMarkers(text: string): string {
  return text.replace(/\[OCULTAR\]/g, '').replace(/\[\/OCULTAR\]/g, '')
}

const GAP = 4

// Both backdrop and textarea must share these exact values so text aligns pixel-perfectly
const SHARED_TEXT_STYLE: React.CSSProperties = {
  fontFamily: 'var(--font-mono), monospace',
  fontSize: '0.875rem',
  lineHeight: '1.625',
  padding: '0.75rem 0.875rem',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  overflowWrap: 'break-word',
  boxSizing: 'border-box',
  margin: 0,
  border: 0,
}

export function AdminPromptEditor({ documentId, fullPrompt, comments }: AdminPromptEditorProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editedPrompt, setEditedPrompt] = useState(fullPrompt)
  const [copied, setCopied] = useState(false)
  const [saveLabel, setSaveLabel] = useState('Salvar prompt')
  const [error, setError] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const balloonRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  // Stores the last Y position where each mark was seen in the DOM.
  // When editing removes a mark, its Y is frozen here so the balloon doesn't jump.
  const lastKnownAnchorYsRef = useRef<Record<string, number>>({})

  const [tops, setTops] = useState<Record<string, number>>({})
  const [columnHeight, setColumnHeight] = useState(0)
  const [measured, setMeasured] = useState(false)

  const validation = validateHideTags(editedPrompt)

  const highlights = useMemo(
    () =>
      comments
        .filter(c => c.selected_text)
        .map(c => ({
          id: c.id,
          text: c.selected_text!,
          // Use the original index in comments so the highlight color matches the balloon color
          color: getBalloonColor(comments.findIndex(x => x.id === c.id)).bg,
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [comments.map(c => `${c.id}:${c.selected_text}`).join('|')]
  )

  const segments = useMemo(
    () => buildHighlightedSegments(editedPrompt, highlights),
    [editedPrompt, highlights]
  )

  function setBalloonRef(id: string, el: HTMLDivElement | null) {
    if (el) balloonRefs.current.set(id, el)
    else balloonRefs.current.delete(id)
  }

  const measure = useCallback(() => {
    if (!backdropRef.current || !containerRef.current) return

    const containerRect = backdropRef.current.getBoundingClientRect()

    // Update anchor Y only when the mark is present in the DOM.
    // If the admin has edited the selected text away, the mark won't be found —
    // we keep the last known Y so the balloon stays at its original position.
    for (const comment of comments) {
      if (!comment.selected_text) continue
      const mark = backdropRef.current.querySelector(`[data-highlight-id="${comment.id}"]`)
      if (mark) {
        const rect = mark.getBoundingClientRect()
        lastKnownAnchorYsRef.current[comment.id] = rect.top - containerRect.top
      }
    }

    const heights: Record<string, number> = {}
    for (const [id, el] of balloonRefs.current) {
      heights[id] = el.getBoundingClientRect().height
    }

    const sorted = [...comments].sort((a, b) => {
      const aY = a.selected_text ? (lastKnownAnchorYsRef.current[a.id] ?? Infinity) : Infinity
      const bY = b.selected_text ? (lastKnownAnchorYsRef.current[b.id] ?? Infinity) : Infinity
      return aY - bY
    })

    const newTops: Record<string, number> = {}
    let currentBottom = 0
    for (const c of sorted) {
      const anchor = c.selected_text
        ? (lastKnownAnchorYsRef.current[c.id] ?? currentBottom)
        : currentBottom
      const top = Math.max(anchor, currentBottom)
      newTops[c.id] = top
      currentBottom = top + (heights[c.id] ?? 100) + GAP
    }

    const textHeight = backdropRef.current.scrollHeight
    setTops(newTops)
    setColumnHeight(Math.max(textHeight, currentBottom))
    setMeasured(true)
  }, [comments]) // editedPrompt intentionally excluded: text changes don't move balloons

  useLayoutEffect(() => {
    measure()
  }, [measure])

  useLayoutEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver(measure)
    observer.observe(containerRef.current)
    for (const [, el] of balloonRefs.current) observer.observe(el)
    return () => observer.disconnect()
  }, [measure])

  function handleCopy() {
    navigator.clipboard.writeText(stripOcultarMarkers(editedPrompt))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleSave() {
    setError(null)
    if (!validation.valid) {
      setError(validation.error)
      return
    }
    startTransition(async () => {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_prompt: editedPrompt }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Erro ao salvar.')
        return
      }
      setSaveLabel('Salvo!')
      setTimeout(() => setSaveLabel('Salvar prompt'), 2000)
      router.refresh()
    })
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
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-slate-800 mr-auto">
          Revisar e editar — {comments.length} comentário{comments.length !== 1 ? 's' : ''}
        </h2>
        <Button variant="outline" size="sm" onClick={handleSave} disabled={isPending}>
          {isPending ? 'Salvando...' : saveLabel}
        </Button>
        <Button size="sm" onClick={handleCopy}>
          {copied ? 'Copiado!' : 'Copiar prompt editado'}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</p>
      )}
      {!validation.valid && editedPrompt && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
          ⚠️ {validation.error}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-0 items-start" ref={containerRef}>

        {/* Left: editable prompt with color highlight overlay */}
        <div className="relative bg-white border md:border-r-0 md:rounded-l-xl rounded-xl md:rounded-r-none shadow-sm overflow-hidden">

          {/* Backdrop: same text rendered as HTML with colored marks.
              Text is transparent so only the mark backgrounds are visible.
              The textarea on top provides the readable text. */}
          <div
            ref={backdropRef}
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none overflow-hidden"
            style={{ ...SHARED_TEXT_STYLE, color: 'transparent' }}
          >
            {segments.map((seg, i) =>
              seg.highlightId ? (
                <mark
                  key={i}
                  data-highlight-id={seg.highlightId}
                  style={{
                    backgroundColor: seg.color ?? '#fde68a',
                    color: 'transparent',
                    borderRadius: '2px',
                  }}
                >
                  {seg.text}
                </mark>
              ) : (
                <span key={i}>{seg.text}</span>
              )
            )}
            {/* Zero-width space keeps the div at least the textarea height */}
            &#8203;
          </div>

          {/* Textarea: transparent background so backdrop marks show through */}
          <textarea
            value={editedPrompt}
            onChange={e => setEditedPrompt(e.target.value)}
            className="relative w-full outline-none resize-none bg-transparent field-sizing-content min-h-[480px]"
            style={{ ...SHARED_TEXT_STYLE, color: '#1e293b', caretColor: '#1e293b', overflow: 'hidden' }}
            spellCheck={false}
          />
        </div>

        {/* Right: balloons anchored to backdrop marks (desktop) */}
        <div
          className="relative hidden md:block border rounded-r-xl bg-slate-50/60 shadow-sm"
          style={{ minHeight: columnHeight || undefined }}
        >
          {comments.map((comment, index) => (
            <div
              key={comment.id}
              ref={el => setBalloonRef(comment.id, el)}
              className="absolute w-full px-2 py-1 transition-[top] duration-150"
              style={{ top: tops[comment.id] ?? 0, opacity: measured ? 1 : 0 }}
            >
              <ReviewBalloon
                authorName={comment.author_name}
                authorEmail={comment.author_email}
                commentText={comment.comment_text}
                selectedText={comment.selected_text}
                status={comment.status}
                createdAt={comment.created_at}
                onResolve={async () => {
                  await fetch(`/api/comments/${comment.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'Resolvido' }),
                  })
                  router.refresh()
                }}
                accentColor={getBalloonColor(index).border}
              />
            </div>
          ))}
        </div>

        {/* Mobile: stacked balloons below text */}
        <div className="md:hidden space-y-3 mt-4">
          {comments.map((comment, index) => (
            <ReviewBalloon
              key={comment.id}
              authorName={comment.author_name}
              authorEmail={comment.author_email}
              commentText={comment.comment_text}
              selectedText={comment.selected_text}
              status={comment.status}
              createdAt={comment.created_at}
              onResolve={async () => {
                await fetch(`/api/comments/${comment.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: 'Resolvido' }),
                })
                router.refresh()
              }}
              accentColor={getBalloonColor(index).border}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
