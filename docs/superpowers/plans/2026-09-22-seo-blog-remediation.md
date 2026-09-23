# Remediação de SEO/UX do Blog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Nota de adaptação:** este plano não segue o ciclo TDD estrito (red/green) da skill `writing-plans` em todas as tarefas. As Tasks 1–8 são mudanças de código/template e ganham testes reais (`node:test`, seguindo o padrão já usado em `scripts/admin/lib/*.test.mjs`). As Tasks 9–10 são correções pontuais de conteúdo (109 arquivos `.mdx` de dados, não lógica) e são verificadas por leitura + `npm run build`, não por teste automatizado — não existe comportamento de função para testar ali, só dados.

**Goal:** Resolver as pendências técnicas de SEO/UX levantadas na auditoria do blog (109 posts): imagens de capa quebradas, ausência de dados estruturados, meta tags incompletas, H1 duplicado, CLS na imagem de capa, ausência de linkagem interna, e falta de visibilidade sobre o que ainda falta corrigir em cada post.

**Architecture:** Mudanças de template/componente em `src/layouts/` e `src/components/` (Article JSON-LD, breadcrumb, posts relacionados, meta tags de artigo); extensão do admin local já existente (`scripts/admin/`) para expor e sinalizar pendências de SEO por post, permitindo que o trabalho manual (upload de imagem, ajuste de título/excerpt) seja feito ali, um post por vez; e dois scripts pontuais (`scripts/fix-duplicate-h1.mjs`, `scripts/rehost-roundup-images.mjs`) que corrigem, de uma vez, os problemas que já têm dado suficiente para correção automática.

**Tech Stack:** Astro 6 + MDX (site), Node.js puro + Express + Quill (admin local em `scripts/admin/`), `gray-matter` para frontmatter, `wrangler r2` para upload de imagens no bucket `azpetshop-images` (CDN `cdn.azpetshop.com.br`), `node:test` + `node:assert/strict` para os testes novos.

## Global Constraints

- Nenhuma mudança de conteúdo/redação do corpo dos artigos — o escopo é experiência técnica de SEO (imagens, meta tags, dados estruturados, hierarquia de headings, linkagem interna), não reescrever texto.
- As 107 imagens de capa (`hero`) e as imagens de produto já mortas (ver Task 10) **não** serão buscadas em bancos de imagem nem geradas por IA — o usuário vai fornecê-las manualmente pelo admin (`npm run admin` → `/edit.html`), que já sobe pro R2/CDN e atualiza `hero`/`heroAlt` sozinho.
- Frontmatter continua seguindo exatamente o schema de `src/content.config.ts` — nenhuma mudança de schema é necessária para este plano.
- Upload de imagem sempre via `wrangler r2 object put --remote` no bucket `azpetshop-images`, servindo em `https://cdn.azpetshop.com.br/posts/<categoria>/<slug>/<arquivo>` — é o padrão já usado por `scripts/upload-image.mjs` e `scripts/admin/lib/upload.mjs`; não introduzir um segundo mecanismo de upload.
- Testes novos seguem o padrão de `scripts/admin/lib/posts.test.mjs`: `node:test`, fixtures em diretório temporário (`mkdtemp`), sem mocks de rede.
- `npm run build` (Astro) precisa continuar passando sem erros depois de cada task de código.

---

## Task 1: `robots.txt` referenciando o sitemap

**Files:**
- Create: `public/robots.txt`

**Interfaces:**
- Produces: `https://www.azpetshop.com.br/robots.txt` servindo estático via Astro (tudo em `public/` é copiado para a raiz do build).

- [ ] **Step 1: Criar o arquivo**

Create `public/robots.txt`:
```
User-agent: *
Allow: /

Sitemap: https://www.azpetshop.com.br/sitemap-index.xml
```

- [ ] **Step 2: Verificar que o build copia o arquivo**

Run: `npm run build`
Expected: build termina sem erro e `dist/client/robots.txt` existe com o conteúdo acima.

- [ ] **Step 3: Commit**

```bash
git add public/robots.txt
git commit -m "seo: adicionar robots.txt referenciando o sitemap"
```

---

## Task 2: Meta tags de artigo no `BaseLayout` (og:type, article:*, twitter:card)

**Files:**
- Modify: `src/layouts/BaseLayout.astro`

**Interfaces:**
- Consumes: nada de tarefas anteriores.
- Produces: `BaseLayout` passa a aceitar `type?: "website" | "article"` (default `"website"`), `publishedTime?: Date` e `modifiedTime?: Date`. Task 3 (`[slug].astro`) consome essas props.

- [ ] **Step 1: Atualizar as Props e o `<head>`**

In `src/layouts/BaseLayout.astro`, replace:
```astro
interface Props {
  title: string;
  description?: string;
  image?: string;
}
const { title, description = "Conteúdo para cuidar melhor do seu pet.", image } =
  Astro.props;
const canonical = new URL(Astro.url.pathname, Astro.site);
```
with:
```astro
interface Props {
  title: string;
  description?: string;
  image?: string;
  type?: "website" | "article";
  publishedTime?: Date;
  modifiedTime?: Date;
}
const {
  title,
  description = "Conteúdo para cuidar melhor do seu pet.",
  image,
  type = "website",
  publishedTime,
  modifiedTime,
} = Astro.props;
const canonical = new URL(Astro.url.pathname, Astro.site);
```

