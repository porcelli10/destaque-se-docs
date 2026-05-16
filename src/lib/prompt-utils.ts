export interface ValidationResult {
  valid: boolean
  error: string | null
}

export function validateHideTags(prompt: string): ValidationResult {
  const openPattern = /\[OCULTAR\]/g
  const closePattern = /\[\/OCULTAR\]/g

  const opens = [...prompt.matchAll(openPattern)].map((m) => m.index!)
  const closes = [...prompt.matchAll(closePattern)].map((m) => m.index!)

  if (opens.length !== closes.length) {
    return {
      valid: false,
      error: `Tags desbalanceadas: ${opens.length} [OCULTAR] e ${closes.length} [/OCULTAR] encontrados.`,
    }
  }

  for (let i = 0; i < opens.length; i++) {
    if (opens[i] > closes[i]) {
      return {
        valid: false,
        error: `Tag [/OCULTAR] aparece antes de [OCULTAR] na posição ${closes[i]}.`,
      }
    }
    if (i + 1 < opens.length && opens[i + 1] < closes[i]) {
      return {
        valid: false,
        error: `Tags aninhadas não são permitidas (posição ${opens[i + 1]}).`,
      }
    }
  }

  return { valid: true, error: null }
}

export function parsePublicPrompt(fullPrompt: string): string {
  let result = fullPrompt.replace(/\[OCULTAR\][\s\S]*?\[\/OCULTAR\]/g, '')
  result = result.replace(/\n{3,}/g, '\n\n')
  return result.trim()
}
