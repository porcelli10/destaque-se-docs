import { Badge } from '@/components/ui/badge'
import type { DocumentStatus } from '@/lib/types'

const variants: Record<DocumentStatus, 'secondary' | 'default' | 'outline' | 'destructive'> = {
  'Rascunho': 'secondary',
  'Enviado ao cliente': 'default',
  'Comentado pelo cliente': 'destructive',
  'Finalizado': 'outline',
}

export function StatusBadge({ status }: { status: DocumentStatus }) {
  return <Badge variant={variants[status]}>{status}</Badge>
}
