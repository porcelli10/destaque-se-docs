import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getDocumentById, getCommentsByDocumentId } from '@/lib/storage'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DocumentEditor } from '@/components/document-editor'
import { StatusBadge } from '@/components/status-badge'
import { AdminPromptEditor } from '@/components/admin-prompt-editor'
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

        <AdminPromptEditor fullPrompt={doc.full_prompt} comments={comments} />
      </div>
    </main>
  )
}
