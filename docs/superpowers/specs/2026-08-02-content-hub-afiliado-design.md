# Content Hub — Pipeline de Conteúdo Afiliado Semi-Automatizado

Data: 2026-08-02

## Contexto e objetivo

O azpetshop.com.br precisa de um pipeline para produzir posts de comparativo
de produtos afiliados (Amazon) dentro do próprio repositório Astro, sem
infraestrutura externa nova (sem Supabase, sem n8n). O fluxo é semi-automatizado:
scripts Node/TS chamam a API do Gemini (com Google Search grounding) nas etapas
de pesquisa e redação, mas a curadoria de produtos (`selecionados.json`) é
sempre manual, editada por humano no editor de código.

## Estrutura de pastas

```
content-hub/
  scripts/
    pautas-sync.ts
    candidatos.ts
    pesquisa.ts
    escrever.ts
    revisar.ts
  lib/
    gemini.ts            # wrapper @google/genai + grounding
    schemas.ts            # tipos/zod dos JSONs intermediários
    paths.ts               # resolve content/pautas/{slug}/...
    frontmatter.ts          # monta frontmatter conforme src/content.config.ts
  knowledge/
    tom-de-voz.md            (placeholder, preenchido depois)
    regras-eeat.md            (placeholder)
    guia-links-internos.md     (placeholder)
  pautas-master.csv            # planilha mestre fornecida pelo usuário

content/pautas/{slug}/
  pauta.json
  candidatos.json
  selecionados.json       # editado manualmente
  dossies.json
```

`content/pautas/` fica na raiz do repositório (dado de trabalho interno, não
publicável pelo Astro), separado de `content-hub/` (código do pipeline).

## Formatos de dados

**pautas-master.csv** — colunas: `slug, categoria, palavra_chave, tipo_produto, prioridade`

**pauta.json**:
```json
{
  "slug": "melhor-racao-filhotes",
  "categoria": "caes",
  "palavraChave": "melhor ração para filhotes",
  "tipoProduto": "ração seca filhote",
  "prioridade": 1
}
```

**candidatos.json** — array de `{ nome, marca, diferencial }`.

**selecionados.json** (editado manualmente, copiado a partir de candidatos.json)
— array de `{ nome, marca, diferencial, asin, linkAfiliado, angulo }`.
O `linkAfiliado` é colado manualmente pelo usuário (link completo já pronto,
com tag de afiliado); os scripts não montam nem validam a URL.

**dossies.json** — array indexado por produto (nome/asin) com
`{ specs, pros, contras, faixaPreco, faqs }`.

Todos os JSONs intermediários são validados com Zod (`content-hub/lib/schemas.ts`)
antes de cada etapa consumir o arquivo anterior. Falha cedo com mensagem clara
em português se o formato estiver incorreto.

## Schema do Astro (referência real)

`src/content.config.ts` define a collection `blog` com:
`title, excerpt, category, type ("guia"|"roundup"), hero?, publishedAt,
updatedAt?, author, draft, products[]` (cada produto com
`name, image?, affiliateUrl, price?, badge?, pros[], cons[], verdict?`).

Não existem os campos `description`/`pubDate` do pedido original — o script
`content:escrever` usa os nomes reais do schema.

Componentes MDX existentes reaproveitados como referência de estrutura
(baseado em `src/content/blog/caes/qual-o-melhor-tapete-higienico-para-caes.mdx`):
`<QuickSummary items={...} />` (resumo top-3) e
`<ProductHighlight id badge name image href stars score>` (review individual).

Novo componente `src/components/Faq.astro`: recebe `items: {question, answer}[]`,
renderiza `<details>/<summary>` sem JS, e injeta
`<script type="application/ld+json">` com `FAQPage`/`Question`/`Answer`
(schema.org). Usado na seção de FAQ do artigo gerado.

## Scripts

### `content:pautas:sync`
Lê `content-hub/pautas-master.csv`, gera/atualiza um `pauta.json` por slug em
`content/pautas/{slug}/`. Idempotente (roda de novo sem duplicar/quebrar).

### `content:candidatos --pauta={slug}`
Lê `pauta.json` (erro claro se não existir: "rode content:pautas:sync antes").
Chama Gemini (`gemini-2.5-flash`, com Google Search grounding) pedindo 5-8
produtos candidatos pra `tipoProduto`/`categoria` da pauta, com
nome/marca/diferencial resumido. Salva `candidatos.json`.

