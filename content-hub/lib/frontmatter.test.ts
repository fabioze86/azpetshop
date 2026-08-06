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
      price: "R$ 150 a R$ 190",
      badge: "Melhor custo-benefício",
    },
  ]);
});

test("buildProducts popula image a partir do array de imagens, casando por nome", () => {
  const imagens = [{ nome: "Ração X", url: "https://cdn.azpetshop.com.br/posts/caes/x/racao-x.jpg" }];
  const produtos = buildProducts(selecionados, dossies, imagens);
  assert.equal(produtos[0].image, "https://cdn.azpetshop.com.br/posts/caes/x/racao-x.jpg");
  assert.equal(produtos[0].price, "R$ 150 a R$ 190");
  assert.equal(produtos[0].badge, "Melhor custo-benefício");
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
    imagens: [{ nome: "Ração X", url: "https://cdn.azpetshop.com.br/posts/caes/x/racao-x.jpg" }],
  });

  assert.equal(fm.category, "caes");
  assert.equal(fm.type, "roundup");
  assert.equal(fm.draft, true);
  assert.equal(fm.author, "Equipe AZ Pet Shop");
  assert.equal(fm.publishedAt, publishedAt);
  assert.equal((fm.products as unknown[]).length, 1);
  assert.equal((fm.products as { image?: string }[])[0].image, "https://cdn.azpetshop.com.br/posts/caes/x/racao-x.jpg");
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
