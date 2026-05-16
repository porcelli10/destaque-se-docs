# Destaque-se Docs

Ferramenta interna para revisão de prompts de agentes de IA antes da ativação com clientes.

## Como funciona

1. Admin cria um documento com o prompt completo
2. Partes internas são marcadas com `[OCULTAR]...[/OCULTAR]`
3. O sistema gera uma versão pública sem as partes ocultas
4. Admin gera um link de revisão e envia para o cliente
5. Cliente abre o link, lê o conteúdo liberado e envia comentários
6. Admin recebe os comentários, ajusta o prompt e copia a versão final para o n8n

## Segurança

As partes ocultas são removidas no servidor antes de qualquer resposta à rota pública.
O cliente nunca recebe o prompt completo, nem via DevTools, nem via chamadas de API.

## Instalação

```bash
# Clone o repositório
git clone <url>
cd destaque-se-docs

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

Acesse [http://localhost:3000/admin](http://localhost:3000/admin).

## Sintaxe de ocultação

```
Texto visível ao cliente.

[OCULTAR]
Conteúdo interno que o cliente não verá.
Regras, webhooks, ferramentas internas.
[/OCULTAR]

Mais texto visível ao cliente.
```

## Estrutura de dados

Os documentos e comentários são armazenados em arquivos JSON na pasta `/data/`:
- `data/documents.json`
- `data/comments.json`

### Migração para Supabase

Para migrar para Supabase, substitua as funções em `src/lib/storage.ts` por chamadas ao cliente Supabase. Os tipos em `src/lib/types.ts` já correspondem ao esquema de tabelas descrito abaixo.

**Tabela `documents`:** id, project_name, client_name, full_prompt, public_prompt, review_token, status, created_at, updated_at

**Tabela `review_comments`:** id, document_id, author_name, author_email, comment_text, selected_text, status, created_at

## Scripts

```bash
npm run dev      # Desenvolvimento
npm run build    # Build de produção
npm run start    # Iniciar em produção
npm run lint     # Lint
```