### Edição manual
Usuário copia produtos aprovados de `candidatos.json` para `selecionados.json`,
adicionando `asin`, `linkAfiliado`, `angulo`. Sem UI — edição direta do JSON.

### `content:pesquisa --pauta={slug}`
Lê `selecionados.json` (erro claro se não existir: "edite selecionados.json
primeiro"). Para cada produto, chama Gemini com grounding pedindo specs, prós,
contras, faixa de preço e FAQs. Salva `dossies.json`.

### `content:escrever --pauta={slug}`
Lê `selecionados.json` + `dossies.json` + os 3 arquivos de `knowledge/*.md`.
Monta um prompt com a metodologia de estrutura do artigo de referência
(resumo top-3, reviews individuais com nota, "como escolher", FAQ) embutida
no prompt (não lida em runtime — é fixa no código do script). Pede ao Gemini
apenas o **corpo** do MDX (usando `<QuickSummary>`, `<ProductHighlight>`,
`<Faq>`).

O **frontmatter é montado programaticamente** pelo script a partir de
`selecionados.json` + `dossies.json` (title, excerpt, category, type="roundup",
hero, publishedAt=hoje, author padrão, draft=true, products[] preenchido a
partir dos dossiês) — o script não confia no Gemini para gerar frontmatter.

Grava em `src/content/blog/{categoria}/{slug}.mdx`. Falha se o arquivo já
existir, a menos que `--force` seja passado.

### `content:revisar --pauta={slug}`
Lê o `.mdx` gerado. Roda um checklist **determinístico local** (sem IA):
tamanho de `title`/`excerpt`, presença do componente `<Faq>`, hierarquia de
headings (H2 antes de H3), contagem de links internos (`/blog/`). Em seguida
faz **uma segunda chamada Gemini** em "modo editor", pedindo uma crítica
qualitativa curta (clareza, EEAT, tom) com base nos `knowledge/*.md`. Imprime
os dois blocos de resultado no terminal. Não bloqueia publicação — é só
relatório. Fora de escopo nesta v1: sugestão automática de links internos
concretos (varredura de outros posts) — fica pra uma v2 se fizer falta.

## Autenticação e modelo Gemini

Sem `GOOGLE_CREDENTIALS_BASE64` ou `@google/generative-ai` já em uso no
projeto. Usa o pacote atual `@google/genai` com autenticação simples via
variável de ambiente `GEMINI_API_KEY`. Modelo único em todas as chamadas:
`gemini-2.5-flash`, com grounding via Google Search tool na API.

`content-hub/lib/gemini.ts` centraliza a criação do client e expõe uma função
`generateGrounded(prompt, { model })` que já lida com grounding, timeout e um
retry simples se a resposta não vier em JSON válido quando esperado.

## package.json

`devDependencies` adicionados: `tsx`, `zod`, `@google/genai`.

Scripts adicionados (todos via `tsx`, sem passo de build):
```
"content:pautas:sync": "tsx content-hub/scripts/pautas-sync.ts",
"content:candidatos": "tsx content-hub/scripts/candidatos.ts",
"content:pesquisa": "tsx content-hub/scripts/pesquisa.ts",
"content:escrever": "tsx content-hub/scripts/escrever.ts",
"content:revisar": "tsx content-hub/scripts/revisar.ts"
```

## Tratamento de erros

Cada script valida pré-requisitos (arquivo da etapa anterior existe e passa
na validação Zod) antes de gastar uma chamada de API, com mensagem acionável
em português indicando o comando a rodar antes. Chamadas Gemini têm timeout e
1 retry em caso de JSON malformado na resposta.

## Testes

Seguindo o padrão do projeto (`node --test`), testes cobrem apenas as partes
determinísticas e puras: builder de frontmatter, checklist do
`content:revisar`, e parsing/validação Zod dos JSONs intermediários. Não há
teste automatizado das chamadas reais à API Gemini (custo e não-determinismo);
o wrapper em `lib/gemini.ts` fica isolado para permitir mock futuro se
necessário.

## Fora de escopo (v1)

- UI para curadoria de produtos (edição manual de JSON é suficiente).
- Geração/validação automática de link de afiliado a partir do ASIN.
- Sugestão automática de links internos concretos no `content:revisar`.
- Conteúdo real dos arquivos `knowledge/*.md` (ficam como placeholder, a
  preencher separadamente pelo usuário).