Then replace:
```astro
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:type" content="website" />
    <meta property="og:url" content={canonical} />
    {image && <meta property="og:image" content={image} />}
```
with:
```astro
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:type" content={type} />
    <meta property="og:url" content={canonical} />
    {image && <meta property="og:image" content={image} />}
    {type === "article" && publishedTime && (
      <meta property="article:published_time" content={publishedTime.toISOString()} />
    )}
    {type === "article" && modifiedTime && (
      <meta property="article:modified_time" content={modifiedTime.toISOString()} />
    )}

    <meta name="twitter:card" content={image ? "summary_large_image" : "summary"} />
    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={description} />
    {image && <meta name="twitter:image" content={image} />}
```

- [ ] **Step 2: Verificar visualmente**

Run: `npm run dev`, abra `http://localhost:4321/blog/caes/rottweiler/` (ou outro post) e confira, via DevTools → Elements, que `<meta property="og:type">` ainda aparece como `website` (a página do post só vira `article` na Task 3, quando `[slug].astro` passar a prop).
Expected: nenhuma mudança visual, nenhum erro no console.

- [ ] **Step 3: Commit**

```bash
git add src/layouts/BaseLayout.astro
git commit -m "seo: adicionar meta tags de article e twitter:card ao BaseLayout"
```

---

## Task 3: Dados estruturados (Article + BreadcrumbList) e breadcrumb visível

**Files:**
- Create: `src/components/ArticleJsonLd.astro`
- Create: `src/components/Breadcrumbs.astro`
- Modify: `src/pages/blog/[category]/[slug].astro`

**Interfaces:**
- Consumes: `labelFor` de `src/lib/categories.ts` (já existe); `type`/`publishedTime`/`modifiedTime` do `BaseLayout` (Task 2).
- Produces: `ArticleJsonLd` recebe `{ title, description, image?, url, author, datePublished, dateModified?, breadcrumbs }`; `Breadcrumbs` recebe `{ items: { name: string; url: string }[] }`. Task 5 (RelatedPosts) não depende disso, mas reaproveita o mesmo padrão de `items`.

- [ ] **Step 1: Criar `ArticleJsonLd.astro`**

Create `src/components/ArticleJsonLd.astro`:
```astro
---
interface Crumb {
  name: string;
  url: string;
}
interface Props {
  title: string;
  description: string;
  image?: string;
  url: string;
  author: string;
  datePublished: Date;
  dateModified?: Date;
  breadcrumbs: Crumb[];
}
const { title, description, image, url, author, datePublished, dateModified, breadcrumbs } =
  Astro.props;

const articleLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: title,
  description,
  ...(image ? { image: [image] } : {}),
  author: { "@type": "Organization", name: author },
  publisher: { "@type": "Organization", name: "AZ Pet Shop" },
  datePublished: datePublished.toISOString(),
  dateModified: (dateModified ?? datePublished).toISOString(),
  mainEntityOfPage: { "@type": "WebPage", "@id": url },
};

const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: breadcrumbs.map((c, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: c.name,
    item: c.url,
  })),
};
---

<script type="application/ld+json" set:html={JSON.stringify(articleLd).replace(/</g, "\\u003c")} />
<script type="application/ld+json" set:html={JSON.stringify(breadcrumbLd).replace(/</g, "\\u003c")} />
```

- [ ] **Step 2: Criar `Breadcrumbs.astro`**

Create `src/components/Breadcrumbs.astro`:
```astro
---
interface Crumb {
  name: string;
  url: string;
}
interface Props {
  items: Crumb[];
}
const { items } = Astro.props;
---

<nav aria-label="Breadcrumb" class="mb-4 text-xs text-ink/60">
  <ol class="flex flex-wrap items-center gap-1">
    {items.map((item, i) => (
      <li class="flex items-center gap-1">
        {i > 0 && <span aria-hidden="true">/</span>}
        {i === items.length - 1 ? (
          <span aria-current="page">{item.name}</span>
        ) : (
          <a href={item.url} class="hover:text-pink">{item.name}</a>
        )}
      </li>
    ))}
  </ol>
</nav>
```

- [ ] **Step 3: Ligar tudo em `[slug].astro`**

In `src/pages/blog/[category]/[slug].astro`, replace the imports block:
```astro
import { getCollection, render } from "astro:content";
import BaseLayout from "../../../layouts/BaseLayout.astro";
import PickBox from "../../../components/PickBox.astro";
import ComparisonTable from "../../../components/ComparisonTable.astro";
import QuickSummary from "../../../components/QuickSummary.astro";
import ProductHighlight from "../../../components/ProductHighlight.astro";
import Faq from "../../../components/Faq.astro";
import { labelFor } from "../../../lib/categories";
```
with:
```astro
import { getCollection, render } from "astro:content";
import BaseLayout from "../../../layouts/BaseLayout.astro";
import PickBox from "../../../components/PickBox.astro";
import ComparisonTable from "../../../components/ComparisonTable.astro";
import QuickSummary from "../../../components/QuickSummary.astro";
import ProductHighlight from "../../../components/ProductHighlight.astro";
import Faq from "../../../components/Faq.astro";
import ArticleJsonLd from "../../../components/ArticleJsonLd.astro";
import Breadcrumbs from "../../../components/Breadcrumbs.astro";
import { labelFor } from "../../../lib/categories";
```

