import { getCollection } from "astro:content";

export const CATEGORY_LABELS: Record<string, string> = {
  caes: "Cães",
  gatos: "Gatos",
  passaros: "Pássaros",
  roedores: "Roedores",
  hamster: "Roedores",
  peixes: "Peixes",
};

// Categoria equivalente na loja (www.azpetshop.com.br/categoria/<slug>).
// Categorias sem equivalente (ex.: "home") não ganham link.
const STORE_CATEGORY: Record<string, string> = {
  caes: "caes",
  gatos: "gatos",
  passaros: "passaros",
  roedores: "roedores",
  hamster: "roedores",
  peixes: "aquarismo",
};

export const STORE_URL = "https://www.azpetshop.com.br/";

export function storeCategoryUrl(cat: string): string | null {
  const slug = STORE_CATEGORY[cat];
  return slug ? `${STORE_URL}categoria/${slug}` : null;
}

export function labelFor(cat: string): string {
  return CATEGORY_LABELS[cat] ?? cat.charAt(0).toUpperCase() + cat.slice(1);
}

// Categorias que realmente existem no conteúdo (gera nav e páginas sem 404).
export async function existingCategories(): Promise<string[]> {
  const posts = await getCollection("blog", ({ data }) => !data.draft);
  return [...new Set(posts.map((p) => p.data.category))].sort();
}
