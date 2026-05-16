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
