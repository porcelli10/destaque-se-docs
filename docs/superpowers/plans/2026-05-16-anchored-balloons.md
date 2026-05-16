# Anchored Comment Balloons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir a sidebar empilhada por balões ancorados verticalmente ao trecho selecionado, estilo Google Docs, com push-down automático — tanto na view do cliente quanto na do admin.

**Architecture:** `AnchoredCommentLayout` é um engine genérico que mede posições de `<mark>` no DOM via `useLayoutEffect`, calcula `top` de cada balão com push-down, e renderiza via callback `renderBalloon`. `ReviewPageClient` é reescrito para usar o layout com `ComposeBalloon`. `AnchoredReviewViewer` é um novo componente admin usando o mesmo layout com `ReviewBalloon`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, ResizeObserver API

---

## Mapa de arquivos

| Ação | Arquivo |
|------|---------|
| Modificar | `src/components/prompt-viewer.tsx` |
| Criar | `src/components/anchored-comment-layout.tsx` |
| Criar | `src/components/compose-balloon.tsx` |
| Criar | `src/components/review-balloon.tsx` |
| Reescrever | `src/components/review-page-client.tsx` |
| Criar | `src/components/anchored-review-viewer.tsx` |
| Modificar | `src/app/admin/documents/[id]/page.tsx` |
| Deletar | `src/components/comment-sidebar.tsx` |
| Deletar | `src/components/comments-section.tsx` |

---

## Task 1: Atualizar PromptViewer para suportar Highlight com id

**Files:**
- Modify: `src/components/prompt-viewer.tsx`

O `PromptViewer` precisa adicionar `data-highlight-id` em cada `<mark>` para que `AnchoredCommentLayout` encontre o elemento no DOM. A API muda de `highlights: string[]` para `highlights: Highlight[]`.

- [ ] **Step 1: Reescrever `src/components/prompt-viewer.tsx`**

```tsx
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
```

- [ ] **Step 2: Verificar build**

```bash
cd destaque-se-docs && npm run build
```

Esperado: erros de tipo nos consumidores de `PromptViewer` que ainda passam `string[]` — normal nesse passo, serão corrigidos nas tasks seguintes. Verifique apenas que `prompt-viewer.tsx` não tem erros próprios.

- [ ] **Step 3: Commit**

```bash
git add src/components/prompt-viewer.tsx
git commit -m "feat: update PromptViewer to use Highlight objects with data-highlight-id"
```

---

## Task 2: AnchoredCommentLayout — engine de posicionamento

**Files:**
- Create: `src/components/anchored-comment-layout.tsx`

- [ ] **Step 1: Criar `src/components/anchored-comment-layout.tsx`**

```tsx
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
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```

Esperado: sem erros em `anchored-comment-layout.tsx`. Erros em outros componentes que ainda não foram atualizados são normais.

- [ ] **Step 3: Commit**

```bash
git add src/components/anchored-comment-layout.tsx
git commit -m "feat: add AnchoredCommentLayout positioning engine"
```

---

## Task 3: ComposeBalloon — balão editável do cliente

**Files:**
- Create: `src/components/compose-balloon.tsx`

- [ ] **Step 1: Criar `src/components/compose-balloon.tsx`**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/compose-balloon.tsx
git commit -m "feat: add ComposeBalloon editable balloon for client"
```

---

## Task 4: ReviewBalloon — balão read-only do admin

**Files:**
- Create: `src/components/review-balloon.tsx`

- [ ] **Step 1: Criar `src/components/review-balloon.tsx`**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/review-balloon.tsx
git commit -m "feat: add ReviewBalloon read-only balloon for admin"
```

---

## Task 5: Reescrever ReviewPageClient com AnchoredCommentLayout

**Files:**
- Rewrite: `src/components/review-page-client.tsx`

- [ ] **Step 1: Substituir o conteúdo completo de `src/components/review-page-client.tsx`**

