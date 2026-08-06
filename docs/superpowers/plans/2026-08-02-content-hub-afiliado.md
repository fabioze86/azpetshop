# Content Hub — Pipeline de Conteúdo Afiliado Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o pipeline `content-hub/` (scripts TypeScript executados via `tsx`) que leva uma pauta de conteúdo afiliado da descoberta de produtos (Gemini + grounding) até um `.mdx` publicável em `src/content/blog/`, com curadoria manual no meio e checklist de revisão no fim.

**Architecture:** Módulos puros e testáveis em `content-hub/lib/` (schemas Zod, paths, CSV, frontmatter, prompts, checklist, cliente Gemini) consumidos por 5 scripts finos em `content-hub/scripts/` que fazem apenas I/O e orquestração. Um novo componente `Faq.astro` é registrado no renderer de posts existente.

**Tech Stack:** TypeScript executado via `tsx` (sem build step), `zod` pra validação, `@google/genai` pra chamadas Gemini com Google Search grounding, `gray-matter` (já é dependência do projeto) pra ler/escrever frontmatter, `node:test` pros testes.

## Global Constraints

- Sem infraestrutura externa nova: sem Supabase, sem n8n, sem banco de dados externo.
- Scripts em TypeScript, executados via `tsx` diretamente (sem passo de build `tsc`).
- Autenticação Gemini via variável de ambiente `GEMINI_API_KEY` (o projeto não usa `GOOGLE_CREDENTIALS_BASE64`).
- Modelo único em todas as chamadas: `gemini-2.5-flash`, com Google Search grounding ativado.
- `selecionados.json` é **sempre** editado manualmente por humano — nenhum script deve escrever nesse arquivo.
- Link de afiliado é colado manualmente pelo usuário; nenhum script gera ou valida a URL a partir do ASIN.
- Frontmatter dos posts segue exatamente o schema de `src/content.config.ts`: `title, excerpt, category, type, hero, publishedAt, author, draft, products[]`.
- `content:escrever` nunca sobrescreve um `.mdx` existente, a menos que `--force` seja passado.
- `content:revisar` nunca bloqueia publicação — só imprime um relatório.
- Testes cobrem apenas lógica pura e determinística (builders, parsers, checklist); chamadas reais à API Gemini não são testadas automaticamente.

---

## Task 1: Scaffolding do content-hub

**Files:**
- Modify: `package.json`
- Create: `content-hub/knowledge/tom-de-voz.md`
- Create: `content-hub/knowledge/regras-eeat.md`
- Create: `content-hub/knowledge/guia-links-internos.md`
- Create: `content-hub/pautas-master.csv`
- Create: `content-hub/README.md`

**Interfaces:**
- Produces: dependências `tsx`, `zod@^3`, `@google/genai` instaladas; pasta `content-hub/knowledge/` com 3 arquivos de placeholder lidos por `content:escrever` e `content:revisar` nas tarefas seguintes.

- [ ] **Step 1: Instalar as dependências**

Run:
```
npm install --save-dev tsx "zod@^3" @google/genai
```
Expected: `package.json` ganha as 3 entradas em `devDependencies` e `package-lock.json` é atualizado sem erros.

- [ ] **Step 2: Criar os placeholders de knowledge**

Create `content-hub/knowledge/tom-de-voz.md`:
```markdown
# Tom de voz — AZ Pet Shop

- Direto, caloroso, sem jargão técnico desnecessário.
- Trata o leitor como tutor de pet preocupado em fazer a escolha certa, não como comprador a ser convencido.
- Evita superlativos vazios ("o melhor do mundo") — prefere afirmações específicas e verificáveis.

(placeholder — será substituído por um guia de tom de voz mais completo.)
```

Create `content-hub/knowledge/regras-eeat.md`:
```markdown
# Regras de EEAT — AZ Pet Shop

- Toda afirmação sobre um produto deve vir acompanhada de um motivo concreto (especificação, avaliação, comparação), nunca só opinião genérica.
- Divulgar sempre que há links de afiliados (já existe um aviso padrão no template da página de post).
- Evitar prometer resultados de saúde/comportamento do pet sem ressalva.

(placeholder — será substituído por um guia de EEAT mais completo.)
```

Create `content-hub/knowledge/guia-links-internos.md`:
```markdown
# Guia de links internos — AZ Pet Shop

- Linkar para outros posts da mesma categoria quando fizer sentido pro contexto (ex.: um roundup de ração pode linkar pro guia da raça).
- Usar o formato de URL `/blog/<categoria>/<slug>/` (trailing slash).
- Evitar mais de 1 link interno por parágrafo.

(placeholder — será substituído por um guia de links internos mais completo.)
```

- [ ] **Step 3: Criar o CSV mestre de exemplo**

Create `content-hub/pautas-master.csv`:
```csv
slug,categoria,palavra_chave,tipo_produto,prioridade
melhor-racao-filhotes,caes,melhor ração para filhotes,ração seca filhote,1
```

- [ ] **Step 4: Criar o README de uso do pipeline**

Create `content-hub/README.md`:
```markdown
# Content Hub — pipeline de conteúdo afiliado

Fluxo, na ordem:

1. Edite `content-hub/pautas-master.csv` com as pautas desejadas.
2. `npm run content:pautas:sync` — gera `content/pautas/<slug>/pauta.json` pra cada linha do CSV.
3. `npm run content:candidatos -- --pauta=<slug>` — chama o Gemini e gera `content/pautas/<slug>/candidatos.json` (5-8 produtos candidatos).
4. Edite manualmente `content/pautas/<slug>/selecionados.json`, copiando os produtos aprovados de `candidatos.json` e adicionando `asin`, `linkAfiliado` (link de afiliado completo, colado à mão) e `angulo` (ângulo editorial da review).
5. `npm run content:pesquisa -- --pauta=<slug>` — chama o Gemini pra montar `content/pautas/<slug>/dossies.json` (specs, prós, contras, faixa de preço, FAQs) por produto selecionado.
6. `npm run content:escrever -- --pauta=<slug>` — gera o artigo final em `src/content/blog/<categoria>/<slug>.mdx` (`--force` pra sobrescrever um post já existente).
7. `npm run content:revisar -- --pauta=<slug>` — imprime um checklist técnico + uma crítica editorial do Gemini. Não bloqueia publicação.

Variável de ambiente necessária: `GEMINI_API_KEY`.

Depois de gerar o artigo, faça upload das imagens reais dos produtos com `npm run upload-image` (o comando exato aparece no output de `content:escrever`), e revise o post gerado (`draft: true` por padrão) antes de publicar (mude pra `draft: false`).
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json content-hub/knowledge content-hub/pautas-master.csv content-hub/README.md
git commit -m "chore(content-hub): scaffolding inicial do pipeline de conteudo afiliado"
```

---

## Task 2: `lib/schemas.ts` — validação Zod dos dados intermediários

**Files:**
- Create: `content-hub/lib/schemas.ts`
- Test: `content-hub/lib/schemas.test.ts`

**Interfaces:**
- Produces: `PautaSchema`, `Pauta`, `CandidatoSchema`, `Candidato`, `CandidatosSchema`, `SelecionadoSchema`, `Selecionado`, `SelecionadosSchema`, `FaqItemSchema`, `DossieContentSchema`, `DossieContent`, `DossieSchema`, `Dossie`, `DossiesSchema`, `EscritaResponseSchema`, `EscritaResponse` — usados por todas as tasks seguintes.

- [ ] **Step 1: Write the failing test**

Create `content-hub/lib/schemas.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PautaSchema,
  CandidatosSchema,
  SelecionadosSchema,
  DossiesSchema,
  EscritaResponseSchema,
} from "./schemas.ts";

test("PautaSchema aceita uma pauta válida", () => {
  const pauta = PautaSchema.parse({
    slug: "melhor-racao-filhotes",
    categoria: "caes",
    palavraChave: "melhor ração para filhotes",
    tipoProduto: "ração seca filhote",
    prioridade: 1,
  });
  assert.equal(pauta.slug, "melhor-racao-filhotes");
});

test("PautaSchema rejeita pauta sem categoria", () => {
  assert.throws(() =>
    PautaSchema.parse({
      slug: "x",
      palavraChave: "y",
      tipoProduto: "z",
      prioridade: 1,
    }),
  );
});

test("CandidatosSchema exige ao menos 1 candidato válido", () => {
  const candidatos = CandidatosSchema.parse([
    { nome: "Ração X", marca: "Marca Y", diferencial: "Baixo custo por kg" },
  ]);
  assert.equal(candidatos.length, 1);
  assert.throws(() => CandidatosSchema.parse([]));
});

test("SelecionadosSchema rejeita link de afiliado inválido", () => {
  assert.throws(() =>
    SelecionadosSchema.parse([
      {
        nome: "Ração X",
        marca: "Marca Y",
        diferencial: "Baixo custo por kg",
        asin: "B000123456",
        linkAfiliado: "não é uma url",
        angulo: "Melhor custo-benefício",
      },
    ]),
  );
});

test("DossiesSchema aceita um dossiê completo", () => {
  const dossies = DossiesSchema.parse([
    {
      nome: "Ração X",
      specs: ["Pacote de 15kg"],
      pros: ["Boa palatabilidade"],
      contras: ["Embalagem frágil"],
      faixaPreco: "R$ 150 a R$ 190",
      faqs: [{ pergunta: "Serve pra filhote de porte grande?", resposta: "Sim, a partir de 2 meses." }],
    },
  ]);
  assert.equal(dossies[0].specs.length, 1);
});

test("EscritaResponseSchema rejeita title fora do range de tamanho", () => {
  assert.throws(() =>
    EscritaResponseSchema.parse({
      title: "curto",
      excerpt: "x".repeat(120),
      body: "conteúdo",
    }),
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test content-hub/lib/schemas.test.ts`
Expected: FAIL — `Cannot find module './schemas.ts'` (arquivo ainda não existe).

