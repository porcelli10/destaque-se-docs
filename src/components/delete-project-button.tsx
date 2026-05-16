'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

interface DeleteProjectButtonProps {
  documentId: string
  projectName: string
}

export function DeleteProjectButton({ documentId, projectName }: DeleteProjectButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmName, setConfirmName] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleOpen() {
    setConfirmName('')
    setOpen(true)
  }

  function handleConfirm() {
    startTransition(async () => {
      await fetch(`/api/documents/${documentId}`, { method: 'DELETE' })
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={handleOpen}>
        Excluir
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir projeto</DialogTitle>
            <DialogDescription>
              Esta ação é irreversível. Todos os comentários associados também serão excluídos.
              <br /><br />
              Digite <strong>{projectName}</strong> para confirmar:
            </DialogDescription>
          </DialogHeader>
          <Input
            value={confirmName}
            onChange={e => setConfirmName(e.target.value)}
            placeholder={projectName}
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter' && confirmName === projectName) handleConfirm() }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={confirmName !== projectName || isPending}
              onClick={handleConfirm}
            >
              {isPending ? 'Excluindo...' : 'Confirmar exclusão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