Then replace:
```astro
const { post } = Astro.props;
const { Content } = await render(post);
const d = post.data;

const fmt = (date: Date) =>
  date.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
---

<BaseLayout title={`${d.title} — AZ Pet Shop`} description={d.excerpt} image={d.hero}>
  <article class="mx-auto max-w-3xl px-4 py-10">
    <a href={`/blog/${d.category}`} class="text-xs font-extrabold uppercase tracking-wider text-pink">
      {labelFor(d.category)}
    </a>
    <h1 class="mt-3 text-3xl font-black leading-tight text-navy md:text-4xl">{d.title}</h1>
```
with:
```astro
const { post } = Astro.props;
const { Content } = await render(post);
const d = post.data;

const fmt = (date: Date) =>
  date.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });

const canonicalUrl = new URL(Astro.url.pathname, Astro.site).toString();
const breadcrumbItems = [
  { name: "Início", url: new URL("/", Astro.site).toString() },
  { name: "Blog", url: new URL("/blog/", Astro.site).toString() },
  { name: labelFor(d.category), url: new URL(`/blog/${d.category}/`, Astro.site).toString() },
  { name: d.title, url: canonicalUrl },
];
---

<BaseLayout
  title={`${d.title} — AZ Pet Shop`}
  description={d.excerpt}
  image={d.hero}
  type="article"
  publishedTime={d.publishedAt}
  modifiedTime={d.updatedAt}
>
  <ArticleJsonLd
    title={d.title}
    description={d.excerpt}
    image={d.hero}
    url={canonicalUrl}
    author={d.author}
    datePublished={d.publishedAt}
    dateModified={d.updatedAt}
    breadcrumbs={breadcrumbItems}
  />
  <article class="mx-auto max-w-3xl px-4 py-10">
    <Breadcrumbs items={breadcrumbItems} />
    <h1 class="mt-3 text-3xl font-black leading-tight text-navy md:text-4xl">{d.title}</h1>
```

- [ ] **Step 4: Verificar com o Rich Results Test**

Run: `npm run build && npm run preview`, abra um post publicado localmente e cole a URL em https://search.google.com/test/rich-results.
Expected: o teste reconhece um item `Article` e um `BreadcrumbList` válidos (mesmo sem imagem de capa real, `Article` só fica incompleto quanto à imagem — isso é esperado até a Task 9).

- [ ] **Step 5: Commit**

```bash
git add src/components/ArticleJsonLd.astro src/components/Breadcrumbs.astro src/pages/blog/\[category\]/\[slug\].astro
git commit -m "seo: adicionar JSON-LD de Article/BreadcrumbList e trilha de breadcrumb visível"
```

---

## Task 4: Corrigir CLS na imagem de capa do artigo

**Files:**
- Modify: `src/pages/blog/[category]/[slug].astro`

**Interfaces:**
- Consumes: nenhuma das tarefas anteriores diretamente (independente, mas no mesmo arquivo da Task 3 — aplicar depois dela para evitar conflito de diff).

- [ ] **Step 1: Envolver a imagem em um container com aspect-ratio fixo**

Replace:
```astro
    {
      d.hero && (
        <img
          src={d.hero}
          alt={d.heroAlt ?? d.title}
          class="mt-6 w-full rounded-2xl object-cover"
        />
      )
    }
```
with:
```astro
    {
      d.hero && (
        <div class="mt-6 aspect-[16/10] w-full overflow-hidden rounded-2xl bg-mist">
          <img
            src={d.hero}
            alt={d.heroAlt ?? d.title}
            loading="eager"
            fetchpriority="high"
            class="h-full w-full object-cover"
          />
        </div>
      )
    }
```

- [ ] **Step 2: Verificar visualmente**

Run: `npm run dev`, abra um post com `hero` preenchido.
Expected: a área da imagem já reserva o espaço 16:10 antes da imagem carregar (visível reduzindo a rede no DevTools para "Slow 3G" — o layout não pula quando a imagem chega, mesmo estando quebrada).

- [ ] **Step 3: Commit**

```bash
git add src/pages/blog/\[category\]/\[slug\].astro
git commit -m "fix: reservar aspect-ratio na imagem de capa do artigo para evitar CLS"
```

---

## Task 5: Linkagem interna — posts relacionados

**Files:**
- Create: `src/components/RelatedPosts.astro`
- Modify: `src/pages/blog/[category]/[slug].astro`

**Interfaces:**
- Consumes: `labelFor` de `src/lib/categories.ts`.
- Produces: `RelatedPosts` recebe `{ category: string; currentId: string; limit?: number }` (default `limit = 4`).

- [ ] **Step 1: Criar o componente**

