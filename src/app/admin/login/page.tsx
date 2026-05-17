'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Erro ao autenticar.')
        return
      }

      const from = searchParams.get('from') ?? '/admin'
      router.push(from)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoFocus
          required
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Entrando...' : 'Entrar'}
      </Button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-full max-w-sm bg-white border rounded-xl shadow-sm p-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Destaque-se Docs</h1>
          <p className="text-sm text-slate-500 mt-1">Acesso restrito</p>
        </div>

        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  )
}
