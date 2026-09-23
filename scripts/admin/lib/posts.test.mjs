import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import matter from "gray-matter";
import { listPosts, readPost, writePost, stripDuplicateH1 } from "./posts.mjs";

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

test("stripDuplicateH1 remove o H1 do corpo quando é igual ao título", () => {
  const markdown = "# Rottweiler\n\nUm cão forte e leal.\n";
  assert.equal(stripDuplicateH1(markdown), "Um cão forte e leal.\n");
});

test("stripDuplicateH1 remove o H1 do corpo mesmo quando o texto é diferente do título (abreviado)", () => {
  // Caso real encontrado na auditoria: title completo no frontmatter, mas o H1
  // do corpo usa um texto abreviado. O layout do site já renderiza seu próprio
  // <h1> a partir do frontmatter, então qualquer H1 na primeira linha do corpo
  // duplica o heading, independente do texto bater com o título.
  const markdown = "# American Bully\n\nConteúdo sobre a raça.\n";
  assert.equal(stripDuplicateH1(markdown), "Conteúdo sobre a raça.\n");
});

test("stripDuplicateH1 mantém o corpo intacto quando a primeira linha não é um H1", () => {
  const markdown = "Conteúdo sem heading no início.\n\n## Subtítulo\n";
  assert.equal(stripDuplicateH1(markdown), markdown);
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

test("listPosts sinaliza h1-duplicado mesmo quando o H1 do corpo tem texto diferente (abreviado) do título", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "azpetshop-posts-test-"));
  try {
    await mkdir(path.join(dir, "caes"), { recursive: true });
    await writeFile(
      path.join(dir, "caes", "american-bully.mdx"),
      `---
title: "American Bully: Características e Informações sobre a Raça"
excerpt: "Tudo sobre a raça American Bully, temperamento e cuidados"
category: "caes"
type: "guia"
hero: "https://cdn.azpetshop.com.br/posts/caes/american-bully/hero.jpg"
heroAlt: "American Bully deitado no jardim"
publishedAt: 2026-01-10
author: "Equipe AZ Pet Shop"
draft: false
products: []
---

# American Bully

Conteúdo sobre a raça.
`,
      "utf8",
    );
    const posts = await listPosts(dir);
    assert.equal(posts.length, 1);
    assert.ok(posts[0].seoFlags.includes("h1-duplicado"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