Create `src/components/RelatedPosts.astro`:
```astro
---
import { getCollection } from "astro:content";
import { labelFor } from "../lib/categories";

interface Props {
  category: string;
  currentId: string;
  limit?: number;
}
const { category, currentId, limit = 4 } = Astro.props;

const posts = (
  await getCollection(
    "blog",
    (p) => !p.data.draft && p.data.category === category && p.id !== currentId,
  )
)
  .sort((a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf())
  .slice(0, limit);
---

{
  posts.length > 0 && (
    <section class="mt-12 border-t border-line pt-8">
      <h2 class="text-xl font-extrabold text-navy">Continue lendo sobre {labelFor(category)}</h2>
      <ul class="mt-4 grid gap-3 sm:grid-cols-2">
        {posts.map((p) => (
          <li>
            <a href={`/blog/${p.id}/`} class="font-bold text-pink hover:underline">
              {p.data.title}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

- [ ] **Step 2: Inserir no fim do artigo**

In `src/pages/blog/[category]/[slug].astro`, add the import next to the others:
```astro
import RelatedPosts from "../../../components/RelatedPosts.astro";
```

Then replace the closing block:
```astro
    <p class="mt-10 rounded-xl bg-mist p-4 text-xs text-ink/60">
      Transparência: alguns links acima são de afiliados. A AZ Pet Shop pode receber
      comissão por compras realizadas, sem custo adicional para você.
    </p>
  </article>
</BaseLayout>
```
with:
```astro
    <p class="mt-10 rounded-xl bg-mist p-4 text-xs text-ink/60">
      Transparência: alguns links acima são de afiliados. A AZ Pet Shop pode receber
      comissão por compras realizadas, sem custo adicional para você.
    </p>

    <RelatedPosts category={d.category} currentId={post.id} />
  </article>
</BaseLayout>
```

- [ ] **Step 3: Verificar visualmente**

Run: `npm run dev`, abra um post de uma categoria com mais de um artigo (ex.: `caes`).
Expected: aparece a seção "Continue lendo sobre Cães" no fim do artigo, com até 4 links para outros posts da mesma categoria, e nenhum link aponta para o próprio post.

- [ ] **Step 4: Commit**

```bash
git add src/components/RelatedPosts.astro src/pages/blog/\[category\]/\[slug\].astro
git commit -m "seo: adicionar bloco de posts relacionados para reforçar linkagem interna"
```

---

## Task 6: Detectar pendências de SEO por post (`posts.mjs`) + remover H1 duplicado ao salvar

**Files:**
- Modify: `scripts/admin/lib/posts.mjs`
- Modify: `scripts/admin/lib/posts.test.mjs`

**Interfaces:**
- Produces: `stripDuplicateH1(markdown, title): string` (exportada); `listPosts()` passa a retornar também `seoFlags: string[]` por post, com os valores possíveis `"hero-ausente"`, `"sem-alt-da-capa"`, `"titulo-longo"`, `"excerpt-fora-do-range"`, `"h1-duplicado"`. Consumido por: Task 7 (script retroativo) e Task 8 (coluna na tabela do admin).

- [ ] **Step 1: Escrever os testes que ainda falham**

In `scripts/admin/lib/posts.test.mjs`, add at the end of the file (before nothing — it's the last statement, so just append):
```js
test("stripDuplicateH1 remove o H1 do corpo quando é igual ao título", () => {
  const markdown = "# Rottweiler\n\nUm cão forte e leal.\n";
  assert.equal(stripDuplicateH1(markdown, "Rottweiler"), "Um cão forte e leal.\n");
});

test("stripDuplicateH1 mantém o corpo intacto quando o H1 é diferente do título", () => {
  const markdown = "# Outro título\n\nConteúdo.\n";
  assert.equal(stripDuplicateH1(markdown, "Rottweiler"), markdown);
});

