# Inline Commenting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o formulário único de comentários por um sistema inline onde o cliente seleciona trechos do texto, acumula múltiplos comentários e envia tudo de uma vez.

**Architecture:** Três novos componentes Client — `PromptViewer` (texto com highlights), `CommentSidebar` (identidade + cards de comentários pendentes), `ReviewPageClient` (orquestra estado e layout dois colunas). A página `/review/[token]` continua Server Component; o `comment-form.tsx` é removido. Nenhuma mudança de API ou schema.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, nanoid

---

## Mapa de arquivos

| Ação | Arquivo |
|------|---------|
| Criar | `src/components/prompt-viewer.tsx` |
| Criar | `src/components/comment-sidebar.tsx` |
| Criar | `src/components/review-page-client.tsx` |
| Modificar | `src/app/review/[token]/page.tsx` |
| Deletar | `src/components/comment-form.tsx` |

---

## Task 1: PromptViewer — renderiza texto com highlights

**Files:**
- Create: `src/components/prompt-viewer.tsx`

- [ ] **Step 1: Criar o componente**

Crie `src/components/prompt-viewer.tsx` com o conteúdo abaixo:

```tsx
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
```

- [ ] **Step 2: Verificar build**

```bash
cd destaque-se-docs && npm run build
```

Esperado: sem erros de TypeScript no novo arquivo.

- [ ] **Step 3: Commit**

```bash
git add src/components/prompt-viewer.tsx
git commit -m "feat: add PromptViewer with highlight segments"
```

---

## Task 2: CommentSidebar — identidade + cards de comentários pendentes

**Files:**
- Create: `src/components/comment-sidebar.tsx`

- [ ] **Step 1: Criar o componente**

Crie `src/components/comment-sidebar.tsx`:

```tsx
'use client'

import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { PendingComment } from '@/components/review-page-client'

interface CommentSidebarProps {
  authorName: string
  authorEmail: string
  onAuthorNameChange: (v: string) => void
  onAuthorEmailChange: (v: string) => void
  pendingComments: PendingComment[]
  onCommentTextChange: (id: string, text: string) => void
  onRemoveComment: (id: string) => void
  onAddGeneral: () => void
  onSubmit: () => void
  submitting: boolean
  error: string | null
}

export function CommentSidebar({
  authorName,
  authorEmail,
  onAuthorNameChange,
  onAuthorEmailChange,
  pendingComments,
  onCommentTextChange,
  onRemoveComment,
  onAddGeneral,
  onSubmit,
  submitting,
  error,
}: CommentSidebarProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const prevLengthRef = useRef(pendingComments.length)

  useEffect(() => {
    if (pendingComments.length > prevLengthRef.current && listRef.current) {
      listRef.current.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
    prevLengthRef.current = pendingComments.length
  }, [pendingComments.length])

  const canSubmit = authorName.trim().length > 0 && pendingComments.length > 0 && !submitting

  return (
    <div className="flex flex-col gap-4">
      {/* Identidade */}
      <div className="bg-white border rounded-xl p-4 space-y-3 shadow-sm">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Seus dados</p>
        <div className="space-y-1">
          <Label htmlFor="author_name">Nome *</Label>
          <Input
            id="author_name"
            value={authorName}
            onChange={e => onAuthorNameChange(e.target.value)}
            placeholder="Seu nome"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="author_email">Email</Label>
          <Input
            id="author_email"
            type="email"
            value={authorEmail}
            onChange={e => onAuthorEmailChange(e.target.value)}
            placeholder="email@empresa.com"
          />
        </div>
      </div>

      {/* Lista de comentários pendentes */}
      <div className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Comentários{pendingComments.length > 0 ? ` (${pendingComments.length})` : ''}
        </p>

        {pendingComments.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">
            Selecione um trecho do texto para comentar ou adicione um comentário geral.
          </p>
        ) : (
          <div ref={listRef} className="space-y-3">
            {pendingComments.map(comment => (
              <div key={comment.id} className="border rounded-lg p-3 space-y-2 bg-slate-50">
                {comment.selected_text && (
                  <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-800 italic">
                    &ldquo;{comment.selected_text}&rdquo;
                  </div>
                )}
                <Textarea
                  value={comment.comment_text}
                  onChange={e => onCommentTextChange(comment.id, e.target.value)}
                  placeholder={
                    comment.selected_text
                      ? 'O que precisa ajustar nesse trecho?'
                      : 'Comentário geral sobre o documento...'
                  }
                  className="min-h-[80px] resize-none text-sm"
                />
                <button
                  type="button"
                  onClick={() => onRemoveComment(comment.id)}
                  className="text-xs text-slate-400 hover:text-red-500 underline"
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onAddGeneral}
        >
          + Comentário geral
        </Button>
      </div>

      {/* Erro */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</p>
      )}

      {/* Submit */}
      <Button onClick={onSubmit} disabled={!canSubmit} className="w-full">
        {submitting
          ? 'Enviando...'
          : pendingComments.length === 0
            ? 'Enviar comentários'
            : `Enviar ${pendingComments.length} comentário${pendingComments.length > 1 ? 's' : ''}`}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```

Esperado: erro de importação em `review-page-client` (ainda não existe) — normal nesse passo. Verifique apenas que `comment-sidebar.tsx` não tem erros próprios de sintaxe.

> Obs: o build vai falhar por causa do `import type { PendingComment } from '@/components/review-page-client'` — isso é esperado. Prossiga para a Task 3.

