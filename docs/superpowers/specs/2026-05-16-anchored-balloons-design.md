# Anchored Comment Balloons — Design Spec
_Data: 2026-05-16_

## Objetivo

Substituir a sidebar empilhada por balões de comentário ancorados verticalmente ao trecho de texto selecionado, estilo Google Docs. Sem sobreposição entre balões (push-down automático). Funciona tanto na view do cliente (composição) quanto na view do admin (revisão).

---

## Arquitetura de componentes

```
AnchoredCommentLayout          ← engine genérica de posicionamento
 ├─ PromptViewer               ← texto com <mark data-highlight-id="...">
 └─ BalloonColumn              ← coluna direita (position: relative)
      ├─ ComposeBalloon[N]     ← modo compose: textarea editável + remover
      └─ ReviewBalloon[N]      ← modo review: read-only + resolver

ReviewPageClient               ← view do cliente (reescrito)
 └─ AnchoredCommentLayout (mode="compose")

AnchoredReviewViewer           ← view do admin (novo)
 └─ AnchoredCommentLayout (mode="review")
```

**Arquivos modificados/criados/deletados:**

| Ação | Arquivo |
|------|---------|
| Modificar | `src/components/prompt-viewer.tsx` |
| Criar | `src/components/anchored-comment-layout.tsx` |
| Criar | `src/components/compose-balloon.tsx` |
| Criar | `src/components/review-balloon.tsx` |
| Reescrever | `src/components/review-page-client.tsx` |
| Criar | `src/components/anchored-review-viewer.tsx` |
| Modificar | `src/app/admin/documents/[id]/page.tsx` |
| Deletar | `src/components/comment-sidebar.tsx` |
| Deletar | `src/components/comments-section.tsx` |

---

## PromptViewer — mudança de API

`highlights` muda de `string[]` para `Highlight[]`:

```typescript
export interface Highlight {
  id: string
  text: string
}
```

Cada `<mark>` recebe `data-highlight-id={highlight.id}`. Isso permite que `AnchoredCommentLayout` encontre cada marca no DOM com `querySelector('[data-highlight-id="..."]')`.

Retrocompatibilidade: todos os lugares que usam `PromptViewer` são atualizados na mesma task.

---

## AnchoredCommentLayout

### Props

```typescript
interface BalloonEntry {
  id: string
  selected_text: string | null  // null = comentário geral, vai ao final
}

interface AnchoredCommentLayoutProps {
  text: string
  balloons: BalloonEntry[]
  renderBalloon: (id: string, index: number) => React.ReactNode
}
```

### Algoritmo de posicionamento

**Passo 1 — medir âncoras** (`useLayoutEffect` após cada mudança em `balloons` ou `text`):

```typescript
// Para cada balloon com selected_text:
const mark = textRef.current.querySelector(`[data-highlight-id="${id}"]`)
const anchorY = mark.getBoundingClientRect().top - containerRef.current.getBoundingClientRect().top
```

**Passo 2 — medir alturas dos balões** (cada balão expõe sua altura via `ResizeObserver` ou `getBoundingClientRect`).

**Passo 3 — push-down** (ordem crescente de anchorY):

```typescript
const GAP = 8
let currentBottom = 0
for (const balloon of sortedByAnchor) {
  const anchor = anchorPositions[balloon.id] ?? currentBottom
  const top = Math.max(anchor, currentBottom)
  tops[balloon.id] = top
  currentBottom = top + (heights[balloon.id] ?? 120) + GAP
}
// comentários gerais (selected_text === null) vão após todos os ancorados
```

**Passo 4 — altura da coluna:**

```typescript
const columnHeight = Math.max(textHeight, currentBottom)
```

### Renderização

```tsx
<div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-0 items-start">
  {/* Coluna esquerda — texto */}
  <div ref={containerRef} className="...">
    <div ref={textRef}>
      <PromptViewer text={text} highlights={highlights} />
    </div>
  </div>

  {/* Coluna direita — balões */}
  <div className="relative hidden md:block" style={{ minHeight: columnHeight }}>
    {balloons.map(b => (
      <div
        key={b.id}
        className="absolute w-full px-3 transition-[top] duration-150"
        style={{ top: tops[b.id] ?? 0, opacity: measured ? 1 : 0 }}
      >
        {renderBalloon(b.id, index)}
      </div>
    ))}
  </div>

  {/* Mobile: balões abaixo do texto, em ordem de criação */}
  <div className="md:hidden space-y-3 mt-4">
    {balloons.map(b => renderBalloon(b.id, index))}
  </div>
</div>
```

