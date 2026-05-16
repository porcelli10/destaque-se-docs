'use client'

import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface CopyButtonProps {
  getText: () => string
  label: string
  variant?: 'default' | 'outline' | 'secondary'
  size?: 'default' | 'sm'
}

export function CopyButton({ getText, label, variant = 'outline', size = 'sm' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(getText())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button variant={variant} size={size} onClick={handleCopy}>
      {copied ? 'Copiado!' : label}
    </Button>
  )
}
