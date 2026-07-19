# Backend Administrativo Local do Blog — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir uma ferramenta administrativa local (`npm run admin`) para listar, editar (título/excerpt/capa/conteúdo via editor WYSIWYG) e subir fotos dos 109 posts existentes do blog.

**Architecture:** Servidor Express standalone em `scripts/admin/`, totalmente fora do build do Astro/Cloudflare. Lê/escreve os `.mdx` direto no disco (frontmatter via `gray-matter`, corpo convertido Markdown↔HTML via `marked`/`turndown`). Frontend são duas páginas HTML estáticas com JS puro, sem bundler, usando Quill.js via CDN como editor visual. Upload de imagem reusa o padrão de chave do R2 já usado por `scripts/upload-image.mjs`, chamando `wrangler r2 object put --remote` via `child_process`.

**Tech Stack:** Node.js (ESM, `.mjs`), Express, Multer, gray-matter, marked, turndown (já existente no projeto), Quill.js (CDN), `node:test` para os testes unitários da camada de lógica pura.

## Global Constraints

- A ferramenta roda **apenas localmente** (`localhost:4500`) e nunca é deployada — não há build step, não é importada por nenhum arquivo em `src/`.
- **Sem autenticação** — não há superfície de ataque remota a proteger.
- **Sem criação de posts novos** — apenas listagem e edição dos 109 posts existentes.
- **Categoria é somente leitura** no formulário de edição — nunca é aceita nem gravada a partir do payload de update, pois ela determina a pasta do arquivo e a URL pública (`/blog/<categoria>/<slug>`).
- **Sem automação de git** — salvar um post só grava o `.mdx` no disco; commit/push continuam manuais.
- Extensões de imagem aceitas: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.svg`.
- Bucket R2: `azpetshop-images`. CDN: `https://cdn.azpetshop.com.br`. Padrão de chave: `posts/<categoria>/<slug>/<arquivo>` (idêntico ao `scripts/upload-image.mjs` existente).
- Porta do servidor admin: `4500` (não colide com a porta `4321` do `astro dev`).

---

### Task 1: Camada de leitura/escrita dos posts (`lib/posts.mjs`)

**Files:**
- Create: `scripts/admin/lib/posts.mjs`
- Test: `scripts/admin/lib/posts.test.mjs`

**Interfaces:**
- Produces: `listPosts(blogDir: string): Promise<{category, slug, title, publishedAt, draft}[]>`, `readPost(blogDir: string, category: string, slug: string): Promise<{category, slug, title, excerpt, hero, heroAlt, contentHtml}>`, `writePost(blogDir: string, category: string, slug: string, fields: {title, excerpt, hero, heroAlt, contentHtml}): Promise<void>`. Erros de arquivo inexistente propagam com `err.code === "ENOENT"`.

- [ ] **Step 1: Instalar as dependências novas**

Run: `npm install --save-dev gray-matter marked`
Expected: `package.json` ganha `gray-matter` e `marked` em `devDependencies`; `npm install` termina sem erro.

- [ ] **Step 2: Escrever o arquivo de testes (falhando, pois `posts.mjs` ainda não existe)**

Criar `scripts/admin/lib/posts.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import matter from "gray-matter";
import { listPosts, readPost, writePost } from "./posts.mjs";

async function makeFixture() {
  const dir = await mkdtemp(path.join(tmpdir(), "azpetshop-posts-test-"));
  await mkdir(path.join(dir, "caes"), { recursive: true });
  await writeFile(
    path.join(dir, "caes", "rottweiler.mdx"),
    `---
title: "Rottweiler"
excerpt: "Tudo sobre a raça"
category: "caes"
type: "guia"
hero: "https://cdn.azpetshop.com.br/posts/caes/rottweiler/hero.jpg"
publishedAt: 2026-01-10
author: "Equipe AZ Pet Shop"
draft: false
products: []
---

# Rottweiler

Um cão **forte** e leal.