```tsx
'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { nanoid } from 'nanoid'
import { AnchoredCommentLayout, type BalloonEntry } from '@/components/anchored-comment-layout'
import { ComposeBalloon } from '@/components/compose-balloon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface PendingComment {
  id: string
  selected_text: string | null
  comment_text: string
}

interface ReviewPageClientProps {
  publicPrompt: string
  reviewToken: string
}

export function ReviewPageClient({ publicPrompt, reviewToken }: ReviewPageClientProps) {
  const [authorName, setAuthorName] = useState('')
  const [authorEmail, setAuthorEmail] = useState('')
  const [pendingComments, setPendingComments] = useState<PendingComment[]>([])
  const [floatingBtn, setFloatingBtn] = useState({ visible: false, x: 0, y: 0 })
  const [pendingSelection, setPendingSelection] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const promptRef = useRef<HTMLDivElement>(null)
  const floatingBtnRef = useRef<HTMLButtonElement>(null)

  // Stable balloon entries — only changes when comments are added/removed, not when text is typed
  const balloons = useMemo<BalloonEntry[]>(
    () => pendingComments.map(c => ({ id: c.id, selected_text: c.selected_text })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pendingComments.map(c => `${c.id}:${c.selected_text}`).join('|')]
  )

  function handleTextRef(el: HTMLDivElement | null) {
    ;(promptRef as React.MutableRefObject<HTMLDivElement | null>).current = el
  }

  // Detect text selection within the prompt text area
  useEffect(() => {
    function onMouseUp(e: MouseEvent) {
      const selection = window.getSelection()
      const text = selection?.toString().trim() ?? ''

      if (!text || !promptRef.current) {
        setFloatingBtn(prev => (prev.visible ? { visible: false, x: 0, y: 0 } : prev))
        return
      }

      const range = selection!.getRangeAt(0)
      if (!promptRef.current.contains(range.commonAncestorContainer)) {
        setFloatingBtn(prev => (prev.visible ? { visible: false, x: 0, y: 0 } : prev))
        return
      }

      setPendingSelection(text)
      setFloatingBtn({ visible: true, x: e.clientX, y: e.clientY })
    }

    document.addEventListener('mouseup', onMouseUp)
    return () => document.removeEventListener('mouseup', onMouseUp)
  }, [])

  // Close floating button on outside click
  useEffect(() => {
    if (!floatingBtn.visible) return

    function onMouseDown(e: MouseEvent) {
      if (floatingBtnRef.current?.contains(e.target as Node)) return
      setFloatingBtn({ visible: false, x: 0, y: 0 })
    }

    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [floatingBtn.visible])

  function handleAddComment() {
    setPendingComments(prev => [
      ...prev,
      { id: nanoid(), selected_text: pendingSelection || null, comment_text: '' },
    ])
    setFloatingBtn({ visible: false, x: 0, y: 0 })
    setPendingSelection('')
    window.getSelection()?.removeAllRanges()
  }

  function handleAddGeneral() {
    setPendingComments(prev => [
      ...prev,
      { id: nanoid(), selected_text: null, comment_text: '' },
    ])
  }

  function handleCommentTextChange(id: string, text: string) {
    setPendingComments(prev => prev.map(c => (c.id === id ? { ...c, comment_text: text } : c)))
  }

  function handleRemoveComment(id: string) {
    setPendingComments(prev => prev.filter(c => c.id !== id))
  }

  async function handleSubmit() {
    setError(null)

    const toSubmit = pendingComments.filter(c => c.comment_text.trim().length > 0)

    if (toSubmit.length === 0) {
      setError('Preencha o texto de pelo menos um comentário antes de enviar.')
      return
    }

    setSubmitting(true)

    try {
      const results = await Promise.allSettled(
        toSubmit.map(comment =>
          fetch('/api/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              document_id: reviewToken,
              author_name: authorName,
              author_email: authorEmail,
              comment_text: comment.comment_text,
              selected_text: comment.selected_text,
            }),
          }).then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            return res.json()
          })
        )
      )

      const successIds = toSubmit
        .filter((_, i) => results[i].status === 'fulfilled')
        .map(c => c.id)

      const failures = results.filter(r => r.status === 'rejected')
      if (failures.length > 0) {
        setPendingComments(prev => prev.filter(c => !successIds.includes(c.id)))
        setError(`${failures.length} comentário(s) falharam ao ser enviados. Tente novamente.`)
        return
      }

      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit =
    authorName.trim().length > 0 &&
    pendingComments.length > 0 &&
    pendingComments.some(c => c.comment_text.trim().length > 0) &&
    !submitting

  if (submitted) {
    return (
      <div className="text-center py-16 border rounded-xl bg-green-50 border-green-200">
        <p className="text-lg font-semibold text-green-800">Comentários enviados com sucesso.</p>
        <p className="text-green-700 mt-1">Obrigado pela revisão.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Identity + action bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-white border rounded-xl shadow-sm">
        <Input
          placeholder="Seu nome *"
          value={authorName}
          onChange={e => setAuthorName(e.target.value)}
          className="w-36"
        />
        <Input
          type="email"
          placeholder="Email"
          value={authorEmail}
          onChange={e => setAuthorEmail(e.target.value)}
          className="w-48"
        />
        <Button type="button" variant="outline" size="sm" onClick={handleAddGeneral}>
          + Comentário geral
        </Button>
        <Button onClick={handleSubmit} disabled={!canSubmit} size="sm" className="ml-auto">
          {submitting
            ? 'Enviando...'
            : pendingComments.length === 0
              ? 'Enviar comentários'
              : `Enviar ${pendingComments.length} comentário${pendingComments.length > 1 ? 's' : ''}`}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</p>
      )}

      {pendingComments.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-1">
          Selecione um trecho do texto e clique em <strong>+ Comentar</strong> para adicionar uma observação.
        </p>
      )}

      <AnchoredCommentLayout
        text={publicPrompt}
        balloons={balloons}
        onTextRef={handleTextRef}
        renderBalloon={(id) => {
          const comment = pendingComments.find(c => c.id === id)
          if (!comment) return null
          return (
            <ComposeBalloon
              selectedText={comment.selected_text}
              commentText={comment.comment_text}
              onChange={text => handleCommentTextChange(id, text)}
              onRemove={() => handleRemoveComment(id)}
            />
          )
        }}
      />

      {/* Floating "+ Comentar" button on text selection */}
      {floatingBtn.visible && (
        <button
          ref={floatingBtnRef}
          type="button"
          onClick={handleAddComment}
          className="fixed z-50 bg-slate-900 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg hover:bg-slate-700 transition-colors"
          style={{ left: floatingBtn.x + 8, top: floatingBtn.y - 40 }}
        >
          + Comentar
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificar build limpo**

```bash
npm run build
```

Esperado: build passa sem erros. `CommentSidebar` ainda existe mas não é mais importado por nada — ok, será deletado na Task 7.

- [ ] **Step 3: Commit**

```bash
git add src/components/review-page-client.tsx
git commit -m "feat: rewrite ReviewPageClient with AnchoredCommentLayout"
```

---

## Task 6: AnchoredReviewViewer — view de revisão do admin

**Files:**
- Create: `src/components/anchored-review-viewer.tsx`

- [ ] **Step 1: Criar `src/components/anchored-review-viewer.tsx`**

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { AnchoredCommentLayout, type BalloonEntry } from '@/components/anchored-comment-layout'
import { ReviewBalloon } from '@/components/review-balloon'
import { CopyButton } from '@/components/copy-button'
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
        renderBalloon={(id) => {
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
            />
          )
        }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```