test("listPosts sinaliza pendências de SEO por post", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "azpetshop-posts-test-"));
  try {
    await mkdir(path.join(dir, "caes"), { recursive: true });
    await writeFile(
      path.join(dir, "caes", "sem-capa.mdx"),
      `---
title: "Post sem capa e com título bem longo pra estourar o limite de SEO"
excerpt: "Resumo curto"
category: "caes"
type: "guia"
publishedAt: 2026-01-10
author: "Equipe AZ Pet Shop"
draft: false
products: []
---

# Post sem capa e com título bem longo pra estourar o limite de SEO

Corpo do post.
`,
      "utf8",
    );
    const posts = await listPosts(dir);
    assert.equal(posts.length, 1);
    assert.ok(posts[0].seoFlags.includes("hero-ausente"));
    assert.ok(posts[0].seoFlags.includes("titulo-longo"));
    assert.ok(posts[0].seoFlags.includes("excerpt-fora-do-range"));
    assert.ok(posts[0].seoFlags.includes("h1-duplicado"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
```

And update the import line at the top of the same file:
```js
import { listPosts, readPost, writePost } from "./posts.mjs";
```
to:
```js
import { listPosts, readPost, writePost, stripDuplicateH1 } from "./posts.mjs";
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm run test:admin`
Expected: falha com `TypeError: stripDuplicateH1 is not a function` e/ou `seoFlags` undefined nos asserts.

- [ ] **Step 3: Implementar em `posts.mjs`**

In `scripts/admin/lib/posts.mjs`, replace:
```js
async function walkMdxFiles(dir, base = dir) {
```
with:
```js
const SITE_TITLE_SUFFIX = " — AZ Pet Shop";
const EXCERPT_MIN = 70;
const EXCERPT_MAX = 160;

export function stripDuplicateH1(markdown, title) {
  const trimmed = markdown.replace(/^\s+/, "");
  const [firstLine, ...rest] = trimmed.split("\n");
  if (firstLine?.trim() === `# ${title}`.trim()) {
    return rest.join("\n").replace(/^\s+/, "");
  }
  return markdown;
}

function computeSeoFlags(data, content) {
  const flags = [];
  if (!data.hero) flags.push("hero-ausente");
  if (data.hero && !data.heroAlt) flags.push("sem-alt-da-capa");
  if (((data.title ?? "").length + SITE_TITLE_SUFFIX.length) > 60) flags.push("titulo-longo");
  const excerptLen = (data.excerpt ?? "").length;
  if (excerptLen < EXCERPT_MIN || excerptLen > EXCERPT_MAX) flags.push("excerpt-fora-do-range");
  const firstLine = content.trim().split("\n")[0]?.trim();
  if (firstLine === `# ${data.title}`) flags.push("h1-duplicado");
  return flags;
}

async function walkMdxFiles(dir, base = dir) {
```

Then replace the body of `listPosts`:
```js
export async function listPosts(blogDir) {
  const relPaths = await walkMdxFiles(blogDir);
  const posts = await Promise.all(
    relPaths.map(async (relPath) => {
      const [category, ...slugParts] = relPath.replace(/\.mdx$/, "").split("/");
      const raw = await readFile(path.join(blogDir, relPath), "utf8");
      const { data } = matter(raw);
      return {
        category,
        slug: slugParts.join("/"),
        title: data.title,
        publishedAt: data.publishedAt,
        draft: Boolean(data.draft),
      };
    }),
  );
  posts.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  return posts;
}
```
with:
```js
export async function listPosts(blogDir) {
  const relPaths = await walkMdxFiles(blogDir);
  const posts = await Promise.all(
    relPaths.map(async (relPath) => {
      const [category, ...slugParts] = relPath.replace(/\.mdx$/, "").split("/");
      const raw = await readFile(path.join(blogDir, relPath), "utf8");
      const { data, content } = matter(raw);
      return {
        category,
        slug: slugParts.join("/"),
        title: data.title,
        publishedAt: data.publishedAt,
        draft: Boolean(data.draft),
        seoFlags: computeSeoFlags(data, content),
      };
    }),
  );
  posts.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  return posts;
}
```

Finally, in `writePost`, replace:
```js
  const markdownBody = turndownService.turndown(fields.contentHtml ?? "");
  const output = matter.stringify(markdownBody, data);
  await writeFile(filePath, output, "utf8");
```
with:
```js
  const markdownBody = stripDuplicateH1(turndownService.turndown(fields.contentHtml ?? ""), data.title);
  const output = matter.stringify(markdownBody, data);
  await writeFile(filePath, output, "utf8");
```

- [ ] **Step 4: Rodar os testes de novo**

Run: `npm run test:admin`
Expected: todos os testes passam, incluindo os 3 novos.

- [ ] **Step 5: Commit**

```bash
git add scripts/admin/lib/posts.mjs scripts/admin/lib/posts.test.mjs
git commit -m "feat(admin): sinalizar pendências de SEO por post e remover H1 duplicado ao salvar"
```

---

## Task 7: Remover H1 duplicado dos 43 posts existentes (correção retroativa)

**Files:**
- Create: `scripts/fix-duplicate-h1.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `stripDuplicateH1` de `scripts/admin/lib/posts.mjs` (Task 6).

- [ ] **Step 1: Criar o script**

Create `scripts/fix-duplicate-h1.mjs`:
```js
// scripts/fix-duplicate-h1.mjs
// Remove, nos .mdx existentes, o "# Título" duplicado no corpo quando ele
// repete exatamente o campo `title` do frontmatter (o layout já renderiza
// um H1 a partir do título — ter os dois gera dois H1 na mesma página).
//
//   node scripts/fix-duplicate-h1.mjs           <- aplica em tudo
//   DRY_RUN=1 node scripts/fix-duplicate-h1.mjs  <- só lista o que mudaria

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { stripDuplicateH1 } from "./admin/lib/posts.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const BLOG_DIR = path.join(ROOT, "src", "content", "blog");
const DRY_RUN = Boolean(process.env.DRY_RUN);

async function walkMdxFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walkMdxFiles(full)));
    else if (entry.name.endsWith(".mdx")) files.push(full);
  }
  return files;
}

async function main() {
  const files = await walkMdxFiles(BLOG_DIR);
  let changed = 0;

  for (const file of files) {
    const raw = await readFile(file, "utf8");
    const { data, content } = matter(raw);
    const stripped = stripDuplicateH1(content, data.title);
    if (stripped === content) continue;

    changed++;
    const rel = path.relative(ROOT, file);
    if (DRY_RUN) {
      console.log(`[dry-run] removeria H1 duplicado em ${rel}`);
      continue;
    }
    const output = matter.stringify(stripped, data);
    await writeFile(file, output, "utf8");
    console.log(`corrigido: ${rel}`);
  }

  console.log(`\n${changed} arquivo(s) ${DRY_RUN ? "seriam alterados" : "alterados"} de ${files.length} total.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Rodar em modo dry-run e conferir a contagem**

Run: `DRY_RUN=1 node scripts/fix-duplicate-h1.mjs`
Expected: lista 43 arquivos (o mesmo número encontrado na auditoria) e termina com `43 arquivo(s) seriam alterados de 109 total.`

- [ ] **Step 3: Aplicar de verdade**

Run: `node scripts/fix-duplicate-h1.mjs`
Expected: `43 arquivo(s) alterados de 109 total.`

- [ ] **Step 4: Conferir que nada além do H1 mudou**

Run: `git diff --stat -- src/content/blog`
Expected: só os 43 arquivos aparecem, cada um com poucas linhas removidas (o `# Título` e a linha em branco seguinte) — nenhuma outra edição de conteúdo.

- [ ] **Step 5: Registrar o script em `package.json`**

In `package.json`, replace:
```json
    "upload-image": "node scripts/upload-image.mjs",
```
with:
```json
    "upload-image": "node scripts/upload-image.mjs",
    "fix-duplicate-h1": "node scripts/fix-duplicate-h1.mjs",
```

- [ ] **Step 6: Build final e commit**

Run: `npm run build`
Expected: build passa sem erros.

```bash
git add scripts/fix-duplicate-h1.mjs package.json src/content/blog
git commit -m "fix: remover H1 duplicado do corpo dos 43 posts que repetiam o título"
```

---

## Task 8: Mostrar pendências de SEO na lista do admin

**Files:**
- Modify: `scripts/admin/public/index.html`
- Modify: `scripts/admin/public/index.js`

**Interfaces:**
- Consumes: `seoFlags` retornado por `GET /api/posts` (Task 6).

- [ ] **Step 1: Adicionar a coluna na tabela**

In `scripts/admin/public/index.html`, replace:
```html
      <tr><th>Título</th><th>Categoria</th><th>Publicado em</th><th>Rascunho</th></tr>
```
with:
```html
      <tr><th>Título</th><th>Categoria</th><th>Publicado em</th><th>Rascunho</th><th>Pendências de SEO</th></tr>
```

- [ ] **Step 2: Renderizar as flags**

In `scripts/admin/public/index.js`, replace:
```js
const FLAG_LABELS = {};
```

Actually replace the whole `loadPosts` body's row template. Replace:
```js
    body.innerHTML = posts
      .map(
        (p) => `
      <tr>
        <td><a href="/edit.html?category=${encodeURIComponent(p.category)}&slug=${encodeURIComponent(p.slug)}">${escapeHtml(p.title)}</a></td>
        <td>${escapeHtml(p.category)}</td>
        <td>${p.publishedAt ? new Date(p.publishedAt).toLocaleDateString("pt-BR") : ""}</td>
        <td>${p.draft ? "sim" : ""}</td>
      </tr>
    `,
      )
      .join("");
```
with:
```js
    const FLAG_LABELS = {
      "hero-ausente": "sem imagem de capa",
      "sem-alt-da-capa": "capa sem texto alternativo",
      "titulo-longo": "título passa de 60 caracteres",
      "excerpt-fora-do-range": "excerpt fora de 70–160 caracteres",
      "h1-duplicado": "H1 duplicado no corpo",
    };

    body.innerHTML = posts
      .map((p) => {
        const flags = (p.seoFlags ?? []).map((f) => FLAG_LABELS[f] ?? f);
        return `
      <tr>
        <td><a href="/edit.html?category=${encodeURIComponent(p.category)}&slug=${encodeURIComponent(p.slug)}">${escapeHtml(p.title)}</a></td>
        <td>${escapeHtml(p.category)}</td>
        <td>${p.publishedAt ? new Date(p.publishedAt).toLocaleDateString("pt-BR") : ""}</td>
        <td>${p.draft ? "sim" : ""}</td>
        <td>${flags.length ? escapeHtml(flags.join(", ")) : "—"}</td>
      </tr>
    `;
      })
      .join("");
```

- [ ] **Step 3: Verificar no navegador**

Run: `npm run admin`, abra `http://localhost:4500`.
Expected: a tabela mostra uma coluna "Pendências de SEO" com o texto das flags (ex.: "sem imagem de capa, título passa de 60 caracteres") para os posts afetados, e "—" para os que não têm pendência.

- [ ] **Step 4: Commit**

```bash
git add scripts/admin/public/index.html scripts/admin/public/index.js
git commit -m "feat(admin): mostrar pendências de SEO na listagem de posts"
```

---

## Task 9: Contador de caracteres para título e excerpt no editor

**Files:**
- Modify: `scripts/admin/public/edit.html`
- Modify: `scripts/admin/public/edit.js`
- Modify: `scripts/admin/public/style.css`

**Interfaces:**
- Consumes: nada de tarefas anteriores — é uma melhoria isolada do editor.

- [ ] **Step 1: Adicionar os elementos de contagem no HTML**

In `scripts/admin/public/edit.html`, replace:
```html
    <label>Título<br /><input type="text" id="title" required /></label>
    <label>Excerpt<br /><textarea id="excerpt" rows="3" required></textarea></label>
```
with:
```html
    <label>Título<br /><input type="text" id="title" required /></label>
    <small id="title-count"></small>
    <label>Excerpt<br /><textarea id="excerpt" rows="3" required></textarea></label>
    <small id="excerpt-count"></small>
```

- [ ] **Step 2: Adicionar a lógica de contagem**

In `scripts/admin/public/edit.js`, add right after the `const quill = new Quill(...)` line:
```js
const TITLE_SUFFIX = " — AZ Pet Shop";
const EXCERPT_MIN = 70;
const EXCERPT_MAX = 160;

function updateTitleCount() {
  const value = document.getElementById("title").value;
  const total = value.length + TITLE_SUFFIX.length;
  const el = document.getElementById("title-count");
  el.textContent = `${value.length} caracteres (${total} com "${TITLE_SUFFIX.trim()}" — ideal até 60)`;
  el.classList.toggle("count-warning", total > 60);
}

function updateExcerptCount() {
  const value = document.getElementById("excerpt").value;
  const el = document.getElementById("excerpt-count");
  el.textContent = `${value.length} caracteres (ideal entre ${EXCERPT_MIN} e ${EXCERPT_MAX})`;
  el.classList.toggle("count-warning", value.length < EXCERPT_MIN || value.length > EXCERPT_MAX);
}

document.getElementById("title").addEventListener("input", updateTitleCount);
document.getElementById("excerpt").addEventListener("input", updateExcerptCount);
```

Then, inside `loadPost()`, replace:
```js
    document.getElementById("title").value = data.title ?? "";
    document.getElementById("excerpt").value = data.excerpt ?? "";
    document.getElementById("hero").value = data.hero ?? "";
    document.getElementById("heroAlt").value = data.heroAlt ?? "";
    quill.root.innerHTML = data.contentHtml ?? "";
```
with:
```js
    document.getElementById("title").value = data.title ?? "";
    document.getElementById("excerpt").value = data.excerpt ?? "";
    document.getElementById("hero").value = data.hero ?? "";
    document.getElementById("heroAlt").value = data.heroAlt ?? "";
    quill.root.innerHTML = data.contentHtml ?? "";
    updateTitleCount();
    updateExcerptCount();
```

- [ ] **Step 3: Estilo do aviso**

In `scripts/admin/public/style.css`, add at the end of the file:
```css
.count-warning {
  color: #b91c1c;
  font-weight: bold;
}
```

- [ ] **Step 4: Verificar no navegador**

Run: `npm run admin`, abra a edição de um post com título/excerpt fora do range (ex.: `caes/american-bully`).
Expected: os contadores aparecem abaixo de cada campo e ficam vermelhos/negrito quando fora do limite; digitar no campo atualiza a contagem em tempo real.

- [ ] **Step 5: Commit**

```bash
git add scripts/admin/public/edit.html scripts/admin/public/edit.js scripts/admin/public/style.css
git commit -m "feat(admin): mostrar contador de caracteres de título e excerpt no editor"
```

---

## Task 10: Re-hospedar no CDN as imagens de produto ainda vivas no post de caixas de transporte

**Files:**
- Modify: `src/content/blog/caes/caixas-de-transporte-para-viagens-de-aviao.mdx`

**Interfaces:**
- Nenhuma — mudança de conteúdo (URLs de imagem no corpo do MDX), sem código.

**Contexto:** dos 4 posts "roundup", 2 têm imagens de produto ainda acessíveis mas hotlinkadas de terceiros (Google Docs e sites de concorrentes/varejo) — mas só um deles entra nesta task. `melhores-antipulgas-cachorros.mdx` **foi excluído do escopo desta task**: esse post vai ser reescrito em uma iniciativa separada (schema `products[]` com origem own/affiliate/external substituindo as imagens hardcoded no corpo), então re-hospedar as imagens dele agora seria trabalho jogado fora. As outras imagens já mortas (as 3 do post de tapete higiênico, e as do próprio `melhores-antipulgas-cachorros.mdx`) continuam na lista de pendências manuais no fim deste plano.

- [ ] **Step 1: Baixar as imagens ainda vivas**

Run:
```bash
mkdir -p /tmp/roundup-images
curl -sL -o /tmp/roundup-images/caixa-gulliver-chalesco.jpg "https://lh7-rt.googleusercontent.com/docsz/AD_4nXfY8m9Rgl3jlS8Du5k6TFYfzZExG_dsW4D80vOAeapZlQrzu3LH8TraeTn5GkPgJVD6ykBv1OsLa77ddG0CJZX5xsuRVjvj5K4UsizHFvoj0Ij-4XpQre9Sc-x2eIiW7dP74maDM10-sSWLueipKe39zRft?key=yeKINSXlJck8Ny1LCitKug"
curl -sL -o /tmp/roundup-images/caixa-cargo-kennel-luxo.jpg "https://lh7-rt.googleusercontent.com/docsz/AD_4nXfD39_YlZd_YHlyueyvaSlBT20O4jIibNiuY6AJuIPcn5Hnc1spoEPh6TgrhVmvmDUwEtkXOyfo0Gh3zA61C9bV99FhMJrg6luDjE280g5u_jZi3gf4arIZ3osgM9oMdEyKSyGsQd5gIvZsAgK-99Sim3-v?key=yeKINSXlJck8Ny1LCitKug"
```
Expected: 2 arquivos em `/tmp/roundup-images/`, nenhum vazio (`ls -la /tmp/roundup-images/`).

- [ ] **Step 2: Subir para o R2 usando o script já existente**

Run:
```bash
node scripts/upload-image.mjs --post caes/caixas-de-transporte-para-viagens-de-aviao --file /tmp/roundup-images/caixa-gulliver-chalesco.jpg --alt "Caixa de Transporte Gulliver da Chalesco" --name caixa-gulliver-chalesco
node scripts/upload-image.mjs --post caes/caixas-de-transporte-para-viagens-de-aviao --file /tmp/roundup-images/caixa-cargo-kennel-luxo.jpg --alt "Caixa de Transporte Cargo Kennel Luxo" --name caixa-cargo-kennel-luxo
```
Expected: cada comando imprime `✅ Upload concluído: https://cdn.azpetshop.com.br/posts/caes/caixas-de-transporte-para-viagens-de-aviao/<nome>.jpg` — anote as 2 URLs impressas.

- [ ] **Step 3: Substituir as URLs no corpo do post**

Em `src/content/blog/caes/caixas-de-transporte-para-viagens-de-aviao.mdx`, troque as duas linhas:
```
![](https://lh7-rt.googleusercontent.com/docsz/AD_4nXfY8m9Rgl3jlS8Du5k6TFYfzZExG_dsW4D80vOAeapZlQrzu3LH8TraeTn5GkPgJVD6ykBv1OsLa77ddG0CJZX5xsuRVjvj5K4UsizHFvoj0Ij-4XpQre9Sc-x2eIiW7dP74maDM10-sSWLueipKe39zRft?key=yeKINSXlJck8Ny1LCitKug)
```
por
```
![Caixa de Transporte Gulliver da Chalesco](https://cdn.azpetshop.com.br/posts/caes/caixas-de-transporte-para-viagens-de-aviao/caixa-gulliver-chalesco.jpg)
```
e
```
![](https://lh7-rt.googleusercontent.com/docsz/AD_4nXfD39_YlZd_YHlyueyvaSlBT20O4jIibNiuY6AJuIPcn5Hnc1spoEPh6TgrhVmvmDUwEtkXOyfo0Gh3zA61C9bV99FhMJrg6luDjE280g5u_jZi3gf4arIZ3osgM9oMdEyKSyGsQd5gIvZsAgK-99Sim3-v?key=yeKINSXlJck8Ny1LCitKug)
```
por
```
![Caixa de Transporte Cargo Kennel Luxo](https://cdn.azpetshop.com.br/posts/caes/caixas-de-transporte-para-viagens-de-aviao/caixa-cargo-kennel-luxo.jpg)
```

- [ ] **Step 4: Verificar**

Run: `npm run build && npm run preview`, abra o post e confira que as duas imagens carregam a partir de `cdn.azpetshop.com.br`.
Expected: as 2 imagens re-hospedadas aparecem corretamente.

- [ ] **Step 5: Commit**

```bash
git add src/content/blog/caes/caixas-de-transporte-para-viagens-de-aviao.mdx
git commit -m "fix: re-hospedar no CDN as imagens de produto do post de caixas de transporte"
```

---

## Self-Review

- **Imagens de capa quebradas (107/109):** endereçado pela Task 8 (visibilidade das pendências no admin) — a correção em si é manual, por decisão do usuário, feita post a post pelo admin já existente.
- **Sem JSON-LD / breadcrumb:** Task 3.
- **`og:type`/`article:*`/`twitter:card` ausentes:** Task 2.
- **CLS na imagem de capa:** Task 4.
- **Linkagem interna rasa:** Task 5.
- **43 H1 duplicados:** Tasks 6 e 7.
- **49 títulos e 54 excerpts fora do range:** Task 9 dá visibilidade em tempo real no editor; a correção texto a texto continua sendo trabalho manual (é redação, não lógica) — ver pendências abaixo.
- **`robots.txt` ausente:** Task 1.
- **Imagens de produto hotlinkadas (roundups):** Task 10 resolve as 6 que ainda estão vivas; as mortas viram pendência manual.
- **`heroAlt` ausente (107/109):** resolvido automaticamente conforme o usuário sobe cada imagem de capa pelo admin (o campo já existe no formulário de edição).

---

## Pendências que continuam manuais (fora do escopo de código deste plano)

Depois de rodar as Tasks 1–10, a coluna "Pendências de SEO" do admin (`npm run admin`) é a fonte de verdade do que falta. Concretamente:

1. **107 imagens de capa** — subir uma a uma pelo admin (`/edit.html` → campo "Upload de imagem" → marcar "Usar como capa"). Cada upload já atualiza `hero` e você preenche `heroAlt` com uma frase descritiva da foto (não repetir o título).
2. **4 imagens de produto já mortas** (as 3 imagens do post de tapete higiênico) — mesma via, usando "Upload de imagem" sem marcar "Usar como capa" e colando a URL retornada no lugar da URL quebrada no corpo.
3. **49 títulos e 54 excerpts fora do range de caracteres** — usar o contador da Task 9 como guia enquanto revisa cada um; é reescrita pontual do título/excerpt, não do corpo do artigo.
4. **`melhores-camas-de-cachorro.mdx`** não tem nenhuma imagem de produto no corpo (nem antes, nem depois deste plano) — ao subir a capa, vale avaliar se esse post também precisa de fotos dos produtos citados.
5. **`melhores-antipulgas-cachorros.mdx`** ficou fora da Task 10 de propósito: esse post vai ser reescrito por uma iniciativa separada (schema `products[]` com origem own/affiliate/external), que substitui as imagens hardcoded do corpo por um bloco estruturado. Não mexer nas imagens desse post até essa iniciativa acontecer.
