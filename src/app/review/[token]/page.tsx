import { notFound } from 'next/navigation'
import { getDocumentByToken } from '@/lib/storage'
import { CommentForm } from '@/components/comment-form'
import { Separator } from '@/components/ui/separator'

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
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-10">
        <div className="text-center space-y-2">
          <p className="text-sm text-slate-500 uppercase tracking-wide font-medium">Revisão de agente de IA</p>
          <h1 className="text-2xl font-bold text-slate-900">{project_name}</h1>
          <p className="text-slate-500">{client_name}</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-blue-800 text-sm leading-relaxed">
          <p className="font-semibold mb-2">Como revisar:</p>
          <p>
            Revise as informações abaixo antes da ativação do agente de IA.
            Caso encontre algo que precise ser ajustado, escreva suas observações
            no campo de comentários no final da página.
          </p>
          <p className="mt-2 text-xs text-blue-600">
            Dica: selecione um trecho do texto e vá ao campo de comentários para indicar exatamente o que precisa mudar.
          </p>
        </div>

        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
            Conteúdo para revisão
          </h2>
          <pre className="whitespace-pre-wrap font-sans text-slate-800 text-sm leading-relaxed">
            {public_prompt}
          </pre>
        </div>

        <Separator />

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">Enviar comentários</h2>
          <CommentForm reviewToken={review_token} />
        </div>
      </div>
    </main>
  )
}
