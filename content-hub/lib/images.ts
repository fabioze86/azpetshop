import { slugify } from "./slug.ts";

export function cdnImageUrl(categoria: string, slug: string, produtoNome: string): string {
  return `https://cdn.azpetshop.com.br/posts/${categoria}/${slug}/${slugify(produtoNome)}.jpg`;
}