- [ ] **Step 3: Write the implementation**

Create `content-hub/lib/schemas.ts`:
```ts
import { z } from "zod";

export const PautaSchema = z.object({
  slug: z.string().min(1),
  categoria: z.string().min(1),
  palavraChave: z.string().min(1),
  tipoProduto: z.string().min(1),
  prioridade: z.number().int(),
});
export type Pauta = z.infer<typeof PautaSchema>;

export const CandidatoSchema = z.object({
  nome: z.string().min(1),
  marca: z.string().min(1),
  diferencial: z.string().min(1),
});
export type Candidato = z.infer<typeof CandidatoSchema>;
export const CandidatosSchema = z.array(CandidatoSchema).min(1);

export const SelecionadoSchema = CandidatoSchema.extend({
  asin: z.string().min(1),
  linkAfiliado: z.string().url(),
  angulo: z.string().min(1),
});
export type Selecionado = z.infer<typeof SelecionadoSchema>;
export const SelecionadosSchema = z.array(SelecionadoSchema).min(1);

export const FaqItemSchema = z.object({
  pergunta: z.string().min(1),
  resposta: z.string().min(1),
});

export const DossieContentSchema = z.object({
  specs: z.array(z.string()).min(1),
  pros: z.array(z.string()).min(1),
  contras: z.array(z.string()).min(1),
  faixaPreco: z.string().min(1),
  faqs: z.array(FaqItemSchema).min(1),
});
export type DossieContent = z.infer<typeof DossieContentSchema>;

export const DossieSchema = DossieContentSchema.extend({
  nome: z.string().min(1),
});
export type Dossie = z.infer<typeof DossieSchema>;
export const DossiesSchema = z.array(DossieSchema).min(1);

export const EscritaResponseSchema = z.object({
  title: z.string().min(10).max(70),
  excerpt: z.string().min(50).max(170),
  body: z.string().min(1),
});
export type EscritaResponse = z.infer<typeof EscritaResponseSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test content-hub/lib/schemas.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add content-hub/lib/schemas.ts content-hub/lib/schemas.test.ts
git commit -m "feat(content-hub): adiciona schemas Zod dos dados intermediarios"
```

---

## Task 3: `lib/paths.ts` — resolução de caminhos

**Files:**
- Create: `content-hub/lib/paths.ts`
- Test: `content-hub/lib/paths.test.ts`

**Interfaces:**
- Produces: `REPO_ROOT`, `pautaDir(slug)`, `pautaJsonPath(slug)`, `candidatosJsonPath(slug)`, `selecionadosJsonPath(slug)`, `dossiesJsonPath(slug)`, `blogMdxPath(categoria, slug)` — usados por todos os scripts.

- [ ] **Step 1: Write the failing test**

Create `content-hub/lib/paths.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { join, sep } from "node:path";
import {
  pautaDir,
  pautaJsonPath,
  candidatosJsonPath,
  selecionadosJsonPath,
  dossiesJsonPath,
  blogMdxPath,
} from "./paths.ts";

test("pautaDir aponta pra content/pautas/<slug>", () => {
  const dir = pautaDir("minha-pauta");
  assert.ok(dir.endsWith(join("content", "pautas", "minha-pauta")));
});

test("os *JsonPath ficam dentro de pautaDir", () => {
  const dir = pautaDir("minha-pauta");
  assert.equal(pautaJsonPath("minha-pauta"), join(dir, "pauta.json"));
  assert.equal(candidatosJsonPath("minha-pauta"), join(dir, "candidatos.json"));
  assert.equal(selecionadosJsonPath("minha-pauta"), join(dir, "selecionados.json"));
  assert.equal(dossiesJsonPath("minha-pauta"), join(dir, "dossies.json"));
});

test("blogMdxPath aponta pra src/content/blog/<categoria>/<slug>.mdx", () => {
  const path = blogMdxPath("caes", "minha-pauta");
  assert.ok(path.endsWith(["src", "content", "blog", "caes", "minha-pauta.mdx"].join(sep)));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test content-hub/lib/paths.test.ts`
Expected: FAIL — módulo `./paths.ts` não existe.

- [ ] **Step 3: Write the implementation**

Create `content-hub/lib/paths.ts`:
```ts
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));

// content-hub/lib -> content-hub -> raiz do repo
export const REPO_ROOT = join(HERE, "..", "..");

export function pautaDir(slug: string): string {
  return join(REPO_ROOT, "content", "pautas", slug);
}

export function pautaJsonPath(slug: string): string {
  return join(pautaDir(slug), "pauta.json");
}

export function candidatosJsonPath(slug: string): string {
  return join(pautaDir(slug), "candidatos.json");
}

export function selecionadosJsonPath(slug: string): string {
  return join(pautaDir(slug), "selecionados.json");
}

export function dossiesJsonPath(slug: string): string {
  return join(pautaDir(slug), "dossies.json");
}

export function blogMdxPath(categoria: string, slug: string): string {
  return join(REPO_ROOT, "src", "content", "blog", categoria, `${slug}.mdx`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test content-hub/lib/paths.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add content-hub/lib/paths.ts content-hub/lib/paths.test.ts
git commit -m "feat(content-hub): adiciona resolucao de caminhos das pautas"
```

---

## Task 4: `lib/cli.ts` — parsing de argumentos de linha de comando

**Files:**
- Create: `content-hub/lib/cli.ts`
- Test: `content-hub/lib/cli.test.ts`

**Interfaces:**
- Produces: `getArg(argv, name)`, `requireArg(argv, name)`, `hasFlag(argv, name)` — usados por todos os 5 scripts.

- [ ] **Step 1: Write the failing test**

Create `content-hub/lib/cli.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { getArg, requireArg, hasFlag } from "./cli.ts";

test("getArg lê --nome=valor", () => {
  assert.equal(getArg(["--pauta=minha-pauta"], "pauta"), "minha-pauta");
});

test("getArg retorna undefined se o argumento não existe", () => {
  assert.equal(getArg(["--outro=x"], "pauta"), undefined);
});

test("requireArg lança erro se o argumento obrigatório faltar", () => {
  assert.throws(() => requireArg([], "pauta"), /--pauta=/);
});

test("hasFlag detecta uma flag booleana", () => {
  assert.equal(hasFlag(["--force"], "force"), true);
  assert.equal(hasFlag([], "force"), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test content-hub/lib/cli.test.ts`
Expected: FAIL — módulo `./cli.ts` não existe.

- [ ] **Step 3: Write the implementation**

Create `content-hub/lib/cli.ts`:
```ts
export function getArg(argv: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = argv.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

export function requireArg(argv: string[], name: string): string {
  const value = getArg(argv, name);
  if (!value) {
    throw new Error(`faltou --${name}=<valor>`);
  }
  return value;
}

export function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(`--${name}`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test content-hub/lib/cli.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add content-hub/lib/cli.ts content-hub/lib/cli.test.ts
git commit -m "feat(content-hub): adiciona parsing de argumentos de CLI"
```

---

## Task 5: `lib/csv.ts` — parser do CSV mestre

**Files:**
- Create: `content-hub/lib/csv.ts`
- Test: `content-hub/lib/csv.test.ts`

**Interfaces:**
- Produces: `parseCsv(content): string[][]`, `parseCsvRecords(content): Record<string,string>[]` — usados por `scripts/pautas-sync.ts` (Task 11).

- [ ] **Step 1: Write the failing test**

Create `content-hub/lib/csv.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv, parseCsvRecords } from "./csv.ts";

test("parseCsv separa linhas e colunas simples", () => {
  const rows = parseCsv("a,b,c\n1,2,3\n");
  assert.deepEqual(rows, [
    ["a", "b", "c"],
    ["1", "2", "3"],
  ]);
});

test("parseCsv respeita campos entre aspas com vírgula", () => {
  const rows = parseCsv('slug,titulo\nx,"Título, com vírgula"\n');
  assert.deepEqual(rows, [
    ["slug", "titulo"],
    ["x", "Título, com vírgula"],
  ]);
});

test("parseCsvRecords usa a primeira linha como cabeçalho", () => {
  const records = parseCsvRecords(
    "slug,categoria,palavra_chave,tipo_produto,prioridade\nmeu-slug,caes,minha palavra,tipo,1\n",
  );
  assert.deepEqual(records, [
    {
      slug: "meu-slug",
      categoria: "caes",
      palavra_chave: "minha palavra",
      tipo_produto: "tipo",
      prioridade: "1",
    },
  ]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test content-hub/lib/csv.test.ts`
