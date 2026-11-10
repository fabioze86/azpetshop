// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";

import cloudflare from "@astrojs/cloudflare";

// IMPORTANTE: troque para o domínio final antes de publicar.
// Ele alimenta o sitemap, o RSS e as URLs canônicas.
//
// Tailwind v4 está configurado via PostCSS (postcss.config.mjs), não via
// plugin Vite — o @tailwindcss/vite ainda não é compatível com o bundler
// "rolldown-vite" que o Astro 6 usa por padrão (bug conhecido, abr/2026:
// github.com/withastro/astro/issues/16542).
export default defineConfig({
  site: "https://www.azpetshop.com.br",
  trailingSlash: "always",
  // A raiz de www.azpetshop.com.br é a loja (Next, na Vercel), que repassa /blog
  // a este Worker. A home do blog vive em /blog/; a raiz do Worker só redireciona.
  redirects: { "/": "/blog/" },
  integrations: [mdx(), sitemap({ filter: (page) => page !== "https://www.azpetshop.com.br/" })],
  // As imagens do blog ficam no R2 (bucket azpetshop-images, servido em
  // cdn.azpetshop.com.br) e são enviadas por scripts/upload-image.mjs via wrangler;
  // o Worker não precisa de binding de storage. O nome customizado só evita que o
  // adapter crie um binding "IMAGES" de Cloudflare Images (pago) por padrão.
  adapter: cloudflare({ imagesBindingName: "ASTRO_IMAGES_SERVICE" }),
});