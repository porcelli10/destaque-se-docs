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
    const text = getText()
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const el = document.createElement('textarea')
      el.value = text
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.focus()
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button variant={variant} size={size} onClick={handleCopy}>
      {copied ? 'Copiado!' : label}
    </Button>
  )
}