- Ponto um
- Ponto dois
`,
    "utf8",
  );
  return dir;
}

test("listPosts lista os posts encontrados no diretório", async () => {
  const dir = await makeFixture();
  try {
    const posts = await listPosts(dir);
    assert.equal(posts.length, 1);
    assert.equal(posts[0].category, "caes");
    assert.equal(posts[0].slug, "rottweiler");
    assert.equal(posts[0].title, "Rottweiler");
    assert.equal(posts[0].draft, false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("readPost converte o corpo em markdown para HTML", async () => {
  const dir = await makeFixture();
  try {
    const post = await readPost(dir, "caes", "rottweiler");
    assert.equal(post.title, "Rottweiler");
    assert.equal(post.excerpt, "Tudo sobre a raça");
    assert.match(post.contentHtml, /<h1>Rottweiler<\/h1>/);
    assert.match(post.contentHtml, /<strong>forte<\/strong>/);
    assert.match(post.contentHtml, /<li>Ponto um<\/li>/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("readPost rejeita com ENOENT quando o post não existe", async () => {
  const dir = await makeFixture();
  try {
    await assert.rejects(
      () => readPost(dir, "caes", "nao-existe"),
      (err) => err.code === "ENOENT",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("writePost atualiza campos editáveis e preserva os demais", async () => {
  const dir = await makeFixture();
  try {
    await writePost(dir, "caes", "rottweiler", {
      title: "Rottweiler: Guia Completo",
      excerpt: "Novo resumo",
      hero: "https://cdn.azpetshop.com.br/posts/caes/rottweiler/nova-capa.jpg",
      heroAlt: "Rottweiler no parque",
      contentHtml: "<h1>Rottweiler</h1><p>Um cão <strong>gigante</strong> e leal.</p>",
    });

    const updated = await readPost(dir, "caes", "rottweiler");
    assert.equal(updated.title, "Rottweiler: Guia Completo");
    assert.equal(updated.excerpt, "Novo resumo");
    assert.equal(updated.hero, "https://cdn.azpetshop.com.br/posts/caes/rottweiler/nova-capa.jpg");
    assert.equal(updated.heroAlt, "Rottweiler no parque");
    assert.match(updated.contentHtml, /gigante/);

    const raw = await readFile(path.join(dir, "caes", "rottweiler.mdx"), "utf8");
    const { data } = matter(raw);
    assert.equal(data.category, "caes");
    assert.equal(data.type, "guia");
    assert.deepEqual(data.products, []);
    assert.ok(data.updatedAt, "updatedAt deveria ter sido adicionado");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 3: Rodar os testes e confirmar que falham (módulo não existe ainda)**

Run: `node --test scripts/admin/lib/posts.test.mjs`
Expected: FAIL — erro do tipo `Cannot find module './posts.mjs'`.

- [ ] **Step 4: Implementar `scripts/admin/lib/posts.mjs`**

```js
import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import TurndownService from "turndown";

const turndownService = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });

async function walkMdxFiles(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkMdxFiles(full, base)));
    } else if (entry.isFile() && entry.name.endsWith(".mdx")) {
      files.push(path.relative(base, full).split(path.sep).join("/"));
    }
  }
  return files;
}

function postFilePath(blogDir, category, slug) {
  return path.join(blogDir, category, `${slug}.mdx`);
}

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

export async function readPost(blogDir, category, slug) {
  const raw = await readFile(postFilePath(blogDir, category, slug), "utf8");
  const { data, content } = matter(raw);
  return {
    category,
    slug,
    title: data.title,
    excerpt: data.excerpt,
    hero: data.hero ?? "",
    heroAlt: data.heroAlt ?? "",
    contentHtml: marked.parse(content),
  };
}

