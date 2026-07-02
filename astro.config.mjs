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
  integrations: [mdx(), sitemap()],
  adapter: cloudflare(),
});