`measured` começa `false`; é setado `true` após o primeiro `useLayoutEffect` — previne flash de posicionamento incorreto.

### Linha conectora

Para cada balão ancorado, renderizar uma linha fina horizontal na altura do `anchorY`, da borda direita do texto até o balão:

```tsx
// dentro da coluna de balões
{b.selected_text && tops[b.id] !== undefined && anchorPositions[b.id] !== undefined && (
  <div
    className="absolute right-full w-4 border-t border-dashed border-slate-300"
    style={{ top: anchorPositions[b.id] + 8 }}  // +8 = metade da linha de texto
  />
)}
```

---

## ComposeBalloon

Balão editável para o cliente. Props:

```typescript
interface ComposeBalloonProps {
  selectedText: string | null
  commentText: string
  onChange: (text: string) => void
  onRemove: () => void
}
```

Visual:
- Borda esquerda colorida (`border-l-2 border-blue-400`)
- Se `selectedText`: box âmbar com trecho em itálico
- Textarea `min-h-[80px] resize-none`
- Botão "Remover" (texto pequeno)

---

## ReviewBalloon

Balão read-only para o admin. Props:

```typescript
interface ReviewBalloonProps {
  authorName: string
  authorEmail: string
  commentText: string
  selectedText: string | null
  status: 'Aberto' | 'Resolvido'
  createdAt: string
  onResolve: () => void
}
```

Visual:
- Borda esquerda colorida: azul (`Aberto`) / cinza (`Resolvido`)
- `opacity-50` quando Resolvido
- Nome + data no topo
- Se `selectedText`: box âmbar
- Texto do comentário
- Badge de status + botão "Resolver" (só se Aberto)

---

## ReviewPageClient — reescrita

**Barra superior** (renderizada por `ReviewPageClient`, acima do `AnchoredCommentLayout`, fora do grid):
```tsx
<div className="flex items-center gap-3 mb-4 p-4 bg-white border rounded-xl shadow-sm">
  <Input placeholder="Seu nome *" value={authorName} onChange={...} className="w-40" />
  <Input placeholder="Email" value={authorEmail} onChange={...} className="w-48" />
  <Button onClick={onAddGeneral} variant="outline" size="sm">+ Comentário geral</Button>
  <Button onClick={handleSubmit} disabled={!canSubmit} className="ml-auto">
    Enviar {count} comentário(s)
  </Button>
</div>
```

**Estado:** igual ao atual (`pendingComments`, `floatingBtn`, `authorName`, `authorEmail`, `submitting`, `submitted`, `error`).

**Handlers:** iguais ao atual (`handleAddComment`, `handleAddGeneral`, `handleCommentTextChange`, `handleRemoveComment`, `handleSubmit`).

**Diferença principal:** o `renderBalloon` passa para `AnchoredCommentLayout` que renderiza `ComposeBalloon`.

`PendingComment` permanece exportado (mesmo schema).

---

## AnchoredReviewViewer

Client Component. Props:

```typescript
interface AnchoredReviewViewerProps {
  publicPrompt: string
  comments: ReviewComment[]
}
```

- Botão "Copiar todos os comentários" no topo
- Usa `useRouter` + `router.refresh()` após resolver
- Passa `ReviewBalloon` via `renderBalloon` para `AnchoredCommentLayout`
- Estado local: apenas `optimisticResolved: Set<string>` para feedback imediato ao clicar "Resolver"

---

## Admin page

`CommentsSection` substituído por `AnchoredReviewViewer`:

```tsx
// antes
<CommentsSection comments={comments} />

// depois
<AnchoredReviewViewer publicPrompt={doc.public_prompt} comments={comments} />
```

---

## O que não muda

- API routes — sem alterações
- Schema `ReviewComment` — sem alterações
- Lógica de `parsePublicPrompt` / `validateHideTags`
- `DocumentEditor` — sem alterações
- Segurança: `full_prompt` nunca exposto ao cliente

---

## O que não está no escopo

- Threads de resposta nos comentários
- Edição de comentários já enviados
- Notificações ao admin (pendência separada)
- Ancoragem de comentários gerais (ficam sempre ao final)