export async function writePost(blogDir, category, slug, fields) {
  const filePath = postFilePath(blogDir, category, slug);
  const raw = await readFile(filePath, "utf8");
  const { data } = matter(raw);

  data.title = fields.title;
  data.excerpt = fields.excerpt;
  if (fields.hero) data.hero = fields.hero;
  else delete data.hero;
  if (fields.heroAlt) data.heroAlt = fields.heroAlt;
  else delete data.heroAlt;
  data.updatedAt = new Date().toISOString().slice(0, 10);

  const markdownBody = turndownService.turndown(fields.contentHtml ?? "");
  const output = matter.stringify(markdownBody, data);
  await writeFile(filePath, output, "utf8");
}
```

- [ ] **Step 5: Rodar os testes e confirmar que passam**

Run: `node --test scripts/admin/lib/posts.test.mjs`
Expected: PASS — 4 testes, 0 falhas.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json scripts/admin/lib/posts.mjs scripts/admin/lib/posts.test.mjs
git commit -m "feat(admin): adiciona camada de leitura/escrita dos posts do blog"
```

---

### Task 2: Camada de upload de imagem (`lib/upload.mjs`)

**Files:**
- Create: `scripts/admin/lib/upload.mjs`
- Test: `scripts/admin/lib/upload.test.mjs`

**Interfaces:**
- Produces: `contentTypeFor(ext: string): string | undefined`, `slugify(str: string): string`, `buildKey(category: string, slug: string, filename: string): string`, `buildCdnUrl(key: string): string`, `uploadFile({category, slug, filename, filePath, contentType, execSync?}): string` (retorna a URL do CDN; `execSync` é injetável para testes).
- Consumes: nenhuma dependência de outra task.

- [ ] **Step 1: Escrever o arquivo de testes (falhando)**

