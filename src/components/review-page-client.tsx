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
      const toSubmit = pendingComments.filter(c => c.comment_text.trim().length > 0)

      if (toSubmit.length === 0) {
        setError('Preencha o texto de pelo menos um comentário antes de enviar.')
        return
      }

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