Expected: FAIL — módulo `./csv.ts` não existe.

- [ ] **Step 3: Write the implementation**

Create `content-hub/lib/csv.ts`:
```ts
export function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const text = content.replace(/\r\n/g, "\n");

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

export function parseCsvRecords(content: string): Record<string, string>[] {
  const rows = parseCsv(content);
  if (rows.length === 0) return [];
  const [header, ...rest] = rows;
  return rest.map((row) => {
    const record: Record<string, string> = {};
    header.forEach((key, idx) => {
      record[key.trim()] = (row[idx] ?? "").trim();
    });
    return record;
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test content-hub/lib/csv.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add content-hub/lib/csv.ts content-hub/lib/csv.test.ts
git commit -m "feat(content-hub): adiciona parser de CSV do arquivo mestre de pautas"
```

---

## Task 6: `lib/slug.ts` e `lib/images.ts` — slugify e URL de imagem no CDN

**Files:**
- Create: `content-hub/lib/slug.ts`
- Create: `content-hub/lib/images.ts`
- Test: `content-hub/lib/slug.test.ts`
- Test: `content-hub/lib/images.test.ts`

**Interfaces:**
- Produces: `slugify(str): string`, `cdnImageUrl(categoria, slug, produtoNome): string` — usados por `scripts/escrever.ts` (Task 14).

- [ ] **Step 1: Write the failing tests**

Create `content-hub/lib/slug.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify } from "./slug.ts";

test("slugify normaliza acentos, espaços e maiúsculas", () => {
  assert.equal(slugify("Ração Premium Filhote 15kg"), "racao-premium-filhote-15kg");
});

test("slugify remove hífens duplicados e nas pontas", () => {
  assert.equal(slugify("  --Ração!!  "), "racao");
});
```

Create `content-hub/lib/images.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { cdnImageUrl } from "./images.ts";

test("cdnImageUrl monta a URL a partir de categoria, slug e nome do produto", () => {
  const url = cdnImageUrl("caes", "melhor-racao-filhotes", "Ração Premium Filhote 15kg");
  assert.equal(
    url,
    "https://cdn.azpetshop.com.br/posts/caes/melhor-racao-filhotes/racao-premium-filhote-15kg.jpg",
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx tsx --test content-hub/lib/slug.test.ts content-hub/lib/images.test.ts`
Expected: FAIL — módulos `./slug.ts` e `./images.ts` não existem.

- [ ] **Step 3: Write the implementation**

Create `content-hub/lib/slug.ts`:
```ts
export function slugify(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
```

Create `content-hub/lib/images.ts`:
```ts
import { slugify } from "./slug.ts";

export function cdnImageUrl(categoria: string, slug: string, produtoNome: string): string {
  return `https://cdn.azpetshop.com.br/posts/${categoria}/${slug}/${slugify(produtoNome)}.jpg`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --test content-hub/lib/slug.test.ts content-hub/lib/images.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add content-hub/lib/slug.ts content-hub/lib/slug.test.ts content-hub/lib/images.ts content-hub/lib/images.test.ts
git commit -m "feat(content-hub): adiciona slugify e resolucao de URL de imagem no CDN"
```

---

## Task 7: `lib/store.ts` — leitura genérica de JSON validado

**Files:**
- Create: `content-hub/lib/store.ts`
- Test: `content-hub/lib/store.test.ts`

**Interfaces:**
- Consumes: qualquer schema com `.parse(value): T` (ex.: os de `lib/schemas.ts`, Task 2).
- Produces: `loadJson<T>(path, schema, hint): Promise<T>` — usado pelos 4 scripts que leem `pauta.json`/`selecionados.json`/`dossies.json`.

- [ ] **Step 1: Write the failing test**

Create `content-hub/lib/store.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { z } from "zod";
import { loadJson } from "./store.ts";

const Schema = z.object({ nome: z.string() });

