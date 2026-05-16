# Inline Commenting — Design Spec
_Data: 2026-05-16_

## Objetivo

Permitir que o cliente selecione trechos do prompt na página de revisão e adicione múltiplos comentários inline antes de enviar tudo de uma vez, com experiência similar ao Google Docs.

---

## Arquitetura de componentes

```
review/[token]/page.tsx        ← Server Component (sem mudança funcional)
  └─ ReviewPageClient.tsx      ← novo Client Component, contém todo estado interativo
       ├─ PromptViewer.tsx     ← renderiza texto com highlights
       ├─ FloatingCommentBtn   ← inline no ReviewPageClient, botão flutuante na seleção
       └─ CommentSidebar.tsx   ← sidebar com identity fields + cards + submit
```

O `comment-form.tsx` existente é removido e substituído por essa estrutura.
Nenhuma mudança de API ou schema — `selected_text` já existe.

---

## Layout

- **Desktop:** `grid grid-cols-[1fr_360px] gap-6` — prompt à esquerda, sidebar à direita
- **Sidebar:** `sticky top-6` para acompanhar scroll
- **Mobile (< md):** coluna única, sidebar aparece abaixo do prompt

---

## Estado (`ReviewPageClient`)

```typescript
interface PendingComment {
  id: string           // nanoid local, descartado no envio
  selected_text: string | null
  comment_text: string
}

authorName: string
authorEmail: string
pendingComments: PendingComment[]
floatingBtn: { visible: boolean; x: number; y: number }
submitting: boolean
submitted: boolean
```

---

## Fluxo de interação

1. Usuário seleciona texto dentro do container do prompt
2. Evento `mouseup` captura `window.getSelection()` — botão flutuante aparece fixo nas coordenadas do cursor
3. Usuário clica "Comentar" → `PendingComment` adicionado à lista com `selected_text` preenchido; sidebar faz scroll para o novo card; botão flutuante some
4. Usuário preenche o texto do comentário no card da sidebar
5. Pode repetir os passos 1–4 para múltiplos trechos
6. Pode adicionar comentário geral (sem trecho) via botão "+ Comentário geral" na sidebar
7. Clica "Enviar X comentários" → POST em paralelo para `/api/comments` para cada item
8. Sucesso total → tela de confirmação. Erro parcial → mensagem de erro listando falhas

---

## Highlights no texto (`PromptViewer`)

- Props: `text: string`, `highlights: string[]`
- Renderiza o texto splitado por cada `highlight`, envolvendo matches em `<mark className="bg-yellow-200 rounded-sm">`
- Texto com `whitespace-pre-wrap` para preservar quebras de linha
- Se o mesmo trecho aparecer múltiplas vezes no texto, todas as ocorrências ficam destacadas

---

## Botão flutuante

- `position: fixed` nas coordenadas do `mouseup`
- Desaparece ao clicar fora do prompt ou ao iniciar nova seleção
- Só aparece se a seleção estiver contida no container do prompt (verificado via `Node.contains`)

---

## Sidebar (`CommentSidebar`)

**Topo:** campos Nome (obrigatório) e Email (opcional) — preenchidos uma vez, valem para todos os comentários

**Lista de cards:** para cada `PendingComment`:
- Se tiver `selected_text`: box âmbar com o trecho em itálico
- Textarea para digitar o comentário
- Botão × para remover o card

**Empty state:** "Selecione um trecho do texto para comentar ou adicione um comentário geral."

**Rodapé:**
- Botão "+ Comentário geral" (adiciona `PendingComment` com `selected_text: null`)
- Botão "Enviar X comentários" (desabilitado se lista vazia ou Nome não preenchido)

---

## Admin

A tela `/admin/documents/[id]` já renderiza `selected_text` com destaque âmbar — nenhuma mudança necessária.

---

## O que não está no escopo

- Ancoragem exata de cada comentário da sidebar na linha correspondente do texto (complexidade alta, ganho baixo)
- Edição de comentários já enviados pelo cliente
- Notificações ao admin (pendência separada)
