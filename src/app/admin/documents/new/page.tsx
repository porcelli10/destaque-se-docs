import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DocumentEditor } from '@/components/document-editor'

export default function NewDocumentPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
            ← Voltar
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Novo documento</h1>
        </div>
        <DocumentEditor />
      </div>
    </main>
  )
}
