# AZ Pet Shop — portal de conteúdo/afiliado (Astro)

Site estático em Astro 5 + Tailwind v4, no estilo editorial Wirecutter, com a
identidade da marca AZ Pet Shop. Sem carrinho: a conversão sai por link de
afiliado e por links para o atacado (mypetbrasil).

## Rodar localmente

```bash
npm install
npm run dev        # http://localhost:4321
```

Abra o projeto no Cursor ou VS Code. É aqui que você edita tudo.

## Estrutura

```
src/
  content/blog/<categoria>/<slug>.mdx   <- cada post (a URL espelha o caminho)
  content.config.ts                     <- schema do post (guia | roundup, products[])
  components/   Header, Footer, ArticleCard, PickBox, ComparisonTable, AffiliateButton
  layouts/      BaseLayout (SEO, fontes Nunito, canonical)
  pages/        index, blog/, blog/[category]/, blog/[category]/[slug]
  styles/global.css                     <- tokens da marca (@theme do Tailwind v4)
  lib/categories.ts                     <- labels e categorias existentes
scripts/migrate.mjs                     <- importa os 109 posts do MKX
public/_redirects                       <- redirects das rotas antigas da loja
```

URL preservada: um arquivo em `src/content/blog/caes/petiscos-saudaveis.mdx`
gera exatamente `/blog/caes/petiscos-saudaveis` — igual ao site atual.

## Migrar os 109 posts

```bash
LIMIT=1 node scripts/migrate.mjs   # testa com 1 post primeiro
```

Confira o `.mdx` gerado. Se o corpo vier errado/vazio, ajuste `CONTENT_SELECTOR`
no topo do `scripts/migrate.mjs` (inspecione um artigo no DevTools e use a classe
do container do texto). Depois rode tudo:

```bash
node scripts/migrate.mjs
```

Os posts marcados como `type: "roundup"` (ex.: "5 melhores antipulgas") precisam
ter o `products[]` preenchido à mão no frontmatter, com os links de afiliado
(Amazon `?tag=azpetshop-20`, etc.) — é o que alimenta a tabela e os boxes "Nossa
escolha". Veja o exemplo em `src/content/blog/caes/melhores-antipulgas-cachorros.mdx`.

## Publicar (Cloudflare Pages)

1. Suba pro GitHub:
   ```bash
   git init && git add -A && git commit -m "init azpetshop"
   git branch -M main && git remote add origin <seu-repo> && git push -u origin main
   ```
2. Cloudflare Pages → Create application → Connect to Git → selecione o repo.
   - Build command: `npm run build`
   - Output directory: `dist`
3. Aponte `azpetshop.com.br` para o projeto Pages. A partir daí, todo `git push`
   publica sozinho.

## Antes de publicar

- Em `astro.config.mjs`, confirme `site` com o domínio final (alimenta sitemap e canonical).
- Preencha `public/_redirects` com as rotas antigas da LOJA (que sai do ar) → 301
  para o conteúdo ou para o mypetbrasil. As URLs do blog já são preservadas.
- Troque os links de afiliado de exemplo pelos reais.