Criar `scripts/admin/lib/upload.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { contentTypeFor, slugify, buildKey, buildCdnUrl, uploadFile } from "./upload.mjs";

test("contentTypeFor reconhece extensões suportadas e rejeita as demais", () => {
  assert.equal(contentTypeFor(".jpg"), "image/jpeg");
  assert.equal(contentTypeFor(".PNG"), "image/png");
  assert.equal(contentTypeFor(".bmp"), undefined);
});

test("slugify normaliza acentos e espaços", () => {
  assert.equal(slugify("Ração Premium!"), "racao-premium");
  assert.equal(slugify("  Foto do Rottweiler  "), "foto-do-rottweiler");
});

test("buildKey e buildCdnUrl montam o caminho esperado", () => {
  const key = buildKey("caes", "rottweiler", "hero.jpg");
  assert.equal(key, "posts/caes/rottweiler/hero.jpg");
  assert.equal(buildCdnUrl(key), "https://cdn.azpetshop.com.br/posts/caes/rottweiler/hero.jpg");
});

test("uploadFile monta o comando do wrangler e devolve a URL do CDN", () => {
  const calls = [];
  const fakeExecSync = (cmd, opts) => {
    calls.push({ cmd, opts });
  };
  const url = uploadFile({
    category: "caes",
    slug: "rottweiler",
    filename: "hero.jpg",
    filePath: "/tmp/fake.jpg",
    contentType: "image/jpeg",
    execSync: fakeExecSync,
  });
  assert.equal(url, "https://cdn.azpetshop.com.br/posts/caes/rottweiler/hero.jpg");
  assert.equal(calls.length, 1);
  assert.match(calls[0].cmd, /r2 object put/);
  assert.match(calls[0].cmd, /azpetshop-images\/posts\/caes\/rottweiler\/hero\.jpg/);
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `node --test scripts/admin/lib/upload.test.mjs`
Expected: FAIL — `Cannot find module './upload.mjs'`.

- [ ] **Step 3: Implementar `scripts/admin/lib/upload.mjs`**

```js
import { execSync as defaultExecSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const WRANGLER = join(ROOT, "node_modules", ".bin", process.platform === "win32" ? "wrangler.cmd" : "wrangler");
const BUCKET = "azpetshop-images";
const CDN = "https://cdn.azpetshop.com.br";

const MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

export function contentTypeFor(ext) {
  return MIME[ext.toLowerCase()];
}

export function slugify(str) {
  return str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildKey(category, slug, filename) {
  return `posts/${category}/${slug}/${filename}`;
}

export function buildCdnUrl(key) {
  return `${CDN}/${key}`;
}

export function uploadFile({ category, slug, filename, filePath, contentType, execSync = defaultExecSync }) {
  const key = buildKey(category, slug, filename);
  const quote = (s) => `"${String(s).replace(/"/g, '\\"')}"`;
  const cmd = [
    WRANGLER, "r2", "object", "put", `${BUCKET}/${key}`,
    "--file", filePath, "--content-type", contentType, "--remote", "-y",
  ].map(quote).join(" ");
  execSync(cmd, { cwd: ROOT, stdio: "inherit" });
  return buildCdnUrl(key);
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `node --test scripts/admin/lib/upload.test.mjs`
Expected: PASS — 4 testes, 0 falhas.

- [ ] **Step 5: Commit**

```bash
git add scripts/admin/lib/upload.mjs scripts/admin/lib/upload.test.mjs
git commit -m "feat(admin): adiciona camada de upload de imagem pro R2"
```

---

### Task 3: Servidor Express (`server.mjs`) e rotas da API

**Files:**
- Create: `scripts/admin/server.mjs`
- Modify: `package.json` (novo script `admin` e `test:admin`)

**Interfaces:**
- Consumes: `listPosts`, `readPost`, `writePost` de `./lib/posts.mjs` (Task 1); `uploadFile`, `contentTypeFor`, `slugify` de `./lib/upload.mjs` (Task 2).
- Produces: servidor HTTP em `http://localhost:4500` com as rotas `GET /api/posts`, `GET /api/posts/:category/:slug`, `PUT /api/posts/:category/:slug`, `POST /api/upload`, e serve estáticos de `scripts/admin/public/` (consumido pela Task 4).

- [ ] **Step 1: Instalar as dependências novas**

Run: `npm install --save-dev express multer`
Expected: `express` e `multer` aparecem em `devDependencies`.

- [ ] **Step 2: Adicionar os scripts no `package.json`**

Modificar o bloco `"scripts"` em `package.json` (`package.json:5-12`) adicionando duas linhas:

```json
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "migrate": "node scripts/migrate.mjs",
    "upload-image": "node scripts/upload-image.mjs",
    "generate-types": "wrangler types",
    "admin": "node scripts/admin/server.mjs",
    "test:admin": "node --test scripts/admin/lib"
  },
```

- [ ] **Step 3: Implementar `scripts/admin/server.mjs`**

```js
import express from "express";
import multer from "multer";
import { dirname, join, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFile, unlink } from "node:fs/promises";
import os from "node:os";

import { listPosts, readPost, writePost } from "./lib/posts.mjs";
import { uploadFile, contentTypeFor, slugify } from "./lib/upload.mjs";

const ADMIN_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(ADMIN_DIR, "..", "..");
const BLOG_DIR = join(ROOT, "src", "content", "blog");
const PORT = 4500;

const app = express();
app.use(express.json());
app.use(express.static(join(ADMIN_DIR, "public")));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.get("/api/posts", async (req, res) => {
  try {
    res.json(await listPosts(BLOG_DIR));
  } catch (err) {
    res.status(500).json({ error: String(err.message ?? err) });
  }
});

app.get("/api/posts/:category/:slug", async (req, res) => {
  try {
    res.json(await readPost(BLOG_DIR, req.params.category, req.params.slug));
  } catch (err) {
    if (err.code === "ENOENT") return res.status(404).json({ error: "post não encontrado" });
    res.status(500).json({ error: String(err.message ?? err) });
  }
});

app.put("/api/posts/:category/:slug", async (req, res) => {
  try {
    const { title, excerpt, hero, heroAlt, contentHtml } = req.body;
    await writePost(BLOG_DIR, req.params.category, req.params.slug, { title, excerpt, hero, heroAlt, contentHtml });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === "ENOENT") return res.status(404).json({ error: "post não encontrado" });
    res.status(500).json({ error: String(err.message ?? err) });
  }
});

app.post("/api/upload", upload.single("file"), async (req, res) => {
  const { category, slug, asHero } = req.body;
  if (!category || !slug) return res.status(400).json({ error: "category e slug são obrigatórios" });
  if (!req.file) return res.status(400).json({ error: "nenhum arquivo enviado" });

  const ext = extname(req.file.originalname).toLowerCase();
  const contentType = contentTypeFor(ext);
  if (!contentType) return res.status(400).json({ error: `extensão não suportada: ${ext || "(nenhuma)"}` });

  const filename = asHero === "true" ? `hero${ext}` : `${slugify(basename(req.file.originalname, ext))}${ext}`;
  const tmpPath = join(os.tmpdir(), `azpetshop-upload-${Date.now()}${ext}`);

  try {
    await writeFile(tmpPath, req.file.buffer);
    const url = uploadFile({ category, slug, filename, filePath: tmpPath, contentType });
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: String(err.message ?? err) });
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
});

app.listen(PORT, () => {
  console.log(`Admin do blog rodando em http://localhost:${PORT}`);
});
```

- [ ] **Step 4: Rodar os testes da Task 1 e 2 pra garantir que nada quebrou**

Run: `npm run test:admin`
Expected: PASS — 8 testes no total (4 de `posts.test.mjs` + 4 de `upload.test.mjs`), 0 falhas.

- [ ] **Step 5: Verificação manual das rotas de posts (sem depender do frontend ainda)**

Subir o servidor em um terminal:

Run: `npm run admin`
Expected: imprime `Admin do blog rodando em http://localhost:4500`.

Em outro terminal, com o servidor rodando:

Run: `curl http://localhost:4500/api/posts`
Expected: JSON com array de 109 objetos `{category, slug, title, publishedAt, draft}`.

Run: `curl "http://localhost:4500/api/posts/caes/american-bully"`
Expected: JSON com `title`, `excerpt`, `hero`, `heroAlt`, `contentHtml` (HTML contendo `<h1>American Bully</h1>` e listas `<ul>`/`<li>`).

Encerrar o servidor (Ctrl+C) depois de confirmar.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json scripts/admin/server.mjs
git commit -m "feat(admin): adiciona servidor Express com as rotas da API"
```

---

### Task 4: Frontend (listagem + edição com Quill)

**Files:**
- Create: `scripts/admin/public/style.css`
- Create: `scripts/admin/public/index.html`
- Create: `scripts/admin/public/index.js`
- Create: `scripts/admin/public/edit.html`
- Create: `scripts/admin/public/edit.js`

**Interfaces:**
- Consumes: as rotas `GET /api/posts`, `GET /api/posts/:category/:slug`, `PUT /api/posts/:category/:slug`, `POST /api/upload` produzidas na Task 3.

- [ ] **Step 1: Criar `scripts/admin/public/style.css`**

```css
body {
  font-family: system-ui, sans-serif;
  max-width: 900px;
  margin: 2rem auto;
  padding: 0 1rem;
  color: #1a1a1a;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th, td {
  text-align: left;
  padding: 0.5rem;
  border-bottom: 1px solid #ddd;
}
input[type="text"], textarea {
  width: 100%;
  padding: 0.4rem;
  box-sizing: border-box;
  font-family: inherit;
  font-size: 1rem;
}
label {
  display: block;
  margin-bottom: 0.75rem;
}
button {
  padding: 0.5rem 1rem;
  font-size: 1rem;
  cursor: pointer;
}
#status, #upload-status {
  color: #555;
}
```

- [ ] **Step 2: Criar `scripts/admin/public/index.html`**

```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Admin — AZ Pet Shop Blog</title>
  <link rel="stylesheet" href="/style.css" />
