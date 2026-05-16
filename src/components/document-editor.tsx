'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CopyButton } from '@/components/copy-button'
import { parsePublicPrompt, validateHideTags } from '@/lib/prompt-utils'
import type { Document } from '@/lib/types'

interface DocumentEditorProps {
  document?: Document
  hidePromptEditor?: boolean
}

export function DocumentEditor({ document, hidePromptEditor }: DocumentEditorProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [projectName, setProjectName] = useState(document?.project_name ?? '')
  const [clientName, setClientName] = useState(document?.client_name ?? '')
  const [fullPrompt, setFullPrompt] = useState(document?.full_prompt ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saveLabel, setSaveLabel] = useState('Salvar')

  const validation = validateHideTags(fullPrompt)
  const publicPreview = validation.valid ? parsePublicPrompt(fullPrompt) : ''

  async function handleSave() {
    setError(null)

    if (!projectName.trim() || !clientName.trim()) {
      setError('Nome do projeto e nome do cliente são obrigatórios.')
      return
    }

    if (!validation.valid) {
      setError(validation.error)
      return
    }

    startTransition(async () => {
      const method = document ? 'PUT' : 'POST'
      const url = document ? `/api/documents/${document.id}` : '/api/documents'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_name: projectName, client_name: clientName, full_prompt: fullPrompt }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Erro ao salvar.')
        return
      }

      const saved = await res.json()
      setSaveLabel('Salvo!')
      setTimeout(() => setSaveLabel('Salvar'), 2000)

      if (!document) {
        router.push(`/admin/documents/${saved.id}`)
      } else {
        router.refresh()
      }
    })
  }

  async function handleStatusChange(status: string) {
    if (!document) return
    await fetch(`/api/documents/${document.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    router.refresh()
  }

  const reviewUrl = document
    ? `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/review/${document.review_token}`
    : ''

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="project_name">Nome do projeto</Label>
          <Input
            id="project_name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Ex: Agente Atendimento Total Tech"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="client_name">Nome do cliente</Label>
          <Input
            id="client_name"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Ex: João Silva"
          />
        </div>
      </div>

      {!hidePromptEditor && <Tabs defaultValue="full">
        <TabsList>
          <TabsTrigger value="full">Prompt completo</TabsTrigger>
          <TabsTrigger value="preview">Visualização do cliente</TabsTrigger>
        </TabsList>

        <TabsContent value="full" className="mt-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Prompt completo (com partes ocultas)</Label>
              <CopyButton getText={() => fullPrompt} label="Copiar prompt completo" />
            </div>
            <Textarea
              value={fullPrompt}
              onChange={(e) => setFullPrompt(e.target.value)}
              placeholder={'Cole o prompt completo aqui.\n\nUse [OCULTAR] e [/OCULTAR] para ocultar partes internas.\n\nExemplo:\n[OCULTAR]\nRegra interna: nunca passar preço antes do diagnóstico.\n[/OCULTAR]'}
              className="min-h-[400px] font-mono text-sm resize-y"
            />
            {!validation.valid && fullPrompt && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                ⚠️ {validation.error}
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>O que o cliente verá</Label>
              <CopyButton getText={() => publicPreview} label="Copiar versão do cliente" />
            </div>
            {validation.valid && fullPrompt ? (
              <div className="min-h-[400px] border rounded-md p-4 bg-white font-mono text-sm whitespace-pre-wrap text-slate-800">
                {publicPreview || <span className="text-slate-400">Nenhum conteúdo visível após ocultar as partes marcadas.</span>}
              </div>
            ) : (
              <div className="min-h-[400px] border rounded-md p-4 bg-slate-50 flex items-center justify-center text-slate-400 text-sm">
                {!fullPrompt ? 'Cole o prompt na aba anterior para visualizar.' : 'Corrija os erros nas tags antes de visualizar.'}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</p>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? 'Salvando...' : saveLabel}
        </Button>

        {document && (
          <>
            <CopyButton getText={() => reviewUrl} label="Copiar link de revisão" variant="outline" />
            <Button variant="outline" onClick={() => handleStatusChange('Enviado ao cliente')}>
              Marcar como enviado ao cliente
            </Button>
            <Button variant="outline" onClick={() => handleStatusChange('Finalizado')}>
              Marcar como finalizado
            </Button>
            <a
              href={`/review/${document.review_token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 underline hover:text-blue-800"
            >
              Abrir página do cliente ↗
            </a>
          </>
        )}
      </div>
    </div>
  )
}
