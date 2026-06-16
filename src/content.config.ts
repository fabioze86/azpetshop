import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  // Lê src/content/blog/<categoria>/<slug>.mdx
  // O id vira "caes/petiscos-saudaveis" -> rota /blog/caes/petiscos-saudaveis
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    excerpt: z.string(),
    // String livre (não enum) para preservar QUALQUER categoria existente nos
    // 109 posts, inclusive casos como "hamster" -> mantém a URL idêntica.
    category: z.string(),
    // "guia" = conteúdo educacional (raça, cuidado); "roundup" = comparativo comercial
    type: z.enum(["guia", "roundup"]).default("guia"),
    hero: z.string().optional(), // caminho da imagem de capa
    heroAlt: z.string().optional(),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    author: z.string().default("Equipe AZ Pet Shop"),
    draft: z.boolean().default(false),
    // Produtos recomendados (alimentam os blocos "Nossa escolha" e a tabela)
    products: z
      .array(
        z.object({
          name: z.string(),
          image: z.string().optional(),
          affiliateUrl: z.string().url(),
          price: z.string().optional(),
          badge: z.string().optional(), // ex.: "Nossa escolha", "Melhor custo-benefício"
          pros: z.array(z.string()).default([]),
          cons: z.array(z.string()).default([]),
          verdict: z.string().optional(),
        }),
      )
      .default([]),
  }),
});

export const collections = { blog };