</head>
<body>
  <h1>Posts do blog</h1>
  <p id="status"></p>
  <table>
    <thead>
      <tr><th>Título</th><th>Categoria</th><th>Publicado em</th><th>Rascunho</th></tr>
    </thead>
    <tbody id="posts-body"></tbody>
  </table>
  <script src="/index.js"></script>
</body>
</html>
```

- [ ] **Step 3: Criar `scripts/admin/public/index.js`**

```js
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

async function loadPosts() {
  const statusEl = document.getElementById("status");
  const body = document.getElementById("posts-body");
  try {
    const res = await fetch("/api/posts");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const posts = await res.json();
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
    statusEl.textContent = `${posts.length} posts`;
  } catch (err) {
    statusEl.textContent = `Erro ao carregar posts: ${err.message}`;
  }
}

loadPosts();
```

- [ ] **Step 4: Criar `scripts/admin/public/edit.html`**

```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Editar post — AZ Pet Shop Blog</title>
  <link rel="stylesheet" href="/style.css" />
  <link href="https://cdn.jsdelivr.net/npm/quill@2.0.2/dist/quill.snow.css" rel="stylesheet" />
  <script src="https://cdn.jsdelivr.net/npm/quill@2.0.2/dist/quill.js"></script>
</head>
<body>
  <p><a href="/">&larr; voltar para a lista</a></p>
  <p id="status"></p>
  <form id="edit-form">
    <p>Categoria: <strong id="category-label"></strong> (não editável)</p>
    <label>Título<br /><input type="text" id="title" required /></label>
    <label>Excerpt<br /><textarea id="excerpt" rows="3" required></textarea></label>
    <label>Capa (URL)<br /><input type="text" id="hero" /></label>
    <label>Texto alternativo da capa<br /><input type="text" id="heroAlt" /></label>

    <label>Upload de imagem<br />
      <input type="file" id="image-file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" />
    </label>
    <label><input type="checkbox" id="use-as-hero" /> Usar como capa</label>
    <button type="button" id="upload-btn">Enviar imagem</button>
    <span id="upload-status"></span>

    <div id="editor" style="height: 400px; margin: 1rem 0;"></div>

    <button type="submit">Salvar</button>
  </form>
  <script src="/edit.js"></script>
