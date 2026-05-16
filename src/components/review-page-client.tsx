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