Esperado: sem erros em `anchored-review-viewer.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/anchored-review-viewer.tsx
git commit -m "feat: add AnchoredReviewViewer for admin comment review"
```

---

## Task 7: Atualizar admin page, deletar componentes obsoletos e build final

**Files:**
- Modify: `src/app/admin/documents/[id]/page.tsx`
- Delete: `src/components/comment-sidebar.tsx`
- Delete: `src/components/comments-section.tsx`

- [ ] **Step 1: Atualizar `src/app/admin/documents/[id]/page.tsx`**

Substitua o conteúdo completo do arquivo:

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getDocumentById, getCommentsByDocumentId } from '@/lib/storage'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DocumentEditor } from '@/components/document-editor'
import { StatusBadge } from '@/components/status-badge'
import { AnchoredReviewViewer } from '@/components/anchored-review-viewer'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const doc = getDocumentById(id)
  if (!doc) notFound()

  const comments = getCommentsByDocumentId(doc.id)

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">
        <div className="flex items-center gap-4">
          <Link href="/admin" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
            ← Voltar
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">{doc.project_name}</h1>
            <StatusBadge status={doc.status} />
          </div>
          <span className="text-sm text-slate-400 ml-auto">
            Criado em {format(new Date(doc.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </span>
        </div>

        <DocumentEditor document={doc} />

        <AnchoredReviewViewer publicPrompt={doc.public_prompt} comments={comments} />
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Deletar componentes obsoletos**

```bash
del src\components\comment-sidebar.tsx
del src\components\comments-section.tsx
```

- [ ] **Step 3: Verificar que nada mais importa os componentes deletados**

```bash
grep -r "comment-sidebar\|comments-section\|CommentSidebar\|CommentsSection" src/
```

Esperado: nenhum resultado.

- [ ] **Step 4: Build final**

```bash
npm run build
```

Esperado: build passa sem erros.

- [ ] **Step 5: Teste manual no browser**

```bash
npm run dev
```

**View do cliente** — abra `http://localhost:3000/admin`, abra um documento, copie o link de revisão e acesse em outra aba:
- [ ] Barra com nome/email/enviar aparece no topo
- [ ] Selecionar texto mostra botão flutuante "+ Comentar"
- [ ] Clicar adiciona balão na coluna direita alinhado ao trecho
- [ ] Trecho aparece em âmbar no balão
- [ ] Highlight amarelo aparece no texto
- [ ] Múltiplos balões se empilham sem sobrepor
- [ ] Balão abaixo de outro é empurrado para baixo
- [ ] Comentário geral vai ao final da coluna
- [ ] Scroll funciona normalmente, balões acompanham
- [ ] Enviar funciona e mostra tela de sucesso

**View do admin** — abra `http://localhost:3000/admin/documents/[id]` após receber comentários:
- [ ] Texto do prompt aparece com highlights amarelos
- [ ] Balões aparecem ancorados ao trecho correspondente
- [ ] Balões de comentários sem trecho aparecem ao final
- [ ] Botão "Resolver" funciona e atualiza o balão
- [ ] Balões resolvidos ficam com opacity reduzida
- [ ] "Copiar todos os comentários" funciona

- [ ] **Step 6: Commit final**

```bash
git add src/app/admin/documents/[id]/page.tsx
git commit -m "feat: wire AnchoredReviewViewer on admin page, remove obsolete components"
```