- [ ] **Step 3: Commit**

```bash
git add src/components/comment-sidebar.tsx
git commit -m "feat: add CommentSidebar component"
```

---

## Task 3: ReviewPageClient — estado, seleção de texto, layout

**Files:**
- Create: `src/components/review-page-client.tsx`

- [ ] **Step 1: Criar o componente**

Crie `src/components/review-page-client.tsx`:

```tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { nanoid } from 'nanoid'
import { PromptViewer } from '@/components/prompt-viewer'
import { CommentSidebar } from '@/components/comment-sidebar'

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

  const highlights = pendingComments
    .map(c => c.selected_text)
    .filter((t): t is string => t !== null && t.length > 0)

  // Captura seleção de texto dentro do container do prompt
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

  // Fecha botão flutuante ao clicar fora dele
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
    setSubmitting(true)

    try {
      const results = await Promise.allSettled(
        pendingComments.map(comment =>
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

      const failures = results.filter(r => r.status === 'rejected')
      if (failures.length > 0) {
        setError(`${failures.length} comentário(s) falharam ao ser enviados. Tente novamente.`)
        return
      }

      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-16 border rounded-xl bg-green-50 border-green-200">
        <p className="text-lg font-semibold text-green-800">Comentários enviados com sucesso.</p>
        <p className="text-green-700 mt-1">Obrigado pela revisão.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-6 items-start">
      {/* Prompt com highlights */}
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
          Conteúdo para revisão
        </h2>
        <div ref={promptRef}>
          <PromptViewer text={publicPrompt} highlights={highlights} />
        </div>
      </div>

      {/* Sidebar */}
      <div className="md:sticky md:top-6">
        <CommentSidebar
          authorName={authorName}
          authorEmail={authorEmail}
          onAuthorNameChange={setAuthorName}
          onAuthorEmailChange={setAuthorEmail}
          pendingComments={pendingComments}
          onCommentTextChange={handleCommentTextChange}
          onRemoveComment={handleRemoveComment}
          onAddGeneral={handleAddGeneral}
          onSubmit={handleSubmit}
          submitting={submitting}
          error={error}
        />
      </div>

      {/* Botão flutuante de seleção */}
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

Esperado: build passa sem erros de TypeScript. Se houver erro em `comment-sidebar.tsx` sobre `PendingComment`, verifique que o `import type` aponta para `@/components/review-page-client`.

- [ ] **Step 3: Commit**

```bash
git add src/components/review-page-client.tsx
git commit -m "feat: add ReviewPageClient with inline comment state and floating button"
```

---

## Task 4: Atualizar página de revisão e remover comment-form

**Files:**
- Modify: `src/app/review/[token]/page.tsx`
- Delete: `src/components/comment-form.tsx`

- [ ] **Step 1: Atualizar `review/[token]/page.tsx`**

Substitua o conteúdo completo do arquivo:

```tsx
import { notFound } from 'next/navigation'
import { getDocumentByToken } from '@/lib/storage'
import { ReviewPageClient } from '@/components/review-page-client'

export const dynamic = 'force-dynamic'

export default async function ReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const doc = getDocumentByToken(token)
  if (!doc) notFound()

  // Security: only extract what the client should see
  // full_prompt is intentionally not used here
  const { project_name, client_name, public_prompt, review_token } = doc

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-12 space-y-10">
        <div className="text-center space-y-2">
          <p className="text-sm text-slate-500 uppercase tracking-wide font-medium">
            Revisão de agente de IA
          </p>
          <h1 className="text-2xl font-bold text-slate-900">{project_name}</h1>
          <p className="text-slate-500">{client_name}</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-blue-800 text-sm leading-relaxed">
          <p className="font-semibold mb-2">Como revisar:</p>
          <p>
            Revise as informações abaixo antes da ativação do agente de IA. Selecione qualquer
            trecho do texto e clique em <strong>+ Comentar</strong> para registrar uma observação
            sobre aquele ponto. Você pode adicionar múltiplos comentários antes de enviar.
          </p>
        </div>

        <ReviewPageClient publicPrompt={public_prompt} reviewToken={review_token} />
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Deletar comment-form.tsx**

```bash
del "src\components\comment-form.tsx"
```

- [ ] **Step 3: Verificar que nada mais importa comment-form**

```bash
grep -r "comment-form" src/
```

Esperado: nenhum resultado.

- [ ] **Step 4: Build final**

```bash
npm run build
```

Esperado: build passa sem erros.

- [ ] **Step 5: Testar no browser**

```bash
npm run dev
```

Acesse `http://localhost:3000/admin`, abra um documento, copie o link de revisão e abra em outra aba.

Cheklist manual:
- [ ] Texto do prompt aparece na coluna esquerda
- [ ] Sidebar aparece à direita no desktop
- [ ] Selecionar texto mostra botão flutuante "+ Comentar"
- [ ] Clicar no botão adiciona card na sidebar com o trecho em âmbar
- [ ] Trecho selecionado fica destacado em amarelo no texto
- [ ] Botão "+ Comentário geral" adiciona card sem trecho
- [ ] Botão × remove o card
- [ ] "Enviar" fica desabilitado sem nome ou sem comentários
- [ ] Enviar com múltiplos comentários mostra tela de sucesso
- [ ] Comentários aparecem na tela admin com os trechos selecionados

- [ ] **Step 6: Commit final**

```bash
git add src/app/review/[token]/page.tsx
git commit -m "feat: wire up ReviewPageClient on review page, remove old CommentForm"
```
