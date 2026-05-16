import Link from 'next/link'
import { getAllDocuments, getCommentsByDocumentId } from '@/lib/storage'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/status-badge'
import { CopyLinkButton } from '@/components/copy-link-button'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const documents = getAllDocuments()

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Destaque-se Docs</h1>
            <p className="text-slate-500 text-sm mt-1">Revisão de prompts de agentes de IA</p>
          </div>
          <Link href="/admin/documents/new" className={cn(buttonVariants({ variant: 'default' }))}>
            + Novo documento
          </Link>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-24 text-slate-400">
            <p className="text-lg">Nenhum documento ainda.</p>
            <p className="text-sm mt-2">Crie o primeiro documento para começar.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => {
              const comments = getCommentsByDocumentId(doc.id)
              const openComments = comments.filter((c) => c.status === 'Aberto').length
              return (
                <Card key={doc.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="flex items-center justify-between py-4 px-6">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-semibold text-slate-800 truncate">{doc.project_name}</span>
                        <StatusBadge status={doc.status} />
                        {openComments > 0 && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                            {openComments} comentário{openComments > 1 ? 's' : ''} aberto{openComments > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-500">
                        Cliente: {doc.client_name} · Criado em{' '}
                        {format(new Date(doc.created_at), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                        {comments.length > 0 && ` · ${comments.length} comentário${comments.length > 1 ? 's' : ''} recebido${comments.length > 1 ? 's' : ''}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <CopyLinkButton token={doc.review_token} />
                      <Link
                        href={`/admin/documents/${doc.id}`}
                        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                      >
                        Abrir
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