test("loadJson lê e valida um arquivo existente", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "content-hub-store-test-"));
  try {
    const file = path.join(dir, "dado.json");
    await writeFile(file, JSON.stringify({ nome: "ok" }), "utf8");
    const dado = await loadJson(file, Schema, "dica qualquer");
    assert.equal(dado.nome, "ok");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("loadJson lança erro com a dica quando o arquivo não existe", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "content-hub-store-test-"));
  try {
    const file = path.join(dir, "nao-existe.json");
    await assert.rejects(
      () => loadJson(file, Schema, "rode o passo anterior primeiro"),
      /rode o passo anterior primeiro/,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("loadJson propaga erro de validação Zod quando o conteúdo é inválido", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "content-hub-store-test-"));
  try {
    const file = path.join(dir, "invalido.json");
    await writeFile(file, JSON.stringify({ outraCoisa: 1 }), "utf8");
    await assert.rejects(() => loadJson(file, Schema, "dica"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test content-hub/lib/store.test.ts`
Expected: FAIL — módulo `./store.ts` não existe.

- [ ] **Step 3: Write the implementation**

Create `content-hub/lib/store.ts`:
```ts
import { readFile } from "node:fs/promises";

export async function loadJson<T>(
  path: string,
  schema: { parse: (value: unknown) => T },
  hint: string,
): Promise<T> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    throw new Error(`Arquivo não encontrado: ${path}\n${hint}`);
  }
  return schema.parse(JSON.parse(raw));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test content-hub/lib/store.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add content-hub/lib/store.ts content-hub/lib/store.test.ts
git commit -m "feat(content-hub): adiciona leitura generica de JSON validado"
```

---

## Task 8: `lib/knowledge.ts` — carregamento dos arquivos de conhecimento

**Files:**
- Create: `content-hub/lib/knowledge.ts`
- Test: `content-hub/lib/knowledge.test.ts`

**Interfaces:**
- Produces: `loadKnowledge(knowledgeDir): Promise<string>` — usado por `scripts/escrever.ts` (Task 14) e `scripts/revisar.ts` (Task 15).

- [ ] **Step 1: Write the failing test**

Create `content-hub/lib/knowledge.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadKnowledge } from "./knowledge.ts";

test("loadKnowledge concatena os 3 arquivos de conhecimento", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "content-hub-knowledge-test-"));
  try {
    await writeFile(path.join(dir, "tom-de-voz.md"), "Tom direto.", "utf8");
    await writeFile(path.join(dir, "regras-eeat.md"), "Regra de EEAT.", "utf8");
    await writeFile(path.join(dir, "guia-links-internos.md"), "Guia de links.", "utf8");

    const texto = await loadKnowledge(dir);

    assert.match(texto, /tom-de-voz\.md/);
    assert.match(texto, /Tom direto\./);
    assert.match(texto, /regras-eeat\.md/);
    assert.match(texto, /Regra de EEAT\./);
    assert.match(texto, /guia-links-internos\.md/);
    assert.match(texto, /Guia de links\./);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test content-hub/lib/knowledge.test.ts`
Expected: FAIL — módulo `./knowledge.ts` não existe.

- [ ] **Step 3: Write the implementation**

Create `content-hub/lib/knowledge.ts`:
```ts
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const FILES = ["tom-de-voz.md", "regras-eeat.md", "guia-links-internos.md"];

export async function loadKnowledge(knowledgeDir: string): Promise<string> {
  const parts = await Promise.all(
    FILES.map(async (file) => {
      const text = await readFile(join(knowledgeDir, file), "utf8");
      return `## ${file}\n\n${text.trim()}`;
    }),
  );
  return parts.join("\n\n---\n\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test content-hub/lib/knowledge.test.ts`
Expected: PASS (1 teste).

- [ ] **Step 5: Commit**

```bash
git add content-hub/lib/knowledge.ts content-hub/lib/knowledge.test.ts
git commit -m "feat(content-hub): adiciona carregamento dos arquivos de knowledge"
```

---

## Task 9: `lib/frontmatter.ts` — construção do frontmatter real do Astro

**Files:**
- Create: `content-hub/lib/frontmatter.ts`
- Test: `content-hub/lib/frontmatter.test.ts`

**Interfaces:**
- Consumes: `Selecionado`, `Dossie` (Task 2).
- Produces: `buildProducts(produtos, dossies)`, `buildFrontmatter(input)`, `assembleMdx(frontmatter, body)` — usados por `scripts/escrever.ts` (Task 14).

- [ ] **Step 1: Write the failing test**

Create `content-hub/lib/frontmatter.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import matter from "gray-matter";
import { buildProducts, buildFrontmatter, assembleMdx } from "./frontmatter.ts";
import type { Selecionado, Dossie } from "./schemas.ts";

const selecionados: Selecionado[] = [
  {
    nome: "Ração X",
    marca: "Marca Y",
    diferencial: "Baixo custo por kg",
    asin: "B000123456",
    linkAfiliado: "https://amzn.to/exemplo",
    angulo: "Melhor custo-benefício",
  },
];

const dossies: Dossie[] = [
  {
    nome: "Ração X",
    specs: ["Pacote de 15kg"],
    pros: ["Boa palatabilidade"],
    contras: ["Embalagem frágil"],
    faixaPreco: "R$ 150 a R$ 190",
    faqs: [{ pergunta: "Serve pra filhote grande?", resposta: "Sim." }],
  },
];

test("buildProducts mapeia selecionados + dossies pro schema de produtos do Astro", () => {
  const produtos = buildProducts(selecionados, dossies);
  assert.deepEqual(produtos, [
    {
      name: "Ração X",
      affiliateUrl: "https://amzn.to/exemplo",
      pros: ["Boa palatabilidade"],
      cons: ["Embalagem frágil"],
      verdict: "Melhor custo-benefício",
    },
  ]);
});

test("buildFrontmatter monta os campos exatos do schema de content collections", () => {
  const publishedAt = new Date("2026-08-02T00:00:00.000Z");
  const fm = buildFrontmatter({
    title: "Os 5 Melhores X em 2026",
    excerpt: "Comparamos as melhores opções de X pra você escolher a ideal.",
    categoria: "caes",
    hero: "https://cdn.azpetshop.com.br/posts/caes/x/hero.jpg",
    publishedAt,
    produtos: selecionados,
    dossies,
  });

  assert.equal(fm.category, "caes");
  assert.equal(fm.type, "roundup");
  assert.equal(fm.draft, true);
  assert.equal(fm.author, "Equipe AZ Pet Shop");
  assert.equal(fm.publishedAt, publishedAt);
  assert.equal(fm.products.length, 1);
});

test("assembleMdx gera um MDX cujo frontmatter é lido de volta pelo gray-matter", () => {
  const fm = buildFrontmatter({
    title: "Os 5 Melhores X em 2026",
    excerpt: "Comparamos as melhores opções de X pra você escolher a ideal.",
    categoria: "caes",
    publishedAt: new Date("2026-08-02T00:00:00.000Z"),
    produtos: selecionados,
    dossies,
  });

  const mdx = assembleMdx(fm, "## Corpo\n\nTexto do artigo.");
  const parsed = matter(mdx);

  assert.equal(parsed.data.title, "Os 5 Melhores X em 2026");
  assert.match(parsed.content, /Texto do artigo\./);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test content-hub/lib/frontmatter.test.ts`
Expected: FAIL — módulo `./frontmatter.ts` não existe.

- [ ] **Step 3: Write the implementation**

Create `content-hub/lib/frontmatter.ts`:
```ts
import matter from "gray-matter";
import type { Selecionado, Dossie } from "./schemas.ts";

export interface BlogProduct {
  name: string;
  affiliateUrl: string;
  pros: string[];
  cons: string[];
  verdict?: string;
}

export function buildProducts(produtos: Selecionado[], dossies: Dossie[]): BlogProduct[] {
  return produtos.map((p) => {
    const dossie = dossies.find((d) => d.nome === p.nome);
    return {
      name: p.nome,
      affiliateUrl: p.linkAfiliado,
      pros: dossie?.pros ?? [],
      cons: dossie?.contras ?? [],
      verdict: p.angulo,
    };
  });
}

export interface FrontmatterInput {
  title: string;
  excerpt: string;
  categoria: string;
  hero?: string;
  publishedAt: Date;
  produtos: Selecionado[];
  dossies: Dossie[];
}

export function buildFrontmatter(input: FrontmatterInput): Record<string, unknown> {
  return {
    title: input.title,
    excerpt: input.excerpt,
    category: input.categoria,
    type: "roundup",
    hero: input.hero,
    publishedAt: input.publishedAt,
    author: "Equipe AZ Pet Shop",
    draft: true,
    products: buildProducts(input.produtos, input.dossies),
  };
}

export function assembleMdx(frontmatter: Record<string, unknown>, body: string): string {
  return matter.stringify(body.trim() + "\n", frontmatter);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test content-hub/lib/frontmatter.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add content-hub/lib/frontmatter.ts content-hub/lib/frontmatter.test.ts
git commit -m "feat(content-hub): adiciona construcao do frontmatter real do Astro"
```

---

## Task 10: `lib/gemini.ts` — cliente Gemini com grounding e parsing de JSON

**Files:**
- Create: `content-hub/lib/gemini.ts`
- Test: `content-hub/lib/gemini.test.ts`

**Interfaces:**
- Produces: `GeminiClient` (interface com `generateGrounded(prompt): Promise<string>`), `createGeminiClient(apiKey?)`, `extractJson<T>(text, parse)`, `generateJson<T>(client, prompt, parse)` — usados pelos 4 scripts (Tasks 12-15).

- [ ] **Step 1: Write the failing test**

Create `content-hub/lib/gemini.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { extractJson, generateJson, type GeminiClient } from "./gemini.ts";

const Schema = z.object({ nome: z.string() });

test("extractJson extrai um objeto JSON de um texto com markdown ao redor", () => {
  const texto = 'Aqui está:\n```json\n{"nome": "ok"}\n```\n';
  const resultado = extractJson(texto, (v) => Schema.parse(v));
  assert.equal(resultado.nome, "ok");
});

test("extractJson extrai um array JSON de um texto puro", () => {
  const resultado = extractJson('[{"nome": "a"}, {"nome": "b"}]', (v) => z.array(Schema).parse(v));
  assert.equal(resultado.length, 2);
});

test("generateJson retorna o valor validado na primeira tentativa", async () => {
  let chamadas = 0;
  const client: GeminiClient = {
    async generateGrounded() {
      chamadas++;
      return '{"nome": "ok"}';
    },
  };
  const resultado = await generateJson(client, "prompt qualquer", (v) => Schema.parse(v));
  assert.equal(resultado.nome, "ok");
  assert.equal(chamadas, 1);
});

test("generateJson tenta de novo com instrução extra se a 1a resposta não for JSON válido", async () => {
  let chamadas = 0;
  const client: GeminiClient = {
    async generateGrounded(prompt: string) {
      chamadas++;
      if (chamadas === 1) return "não é json";
      assert.match(prompt, /responda APENAS com JSON válido/);
      return '{"nome": "ok"}';
    },
  };
  const resultado = await generateJson(client, "prompt qualquer", (v) => Schema.parse(v));
  assert.equal(resultado.nome, "ok");
  assert.equal(chamadas, 2);
});

test("generateJson lança erro se nem o retry vier em JSON válido", async () => {
  const client: GeminiClient = {
    async generateGrounded() {
      return "ainda não é json";
    },
  };
  await assert.rejects(() => generateJson(client, "prompt qualquer", (v) => Schema.parse(v)));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test content-hub/lib/gemini.test.ts`
Expected: FAIL — módulo `./gemini.ts` não existe.

- [ ] **Step 3: Write the implementation**

Create `content-hub/lib/gemini.ts`:
```ts
import { GoogleGenAI } from "@google/genai";

export interface GeminiClient {
  generateGrounded(prompt: string): Promise<string>;
}

export function createGeminiClient(apiKey: string | undefined = process.env.GEMINI_API_KEY): GeminiClient {
  if (!apiKey) {
    throw new Error("faltou a variável de ambiente GEMINI_API_KEY");
  }
  const ai = new GoogleGenAI({ apiKey });

  return {
    async generateGrounded(prompt: string): Promise<string> {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] },
      });
      const text = response.text;
      if (!text) {
        throw new Error("Gemini não retornou texto na resposta");
      }
      return text;
    },
  };
}

export function extractJson<T>(text: string, parse: (value: unknown) => T): T {
  const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  const jsonText = match ? match[0] : text;
  const value = JSON.parse(jsonText);
  return parse(value);
}

export async function generateJson<T>(
  client: GeminiClient,
  prompt: string,
  parse: (value: unknown) => T,
): Promise<T> {
  const primeiraResposta = await client.generateGrounded(prompt);
  try {
    return extractJson(primeiraResposta, parse);
  } catch (primeiroErro) {
    const retryPrompt = `${prompt}\n\nIMPORTANTE: responda APENAS com JSON válido, sem markdown, sem texto antes ou depois.`;
    const segundaResposta = await client.generateGrounded(retryPrompt);
    try {
      return extractJson(segundaResposta, parse);
    } catch {
      throw new Error(
        `Gemini não retornou JSON válido mesmo após retry. Erro original: ${String(primeiroErro)}`,
      );
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test content-hub/lib/gemini.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add content-hub/lib/gemini.ts content-hub/lib/gemini.test.ts
git commit -m "feat(content-hub): adiciona cliente Gemini com grounding e parsing de JSON"
```

---

## Task 11: `lib/prompts.ts` — templates dos 4 prompts

**Files:**
- Create: `content-hub/lib/prompts.ts`
- Test: `content-hub/lib/prompts.test.ts`

**Interfaces:**
- Consumes: `Pauta`, `Selecionado`, `Dossie` (Task 2).
- Produces: `buildCandidatosPrompt(pauta)`, `buildDossiePrompt(pauta, selecionado)`, `buildEscreverPrompt(input)`, `buildRevisaoPrompt(input)` — usados pelos scripts (Tasks 12-15).

- [ ] **Step 1: Write the failing test**

Create `content-hub/lib/prompts.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildCandidatosPrompt,
  buildDossiePrompt,
  buildEscreverPrompt,
  buildRevisaoPrompt,
} from "./prompts.ts";
import type { Pauta, Selecionado, Dossie } from "./schemas.ts";

const pauta: Pauta = {
  slug: "melhor-racao-filhotes",
  categoria: "caes",
  palavraChave: "melhor ração para filhotes",
  tipoProduto: "ração seca filhote",
  prioridade: 1,
};

const selecionado: Selecionado = {
  nome: "Ração X",
  marca: "Marca Y",
  diferencial: "Baixo custo por kg",
  asin: "B000123456",
  linkAfiliado: "https://amzn.to/exemplo",
  angulo: "Melhor custo-benefício",
};

const dossie: Dossie = {
  nome: "Ração X",
  specs: ["Pacote de 15kg"],
  pros: ["Boa palatabilidade"],
  contras: ["Embalagem frágil"],
  faixaPreco: "R$ 150 a R$ 190",
  faqs: [{ pergunta: "Serve pra filhote grande?", resposta: "Sim." }],
};

test("buildCandidatosPrompt inclui categoria, tipo de produto e palavra-chave", () => {
  const prompt = buildCandidatosPrompt(pauta);
  assert.match(prompt, /caes/);
  assert.match(prompt, /ração seca filhote/);
  assert.match(prompt, /melhor ração para filhotes/);
});

test("buildDossiePrompt inclui nome do produto e ângulo editorial", () => {
  const prompt = buildDossiePrompt(pauta, selecionado);
  assert.match(prompt, /Ração X/);
  assert.match(prompt, /Melhor custo-benefício/);
});

test("buildEscreverPrompt inclui os links afiliados e URLs de imagem exatos", () => {
  const prompt = buildEscreverPrompt({
    pauta,
    selecionados: [selecionado],
    dossies: [dossie],
    knowledge: "diretrizes de teste",
    imagens: [{ nome: "Ração X", url: "https://cdn.azpetshop.com.br/posts/caes/x/racao-x.jpg" }],
  });
  assert.match(prompt, /https:\/\/amzn\.to\/exemplo/);
  assert.match(prompt, /https:\/\/cdn\.azpetshop\.com\.br\/posts\/caes\/x\/racao-x\.jpg/);
  assert.match(prompt, /diretrizes de teste/);
  assert.match(prompt, /<Faq/);
});

test("buildRevisaoPrompt inclui title, excerpt e knowledge", () => {
  const prompt = buildRevisaoPrompt({
    title: "Título de teste",
    excerpt: "Excerpt de teste",
    body: "corpo de teste",
    knowledge: "diretrizes de teste",
  });
  assert.match(prompt, /Título de teste/);
  assert.match(prompt, /Excerpt de teste/);
  assert.match(prompt, /diretrizes de teste/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test content-hub/lib/prompts.test.ts`
Expected: FAIL — módulo `./prompts.ts` não existe.

- [ ] **Step 3: Write the implementation**

Create `content-hub/lib/prompts.ts`:
```ts
import type { Pauta, Selecionado, Dossie } from "./schemas.ts";

export function buildCandidatosPrompt(pauta: Pauta): string {
  return `Você é um pesquisador de e-commerce especializado em produtos pet, escrevendo para o site AZ Pet Shop (azpetshop.com.br).

Categoria: ${pauta.categoria}
Tipo de produto: ${pauta.tipoProduto}
Palavra-chave alvo: "${pauta.palavraChave}"

Pesquise na web e liste de 5 a 8 produtos candidatos REAIS, vendidos atualmente no Brasil (preferencialmente na Amazon.com.br), adequados a essa palavra-chave.

Responda APENAS com um array JSON, sem markdown, no formato exato:
[
  { "nome": "nome completo do produto", "marca": "marca", "diferencial": "1 frase sobre o que diferencia esse produto dos concorrentes" }
]`;
}

export function buildDossiePrompt(pauta: Pauta, selecionado: Selecionado): string {
  return `Você é um pesquisador de produtos pet para o site AZ Pet Shop (azpetshop.com.br).

Produto: ${selecionado.nome} (marca: ${selecionado.marca})
Categoria: ${pauta.categoria}
Ângulo editorial definido: ${selecionado.angulo}

Pesquise na web informações atuais sobre esse produto e monte um dossiê.

Responda APENAS com um objeto JSON, sem markdown, no formato exato:
{
  "specs": ["especificação 1", "especificação 2"],
  "pros": ["ponto forte 1", "ponto forte 2"],
  "contras": ["ponto fraco 1"],
  "faixaPreco": "ex.: R$ 50 a R$ 80",
  "faqs": [{ "pergunta": "...", "resposta": "..." }]
}`;
}

export function buildEscreverPrompt(input: {
  pauta: Pauta;
  selecionados: Selecionado[];
  dossies: Dossie[];
  knowledge: string;
  imagens: { nome: string; url: string }[];
}): string {
  const { pauta, selecionados, dossies, knowledge, imagens } = input;

  const produtosTexto = selecionados
    .map((s, i) => {
      const d = dossies.find((x) => x.nome === s.nome);
      const img = imagens.find((x) => x.nome === s.nome)?.url ?? "";
      return `### Produto ${i + 1}: ${s.nome}
Marca: ${s.marca}
Diferencial: ${s.diferencial}
Ângulo editorial: ${s.angulo}
Link afiliado: ${s.linkAfiliado}
URL da imagem (use exatamente essa, não invente outra): ${img}
Specs: ${d?.specs.join("; ") ?? ""}
Prós: ${d?.pros.join("; ") ?? ""}
Contras: ${d?.contras.join("; ") ?? ""}
Faixa de preço: ${d?.faixaPreco ?? ""}
FAQs sugeridas: ${d?.faqs.map((f) => `${f.pergunta} -> ${f.resposta}`).join(" | ") ?? ""}`;
    })
    .join("\n\n");

  return `Você é um redator especializado em conteúdo afiliado para o site AZ Pet Shop (azpetshop.com.br), categoria "${pauta.categoria}", palavra-chave alvo "${pauta.palavraChave}".

Siga estas diretrizes de tom de voz e EEAT:
${knowledge}

Estrutura obrigatória do artigo (baseada no formato já usado no site):
1. Um resumo top-3 usando o componente <QuickSummary items={[{label, name, anchor}, ...]} /> logo no início.
2. Uma introdução curta (2 parágrafos) sobre a categoria de produto.
3. Uma review individual por produto, usando <ProductHighlight id="..." badge="..." name="..." image="..." href="..." stars={1-5} score="X/10">texto da review</ProductHighlight> para o produto de destaque, e um formato H3 + parágrafo para os demais.
4. Uma seção "## Como escolher o melhor ${pauta.tipoProduto}" com critérios práticos.
5. Uma seção de perguntas frequentes usando <Faq items={[{question, answer}, ...]} />, com pelo menos 4 perguntas.

Produtos e dados de pesquisa disponíveis (use EXATAMENTE os links afiliados e URLs de imagem fornecidos, não invente novos):
${produtosTexto}

Responda APENAS com um objeto JSON, sem markdown, no formato exato:
{
  "title": "título do artigo, 50-70 caracteres, com o ano quando fizer sentido",
  "excerpt": "meta description, 120-170 caracteres, que gere cliques nos resultados de busca",
  "body": "o corpo completo do artigo em MDX, como uma única string, seguindo a estrutura acima"
}`;
}

export function buildRevisaoPrompt(input: {
  title: string;
  excerpt: string;
  body: string;
  knowledge: string;
}): string {
  return `Você é um editor sênior de conteúdo revisando um artigo do site AZ Pet Shop antes da publicação.

Diretrizes de tom de voz e EEAT que o artigo deve seguir:
${input.knowledge}

Título: ${input.title}
Meta description: ${input.excerpt}

Corpo do artigo:
${input.body}

Escreva uma crítica editorial curta (no máximo 6 bullet points) apontando problemas concretos de clareza, tom de voz, EEAT (autoridade/confiança) ou oportunidades de melhoria. Não repita o checklist técnico (tamanho de título, headings, links) — isso já é verificado separadamente. Responda em texto simples, sem markdown.`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test content-hub/lib/prompts.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add content-hub/lib/prompts.ts content-hub/lib/prompts.test.ts
git commit -m "feat(content-hub): adiciona templates de prompt do Gemini"
```

---

## Task 12: `lib/checklist.ts` — checklist técnico determinístico

**Files:**
- Create: `content-hub/lib/checklist.ts`
- Test: `content-hub/lib/checklist.test.ts`

**Interfaces:**
- Produces: `ChecklistItem`, `checkTitleLength`, `checkExcerptLength`, `checkFaqPresence`, `checkHeadingHierarchy`, `countInternalLinks`, `runChecklist(title, excerpt, body)` — usados por `scripts/revisar.ts` (Task 15).

- [ ] **Step 1: Write the failing test**

Create `content-hub/lib/checklist.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkTitleLength,
  checkExcerptLength,
  checkFaqPresence,
  checkHeadingHierarchy,
  countInternalLinks,
  runChecklist,
} from "./checklist.ts";

test("checkTitleLength reprova title curto demais", () => {
  assert.equal(checkTitleLength("Curto").ok, false);
});

test("checkTitleLength aprova title dentro do range", () => {
  assert.equal(checkTitleLength("Os 5 Melhores Tapetes Higiênicos para Cães em 2026").ok, true);
});

test("checkExcerptLength reprova excerpt curto demais", () => {
  assert.equal(checkExcerptLength("Muito curto.").ok, false);
});

test("checkFaqPresence detecta o componente <Faq>", () => {
  assert.equal(checkFaqPresence("texto sem faq").ok, false);
  assert.equal(checkFaqPresence('texto com <Faq items={[]} />').ok, true);
});

test("checkHeadingHierarchy reprova H3 antes de qualquer H2", () => {
  assert.equal(checkHeadingHierarchy("### Sub\n\nTexto\n\n## Principal").ok, false);
  assert.equal(checkHeadingHierarchy("## Principal\n\n### Sub").ok, true);
});

test("countInternalLinks conta links pra /blog/", () => {
  const body = "Veja [este post](/blog/caes/rottweiler/) e [este outro](/blog/gatos/persa/).";
  assert.equal(countInternalLinks(body).ok, false);
  assert.match(countInternalLinks(body).detail, /2 link/);
});

test("runChecklist retorna os 5 itens", () => {
  const items = runChecklist("Título de teste", "Excerpt de teste", "corpo de teste");
  assert.equal(items.length, 5);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test content-hub/lib/checklist.test.ts`
Expected: FAIL — módulo `./checklist.ts` não existe.

- [ ] **Step 3: Write the implementation**

Create `content-hub/lib/checklist.ts`:
```ts
export interface ChecklistItem {
  label: string;
  ok: boolean;
  detail: string;
}

export function checkTitleLength(title: string): ChecklistItem {
  const len = title.length;
  const ok = len >= 40 && len <= 70;
  return { label: "Tamanho do title", ok, detail: `${len} caracteres (ideal: 40-70)` };
}

export function checkExcerptLength(excerpt: string): ChecklistItem {
  const len = excerpt.length;
  const ok = len >= 110 && len <= 170;
  return { label: "Tamanho do excerpt (meta description)", ok, detail: `${len} caracteres (ideal: 110-170)` };
}

export function checkFaqPresence(body: string): ChecklistItem {
  const ok = body.includes("<Faq");
  return {
    label: "Presença de FAQ com schema",
    ok,
    detail: ok ? "componente <Faq> encontrado" : "componente <Faq> não encontrado",
  };
}

export function checkHeadingHierarchy(body: string): ChecklistItem {
  const lines = body.split("\n");
  let sawH2 = false;
  let broken = false;
  for (const line of lines) {
    if (/^##\s/.test(line)) sawH2 = true;
    else if (/^###\s/.test(line) && !sawH2) broken = true;
  }
  return {
    label: "Hierarquia de headings",
    ok: !broken,
    detail: broken ? "encontrado H3 antes de qualquer H2" : "hierarquia OK",
  };
}

export function countInternalLinks(body: string): ChecklistItem {
  const matches = body.match(/\]\(\/blog\//g) ?? [];
  const ok = matches.length >= 2;
  return {
    label: "Links internos",
    ok,
    detail: `${matches.length} link(s) para /blog/ encontrados (ideal: 2+)`,
  };
}

export function runChecklist(title: string, excerpt: string, body: string): ChecklistItem[] {
  return [
    checkTitleLength(title),
    checkExcerptLength(excerpt),
    checkFaqPresence(body),
    checkHeadingHierarchy(body),
    countInternalLinks(body),
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test content-hub/lib/checklist.test.ts`
Expected: PASS (7 testes).

- [ ] **Step 5: Commit**

```bash
git add content-hub/lib/checklist.ts content-hub/lib/checklist.test.ts
git commit -m "feat(content-hub): adiciona checklist tecnico deterministico de revisao"
```

---

## Task 13: Componente `Faq.astro` com JSON-LD

**Files:**
- Create: `src/components/Faq.astro`
- Modify: `src/pages/blog/[category]/[slug].astro`

**Interfaces:**
- Consumes: nenhuma dependência de `content-hub/` — é um componente Astro consumido pelos artigos MDX gerados por `content:escrever` (Task 14).
- Produces: `<Faq items={{question, answer}[]} />`, registrado no mapa de `components` passado pro `<Content />` da página de post.

- [ ] **Step 1: Criar o componente**

Create `src/components/Faq.astro`:
```astro
---
interface FaqItem {
  question: string;
  answer: string;
}
interface Props {
  items: FaqItem[];
}
const { items } = Astro.props;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: items.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};
---

<div class="not-prose my-8 rounded-2xl border-2 border-cyan bg-mist p-6 md:p-8">
  <h2 class="text-xl font-extrabold text-navy md:text-2xl">Perguntas Frequentes</h2>
  <div class="mt-4 space-y-3">
    {
      items.map((item) => (
        <details class="rounded-xl border border-line bg-paper p-4">
          <summary class="cursor-pointer font-bold text-navy">{item.question}</summary>
          <p class="mt-2 text-sm leading-relaxed text-ink/80">{item.answer}</p>
        </details>
      ))
    }
  </div>
</div>

<script type="application/ld+json" set:html={JSON.stringify(jsonLd)} />
```

- [ ] **Step 2: Registrar o componente na página de post**

Read `src/pages/blog/[category]/[slug].astro` (já lido anteriormente — imports nas linhas 4-7 e uso em `<Content components={{...}} />` na linha 60).

Edit `src/pages/blog/[category]/[slug].astro`:
```astro
import QuickSummary from "../../../components/QuickSummary.astro";
import ProductHighlight from "../../../components/ProductHighlight.astro";
```
Substituir por:
```astro
import QuickSummary from "../../../components/QuickSummary.astro";
import ProductHighlight from "../../../components/ProductHighlight.astro";
import Faq from "../../../components/Faq.astro";
```

E:
```astro
<Content components={{ QuickSummary, ProductHighlight }} />
```
Substituir por:
```astro
<Content components={{ QuickSummary, ProductHighlight, Faq }} />
```

- [ ] **Step 3: Verificar que o build do Astro continua passando**

Run: `npm run build`
Expected: build conclui sem erros (o componente novo não quebra nenhum post existente, já que nenhum post atual usa `<Faq>`).

- [ ] **Step 4: Commit**

```bash
git add src/components/Faq.astro "src/pages/blog/[category]/[slug].astro"
git commit -m "feat(blog): adiciona componente Faq com JSON-LD FAQPage"
```

---

## Task 14: `scripts/pautas-sync.ts`

**Files:**
- Create: `content-hub/scripts/pautas-sync.ts`
- Test: `content-hub/scripts/pautas-sync.test.ts`

**Interfaces:**
- Consumes: `parseCsvRecords` (Task 5), `PautaSchema`/`Pauta` (Task 2), `pautaJsonPath`/`REPO_ROOT` (Task 3).
- Produces: `csvRecordToPauta(record): Pauta` (exportada, testável) e o script `main()` que lê `content-hub/pautas-master.csv` e escreve um `pauta.json` por linha.

- [ ] **Step 1: Write the failing test**

Create `content-hub/scripts/pautas-sync.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { csvRecordToPauta } from "./pautas-sync.ts";

test("csvRecordToPauta converte um registro de CSV pra Pauta validada", () => {
  const pauta = csvRecordToPauta({
    slug: "melhor-racao-filhotes",
    categoria: "caes",
    palavra_chave: "melhor ração para filhotes",
    tipo_produto: "ração seca filhote",
    prioridade: "1",
  });
  assert.deepEqual(pauta, {
    slug: "melhor-racao-filhotes",
    categoria: "caes",
    palavraChave: "melhor ração para filhotes",
    tipoProduto: "ração seca filhote",
    prioridade: 1,
  });
});

test("csvRecordToPauta lança erro se faltar uma coluna obrigatória", () => {
  assert.throws(() =>
    csvRecordToPauta({ slug: "x", categoria: "", palavra_chave: "y", tipo_produto: "z", prioridade: "1" }),
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test content-hub/scripts/pautas-sync.test.ts`
Expected: FAIL — módulo `./pautas-sync.ts` não existe.

- [ ] **Step 3: Write the implementation**

Create `content-hub/scripts/pautas-sync.ts`:
```ts
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { parseCsvRecords } from "../lib/csv.ts";
import { PautaSchema, type Pauta } from "../lib/schemas.ts";
import { pautaJsonPath, REPO_ROOT } from "../lib/paths.ts";

export function csvRecordToPauta(record: Record<string, string>): Pauta {
  return PautaSchema.parse({
    slug: record.slug,
    categoria: record.categoria,
    palavraChave: record.palavra_chave,
    tipoProduto: record.tipo_produto,
    prioridade: Number(record.prioridade),
  });
}

async function main() {
  const csvPath = join(REPO_ROOT, "content-hub", "pautas-master.csv");
  const raw = await readFile(csvPath, "utf8");
  const pautas = parseCsvRecords(raw).map(csvRecordToPauta);

  for (const pauta of pautas) {
    const outPath = pautaJsonPath(pauta.slug);
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, JSON.stringify(pauta, null, 2) + "\n", "utf8");
  }

  console.log(`✅ ${pautas.length} pauta(s) sincronizada(s) a partir de ${csvPath}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test content-hub/scripts/pautas-sync.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 5: Testar a execução real do script**

Run: `npm run content:pautas:sync` (adicionar o script no `package.json` — ver Task 18) ou diretamente:
```
npx tsx content-hub/scripts/pautas-sync.ts
```
Expected: imprime `✅ 1 pauta(s) sincronizada(s) ...` e cria `content/pautas/melhor-racao-filhotes/pauta.json` com o conteúdo esperado.

- [ ] **Step 6: Commit**

```bash
git add content-hub/scripts/pautas-sync.ts content-hub/scripts/pautas-sync.test.ts content/pautas
git commit -m "feat(content-hub): adiciona script content:pautas:sync"
```

---

## Task 15: `scripts/candidatos.ts`

**Files:**
- Create: `content-hub/scripts/candidatos.ts`

**Interfaces:**
- Consumes: `requireArg` (Task 4), `loadJson` (Task 7), `PautaSchema`/`CandidatosSchema` (Task 2), `pautaJsonPath`/`candidatosJsonPath` (Task 3), `createGeminiClient`/`generateJson` (Task 10), `buildCandidatosPrompt` (Task 11).
- Produces: script `content:candidatos --pauta={slug}` que grava `candidatos.json`.

Este script depende de uma API key real (`GEMINI_API_KEY`) e chamada de rede — não há teste automatizado do `main()` (consistente com a decisão da spec de não testar chamadas reais ao Gemini). Toda a lógica pura que ele orquestra (`buildCandidatosPrompt`, `CandidatosSchema`, `generateJson`) já está coberta pelas Tasks 2, 10 e 11.

- [ ] **Step 1: Write the implementation**

Create `content-hub/scripts/candidatos.ts`:
```ts
import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { requireArg } from "../lib/cli.ts";
import { loadJson } from "../lib/store.ts";
import { PautaSchema, CandidatosSchema } from "../lib/schemas.ts";
import { pautaJsonPath, candidatosJsonPath } from "../lib/paths.ts";
import { createGeminiClient, generateJson } from "../lib/gemini.ts";
import { buildCandidatosPrompt } from "../lib/prompts.ts";

async function main() {
  const slug = requireArg(process.argv.slice(2), "pauta");
  const pauta = await loadJson(pautaJsonPath(slug), PautaSchema, "Rode: npm run content:pautas:sync");

  const client = createGeminiClient();
  const candidatos = await generateJson(client, buildCandidatosPrompt(pauta), (v) =>
    CandidatosSchema.parse(v),
  );

  const outPath = candidatosJsonPath(slug);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(candidatos, null, 2) + "\n", "utf8");
  console.log(`✅ ${candidatos.length} candidatos salvos em ${outPath}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
```

- [ ] **Step 2: Verificar que o script falha corretamente sem uma pauta prévia**

Run:
```
npx tsx content-hub/scripts/candidatos.ts --pauta=pauta-inexistente
```
Expected: falha com a mensagem `Arquivo não encontrado: .../content/pautas/pauta-inexistente/pauta.json` e a dica `Rode: npm run content:pautas:sync` (sem chegar a chamar o Gemini).

- [ ] **Step 3: Commit**

```bash
git add content-hub/scripts/candidatos.ts
git commit -m "feat(content-hub): adiciona script content:candidatos"
```

---

## Task 16: `scripts/pesquisa.ts`

**Files:**
- Create: `content-hub/scripts/pesquisa.ts`

**Interfaces:**
- Consumes: `requireArg` (Task 4), `loadJson` (Task 7), `PautaSchema`/`SelecionadosSchema`/`DossieContentSchema`/`Dossie` (Task 2), `pautaJsonPath`/`selecionadosJsonPath`/`dossiesJsonPath` (Task 3), `createGeminiClient`/`generateJson` (Task 10), `buildDossiePrompt` (Task 11).
- Produces: script `content:pesquisa --pauta={slug}` que grava `dossies.json`.

- [ ] **Step 1: Write the implementation**

Create `content-hub/scripts/pesquisa.ts`:
```ts
import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { requireArg } from "../lib/cli.ts";
import { loadJson } from "../lib/store.ts";
import { PautaSchema, SelecionadosSchema, DossieContentSchema, type Dossie } from "../lib/schemas.ts";
import { pautaJsonPath, selecionadosJsonPath, dossiesJsonPath } from "../lib/paths.ts";
import { createGeminiClient, generateJson } from "../lib/gemini.ts";
import { buildDossiePrompt } from "../lib/prompts.ts";

async function main() {
  const slug = requireArg(process.argv.slice(2), "pauta");
  const pauta = await loadJson(pautaJsonPath(slug), PautaSchema, "Rode: npm run content:pautas:sync");
  const selecionados = await loadJson(
    selecionadosJsonPath(slug),
    SelecionadosSchema,
    "Edite content/pautas/<slug>/selecionados.json primeiro (copie de candidatos.json e adicione asin/linkAfiliado/angulo).",
  );

  const client = createGeminiClient();
  const dossies: Dossie[] = [];
  for (const selecionado of selecionados) {
    const conteudo = await generateJson(client, buildDossiePrompt(pauta, selecionado), (v) =>
      DossieContentSchema.parse(v),
    );
    dossies.push({ nome: selecionado.nome, ...conteudo });
  }

  const outPath = dossiesJsonPath(slug);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(dossies, null, 2) + "\n", "utf8");
  console.log(`✅ ${dossies.length} dossiê(s) salvos em ${outPath}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
```

- [ ] **Step 2: Verificar que o script falha corretamente sem selecionados.json**

Run:
```
npx tsx content-hub/scripts/pesquisa.ts --pauta=melhor-racao-filhotes
```
Expected: falha com `Arquivo não encontrado: .../content/pautas/melhor-racao-filhotes/selecionados.json` e a dica pra editar o arquivo manualmente (assumindo que `selecionados.json` ainda não foi criado nesse ponto do plano).

- [ ] **Step 3: Commit**

```bash
git add content-hub/scripts/pesquisa.ts
git commit -m "feat(content-hub): adiciona script content:pesquisa"
```

---

## Task 17: `scripts/escrever.ts`

**Files:**
- Create: `content-hub/scripts/escrever.ts`

**Interfaces:**
- Consumes: `requireArg`/`hasFlag` (Task 4), `loadJson` (Task 7), `PautaSchema`/`SelecionadosSchema`/`DossiesSchema`/`EscritaResponseSchema` (Task 2), `pautaJsonPath`/`selecionadosJsonPath`/`dossiesJsonPath`/`blogMdxPath`/`REPO_ROOT` (Task 3), `loadKnowledge` (Task 8), `cdnImageUrl` (Task 6), `buildEscreverPrompt` (Task 11), `createGeminiClient`/`generateJson` (Task 10), `buildFrontmatter`/`assembleMdx` (Task 9).
- Produces: script `content:escrever --pauta={slug} [--force]` que grava `src/content/blog/{categoria}/{slug}.mdx`.

- [ ] **Step 1: Write the implementation**

Create `content-hub/scripts/escrever.ts`:
```ts
import { mkdir, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { requireArg, hasFlag } from "../lib/cli.ts";
import { loadJson } from "../lib/store.ts";
import { PautaSchema, SelecionadosSchema, DossiesSchema, EscritaResponseSchema } from "../lib/schemas.ts";
import { pautaJsonPath, selecionadosJsonPath, dossiesJsonPath, blogMdxPath, REPO_ROOT } from "../lib/paths.ts";
import { loadKnowledge } from "../lib/knowledge.ts";
import { cdnImageUrl } from "../lib/images.ts";
import { buildEscreverPrompt } from "../lib/prompts.ts";
import { createGeminiClient, generateJson } from "../lib/gemini.ts";
import { buildFrontmatter, assembleMdx } from "../lib/frontmatter.ts";

async function fileExists(path: string): Promise<boolean> {
  return access(path).then(() => true).catch(() => false);
}

async function main() {
  const argv = process.argv.slice(2);
  const slug = requireArg(argv, "pauta");
  const force = hasFlag(argv, "force");

  const pauta = await loadJson(pautaJsonPath(slug), PautaSchema, "Rode: npm run content:pautas:sync");
  const selecionados = await loadJson(
    selecionadosJsonPath(slug),
    SelecionadosSchema,
    "Edite content/pautas/<slug>/selecionados.json primeiro (copie de candidatos.json e adicione asin/linkAfiliado/angulo).",
  );
  const dossies = await loadJson(
    dossiesJsonPath(slug),
    DossiesSchema,
    `Rode: npm run content:pesquisa -- --pauta=${slug}`,
  );

  const targetPath = blogMdxPath(pauta.categoria, slug);
  if (!force && (await fileExists(targetPath))) {
    throw new Error(`Post já existe em ${targetPath}. Use --force pra sobrescrever.`);
  }

  const imagens = selecionados.map((s) => ({ nome: s.nome, url: cdnImageUrl(pauta.categoria, slug, s.nome) }));
  const knowledge = await loadKnowledge(join(REPO_ROOT, "content-hub", "knowledge"));
  const prompt = buildEscreverPrompt({ pauta, selecionados, dossies, knowledge, imagens });

  const client = createGeminiClient();
  const resultado = await generateJson(client, prompt, (v) => EscritaResponseSchema.parse(v));

  const frontmatter = buildFrontmatter({
    title: resultado.title,
    excerpt: resultado.excerpt,
    categoria: pauta.categoria,
    hero: imagens[0]?.url,
    publishedAt: new Date(),
    produtos: selecionados,
    dossies,
  });
  const mdx = assembleMdx(frontmatter, resultado.body);

  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, mdx, "utf8");

  console.log(`✅ Artigo gerado em ${targetPath} (draft: true — revise antes de publicar)`);
  console.log(`\nLembrete: faça upload das imagens reais dos produtos com:`);
  for (const img of imagens) {
    const fileName = img.url.split("/").pop();
    console.log(
      `  npm run upload-image -- --post ${pauta.categoria}/${slug} --file <arquivo-local> --alt "${img.nome}" --name "${fileName}"`,
    );
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
```

- [ ] **Step 2: Verificar que o script recusa sobrescrever sem --force**

Run (assumindo que já existe `src/content/blog/caes/qual-o-melhor-tapete-higienico-para-caes.mdx` e criando pautas/selecionados/dossies de teste com esse slug, ou simplesmente apontando pra um slug já publicado):
```
npx tsx content-hub/scripts/escrever.ts --pauta=qual-o-melhor-tapete-higienico-para-caes
```
Expected: falha com `Post já existe em .../qual-o-melhor-tapete-higienico-para-caes.mdx. Use --force pra sobrescrever.` — confirma a trava de segurança antes de qualquer chamada ao Gemini (o `fileExists` é checado antes do `generateJson`).

- [ ] **Step 3: Commit**

```bash
git add content-hub/scripts/escrever.ts
git commit -m "feat(content-hub): adiciona script content:escrever"
```

---

## Task 18: `scripts/revisar.ts`

**Files:**
- Create: `content-hub/scripts/revisar.ts`

**Interfaces:**
- Consumes: `requireArg` (Task 4), `loadJson` (Task 7), `PautaSchema` (Task 2), `pautaJsonPath`/`blogMdxPath`/`REPO_ROOT` (Task 3), `runChecklist` (Task 12), `loadKnowledge` (Task 8), `buildRevisaoPrompt` (Task 11), `createGeminiClient` (Task 10).
- Produces: script `content:revisar --pauta={slug}` que imprime o relatório no terminal.

- [ ] **Step 1: Write the implementation**

Create `content-hub/scripts/revisar.ts`:
```ts
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import matter from "gray-matter";
import { requireArg } from "../lib/cli.ts";
import { loadJson } from "../lib/store.ts";
import { PautaSchema } from "../lib/schemas.ts";
import { pautaJsonPath, blogMdxPath, REPO_ROOT } from "../lib/paths.ts";
import { runChecklist } from "../lib/checklist.ts";
import { loadKnowledge } from "../lib/knowledge.ts";
import { buildRevisaoPrompt } from "../lib/prompts.ts";
import { createGeminiClient } from "../lib/gemini.ts";

async function main() {
  const slug = requireArg(process.argv.slice(2), "pauta");
  const pauta = await loadJson(pautaJsonPath(slug), PautaSchema, "Rode: npm run content:pautas:sync");

  const mdxPath = blogMdxPath(pauta.categoria, slug);
  let raw: string;
  try {
    raw = await readFile(mdxPath, "utf8");
  } catch {
    throw new Error(`Post não encontrado: ${mdxPath}\nRode: npm run content:escrever -- --pauta=${slug}`);
  }
  const { data, content } = matter(raw);
  const title = String(data.title ?? "");
  const excerpt = String(data.excerpt ?? "");

  console.log(`\n=== Checklist técnico: ${slug} ===\n`);
  for (const item of runChecklist(title, excerpt, content)) {
    console.log(`${item.ok ? "✅" : "⚠️ "} ${item.label}: ${item.detail}`);
  }

  console.log(`\n=== Crítica editorial (Gemini) ===\n`);
  const knowledge = await loadKnowledge(join(REPO_ROOT, "content-hub", "knowledge"));
  const client = createGeminiClient();
  const critica = await client.generateGrounded(
    buildRevisaoPrompt({ title, excerpt, body: content, knowledge }),
  );
  console.log(critica);
  console.log(`\nLembrete: este relatório não bloqueia a publicação.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
```

- [ ] **Step 2: Verificar o checklist técnico contra um post real já existente**

Run:
```
npx tsx content-hub/scripts/revisar.ts --pauta=qual-o-melhor-tapete-higienico-para-caes
```
(requer um `content/pautas/qual-o-melhor-tapete-higienico-para-caes/pauta.json` mínimo — crie um manualmente com `categoria: "caes"` se ainda não existir, só pra este teste manual.)

Expected: imprime o bloco `=== Checklist técnico ===` com os 5 itens (o post de referência não tem `<Faq>`, então esse item deve aparecer como ⚠️), seguido do bloco `=== Crítica editorial (Gemini) ===` com texto gerado.

- [ ] **Step 3: Commit**

```bash
git add content-hub/scripts/revisar.ts
git commit -m "feat(content-hub): adiciona script content:revisar"
```

---

## Task 19: Wiring final no `package.json` e verificação de ponta a ponta

**Files:**
- Modify: `package.json`

**Interfaces:**
- Consumes: todos os scripts das Tasks 14-18.
- Produces: comandos `npm run content:*` e `npm run test:content-hub` disponíveis pro usuário.

- [ ] **Step 1: Adicionar os scripts ao package.json**

Edit `package.json`, dentro do bloco `"scripts"` (após `"test:admin"`):
```json
    "test:admin": "node --test scripts/admin/lib/posts.test.mjs scripts/admin/lib/upload.test.mjs",
    "content:pautas:sync": "tsx content-hub/scripts/pautas-sync.ts",
    "content:candidatos": "tsx content-hub/scripts/candidatos.ts",
    "content:pesquisa": "tsx content-hub/scripts/pesquisa.ts",
    "content:escrever": "tsx content-hub/scripts/escrever.ts",
    "content:revisar": "tsx content-hub/scripts/revisar.ts",
    "test:content-hub": "tsx --test content-hub"
```

- [ ] **Step 2: Rodar a suíte completa de testes do content-hub**

Run: `npm run test:content-hub`
Expected: todos os testes das Tasks 2-14 passam (schemas, paths, cli, csv, slug, images, store, knowledge, frontmatter, gemini, prompts, checklist, pautas-sync) — nenhuma chamada de rede é feita.

- [ ] **Step 3: Rodar a suíte de testes existente do projeto pra garantir que nada quebrou**

Run: `npm run test:admin`
Expected: PASS, igual antes desta mudança (nenhum arquivo de `scripts/admin/` foi tocado).

- [ ] **Step 4: Rodar o build do Astro**

Run: `npm run build`
Expected: build conclui sem erros, incluindo o post de referência com o novo `Faq` registrado (Task 13) e nenhum novo arquivo `.mdx` de teste deixado em `src/content/blog/` (os testes manuais das Tasks 14-18 não devem ter escrito em `src/content/blog/` sem limpeza — confira com `git status` e remova qualquer artefato de teste antes de prosseguir).

- [ ] **Step 5: Commit**

```bash
git add package.json
git commit -m "feat(content-hub): adiciona scripts npm do pipeline de conteudo afiliado"
```

---

## Verificação final (checklist de cobertura da spec)

- Estrutura de pastas `content-hub/` + `content/pautas/{slug}/` — Tasks 1, 3.
- `pauta.json` a partir de CSV mestre — Tasks 5, 14.
- `content:candidatos` com Gemini + grounding — Tasks 10, 11, 15.
- Edição manual de `selecionados.json` — documentada no README (Task 1), nenhum script escreve nesse arquivo.
- `content:pesquisa` gerando `dossies.json` — Task 16.
- `content:escrever` gerando `.mdx` com frontmatter real do Astro + componentes existentes + novo `Faq` — Tasks 9, 13, 17.
- `content:revisar` com checklist determinístico + crítica Gemini, sem bloquear — Tasks 12, 18.
- Scripts no `package.json`, TypeScript via `tsx`, sem infra externa nova — Tasks 1, 19.
