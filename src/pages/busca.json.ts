import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { labelFor } from "../lib/categories";

// Índice estático consumido pela página /busca/. Gerado no build — inclui só
// metadados + subtítulos (h2/h3) para manter o JSON leve.
export const prerender = true;

export const GET: APIRoute = async () => {
  const posts = (await getCollection("blog", ({ data }) => !data.draft)).sort(
    (a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf(),
  );

  const index = posts.map((p) => ({
    url: `/blog/${p.id}/`,
    title: p.data.title,
    excerpt: p.data.excerpt,
    category: labelFor(p.data.category),
    type: p.data.type,
    hero: p.data.hero ?? null,
    headings: [...(p.body ?? "").matchAll(/^#{2,3}\s+(.+)$/gm)].map((m) => m[1].replace(/[\\*_`]/g, "").trim()),
    products: p.data.products.map((pr) => pr.name),
  }));

  return new Response(JSON.stringify(index), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};