</body>
</html>
```

- [ ] **Step 5: Criar `scripts/admin/public/edit.js`**

```js
const params = new URLSearchParams(location.search);
const category = params.get("category");
const slug = params.get("slug");

const statusEl = document.getElementById("status");
document.getElementById("category-label").textContent = category ?? "";

const quill = new Quill("#editor", { theme: "snow" });

async function loadPost() {
  try {
    const res = await fetch(`/api/posts/${encodeURIComponent(category)}/${encodeURIComponent(slug)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
    document.getElementById("title").value = data.title ?? "";
    document.getElementById("excerpt").value = data.excerpt ?? "";
    document.getElementById("hero").value = data.hero ?? "";
    document.getElementById("heroAlt").value = data.heroAlt ?? "";
    quill.root.innerHTML = data.contentHtml ?? "";
  } catch (err) {
    statusEl.textContent = `Erro ao carregar post: ${err.message}`;
  }
}

document.getElementById("upload-btn").addEventListener("click", async () => {
  const fileInput = document.getElementById("image-file");
  const uploadStatus = document.getElementById("upload-status");
  if (!fileInput.files[0]) {
    uploadStatus.textContent = "Escolha um arquivo primeiro.";
    return;
  }
  const asHero = document.getElementById("use-as-hero").checked;
  const formData = new FormData();
  formData.append("file", fileInput.files[0]);
  formData.append("category", category);
  formData.append("slug", slug);
  formData.append("asHero", String(asHero));

  uploadStatus.textContent = "Enviando...";
  try {
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
    if (asHero) {
      document.getElementById("hero").value = data.url;
    } else {
      const range = quill.getSelection(true) ?? { index: quill.getLength() };
      quill.insertEmbed(range.index, "image", data.url);
    }
    uploadStatus.textContent = `Upload concluído: ${data.url}`;
  } catch (err) {
    uploadStatus.textContent = `Erro no upload: ${err.message}`;
  }
});

document.getElementById("edit-form").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  statusEl.textContent = "Salvando...";
  try {
    const res = await fetch(`/api/posts/${encodeURIComponent(category)}/${encodeURIComponent(slug)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: document.getElementById("title").value,
        excerpt: document.getElementById("excerpt").value,
        hero: document.getElementById("hero").value,
        heroAlt: document.getElementById("heroAlt").value,
        contentHtml: quill.root.innerHTML,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
    statusEl.textContent = "Salvo com sucesso.";
  } catch (err) {
    statusEl.textContent = `Erro ao salvar: ${err.message}`;
  }
});

loadPost();
```

- [ ] **Step 6: Verificação manual no navegador**

Run: `npm run admin`
Abrir `http://localhost:4500` no navegador.
Expected: tabela com 109 posts, cada título é um link.

Clicar em um post.
Expected: formulário carrega título/excerpt/capa preenchidos e o corpo do artigo aparece formatado dentro do editor Quill (títulos, listas, negrito visíveis).

Editar um trecho do texto no Quill, alterar o título, clicar em "Salvar".
Expected: mensagem "Salvo com sucesso." aparece.

Run: `git diff -- src/content/blog` (em outro terminal, com o servidor ainda rodando ou depois de parar)
Expected: diff mostra a mudança feita no título e no texto, mantendo o restante do frontmatter intacto.

Reverter a mudança de teste (não é pra ficar commitado um post alterado só de teste):

Run: `git checkout -- src/content/blog`

Encerrar o servidor (Ctrl+C).

- [ ] **Step 7: Commit**

```bash
git add scripts/admin/public
git commit -m "feat(admin): adiciona frontend de listagem e edição com Quill"
```

---

### Task 5: Verificação end-to-end (upload real de imagem + render no site)

**Files:** nenhum arquivo novo — apenas verificação manual conforme a seção "Verificação" da spec (`docs/superpowers/specs/2026-07-19-admin-backend-design.md`).

**Interfaces:** nenhuma — task de validação final, não produz código consumido por outra task.

- [ ] **Step 1: Subir o painel**

Run: `npm run admin`
Expected: `Admin do blog rodando em http://localhost:4500`.

- [ ] **Step 2: Testar upload real de imagem**

Abrir um post no navegador (`http://localhost:4500/edit.html?category=caes&slug=american-bully`), escolher um arquivo de imagem local, marcar "Usar como capa" e clicar em "Enviar imagem".
Expected: campo "Capa (URL)" é preenchido com uma URL `https://cdn.azpetshop.com.br/posts/caes/american-bully/hero.<ext>`.

Run: `curl -I "https://cdn.azpetshop.com.br/posts/caes/american-bully/hero.<ext>"` (substituir `<ext>` pela extensão usada)
Expected: `HTTP/2 200`.

Se o teste de upload não for pra ficar valendo (post de exemplo), reverter com `git checkout -- src/content/blog/caes/american-bully.mdx` e apagar o objeto de teste do R2 com `node scripts/upload-image.mjs` não remove — usar `npx wrangler r2 object delete azpetshop-images/posts/caes/american-bully/hero.<ext> --remote` se quiser limpar o bucket.

- [ ] **Step 3: Conferir a renderização real do post editado**

Run: `npm run dev`
Abrir `http://localhost:4321/blog/caes/american-bully` (ou outro post editado durante os testes anteriores).
Expected: o post renderiza normalmente, com o texto e a capa atualizados, sem HTML quebrado nem tags visíveis cruas na página.

Encerrar `npm run dev` (Ctrl+C).

- [ ] **Step 4: Rodar toda a suíte de testes automatizados uma última vez**

Run: `npm run test:admin`
Expected: PASS — 8 testes, 0 falhas.

- [ ] **Step 5: Revisar o estado do git antes de finalizar**

Run: `git status`
Expected: sem alterações pendentes em `src/content/blog` (qualquer post usado como cobaia nos testes manuais foi revertido); apenas os arquivos de `scripts/admin/` e `package.json`/`package-lock.json` já commitados nas tasks anteriores.
