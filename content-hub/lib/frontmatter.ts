import matter from "gray-matter";
import type { Selecionado, Dossie } from "./schemas.ts";

export interface BlogProduct {
  name: string;
  affiliateUrl: string;
  pros: string[];
  cons: string[];
  verdict?: string;
  image?: string;
  price?: string;
  badge?: string;
}

export interface ProductImagem {
  nome: string;
  url: string;
}

export function buildProducts(produtos: Selecionado[], dossies: Dossie[], imagens: ProductImagem[] = []): BlogProduct[] {
  return produtos.map((p) => {
    const dossie = dossies.find((d) => d.nome === p.nome);
    const imagem = imagens.find((i) => i.nome === p.nome);
    const produto: BlogProduct = {
      name: p.nome,
      affiliateUrl: p.linkAfiliado,
      pros: dossie?.pros ?? [],
      cons: dossie?.contras ?? [],
      verdict: p.angulo,
      badge: p.angulo,
    };
    if (imagem?.url !== undefined) {
      produto.image = imagem.url;
    }
    if (dossie?.faixaPreco !== undefined) {
      produto.price = dossie.faixaPreco;
    }
    return produto;
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
  imagens?: ProductImagem[];
}

export function buildFrontmatter(input: FrontmatterInput): Record<string, unknown> {
  const frontmatter: Record<string, unknown> = {
    title: input.title,
    excerpt: input.excerpt,
    category: input.categoria,
    type: "roundup",
    publishedAt: input.publishedAt,
    author: "Equipe AZ Pet Shop",
    draft: true,
    products: buildProducts(input.produtos, input.dossies, input.imagens ?? []),
  };
  if (input.hero !== undefined) {
    frontmatter.hero = input.hero;
  }
  return frontmatter;
}

export function assembleMdx(frontmatter: Record<string, unknown>, body: string): string {
  return matter.stringify(body.trim() + "\n", frontmatter);
}
