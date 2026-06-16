// scripts/migrate.mjs
// Migra os posts do blog antigo (MKX) para arquivos .mdx do Astro,
// PRESERVANDO a URL: /blog/<categoria>/<slug> -> src/content/blog/<categoria>/<slug>.mdx
//
// Como usar (na sua máquina, NÃO no sandbox):
//   npm install
//   node scripts/migrate.mjs
//
// Requisitos: Node 18+ (tem fetch nativo). Usa cheerio + turndown.
//
// Estratégia:
//   1. Varre as páginas de listagem (/blog, /blog/pagina-2/ ...) e coleta os links de artigo.
//   2. Para cada artigo, extrai título, descrição, imagem de capa, data e o CORPO.
//   3. Converte o corpo HTML -> Markdown e grava o .mdx com frontmatter.
//
// IMPORTANTE: o seletor do corpo (CONTENT_SELECTOR) é a parte que depende do tema MKX.
// Rode primeiro com LIMIT=1, confira o .mdx gerado e ajuste o seletor se precisar
// (instruções logo abaixo).

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";
import TurndownService from "turndown";

const BASE = "https://www.azpetshop.com.br";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "content", "blog");
const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : Infinity; // ex.: LIMIT=1 node scripts/migrate.mjs

// Quantas páginas de listagem varrer (o site mostra "1..8" + »).
const MAX_LISTING_PAGES = 10;

// Onde o corpo do artigo vive no HTML do MKX. AJUSTE se o output sair errado.
// Candidatos comuns: ".materia", ".noticia", ".blog-content", "#conteudo", "article".
const CONTENT_SELECTOR = ".materia, .noticia-conteudo, article, .blog-post, #conteudo-noticia";

const td = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });

const slugify = (s) =>
  s.toString().toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

async function getHtml(url) {
  const res = await fetch(url, { headers: { "User-Agent": "azpetshop-migrator" } });
  if (!res.ok) throw new Error(`${res.status} em ${url}`);
  return res.text();
}

// 1) Coleta todos os links de artigo das páginas de listagem
async function collectArticleLinks() {
  const links = new Set();
  for (let page = 1; page <= MAX_LISTING_PAGES; page++) {
    const url = page === 1 ? `${BASE}/blog` : `${BASE}/blog/pagina-${page}/`;
    let html;
    try {
      html = await getHtml(url);
    } catch {
      break; // acabou a paginação
    }
    const $ = cheerio.load(html);
    let found = 0;
    $('a[href*="/blog/"]').each((_, el) => {
      const href = $(el).attr("href") || "";
      // só /blog/<categoria>/<slug> (3 segmentos), ignorando paginação/listagem
      const m = href.match(/\/blog\/([a-z0-9-]+)\/([a-z0-9-]+)\/?$/i);
      if (m && !href.includes("/pagina-")) {
        links.add(`${BASE}/blog/${m[1]}/${m[2]}`);
        found++;
      }
    });
    console.log(`Listagem ${url}: ${found} links`);
    if (found === 0 && page > 1) break;
  }
  return [...links];
}

// 2) Extrai um artigo
async function parseArticle(url) {
  const html = await getHtml(url);
  const $ = cheerio.load(html);

  const seg = url.replace(`${BASE}/blog/`, "").replace(/\/$/, "").split("/");
  const category = seg[0];
  const slug = seg[1];

  const meta = (p) => $(`meta[property="${p}"]`).attr("content") || "";
  let title = (meta("og:title") || $("title").text())
    .replace(/\s*-\s*Blog\s*-\s*AZ ?PetShop\s*$/i, "")
    .replace(/^AZ Pet ?Shop\s*/i, "")
    .trim();
  const excerpt = meta("og:description") || $('meta[name="description"]').attr("content") || "";
  const hero = meta("og:image") || $('img[src*="/img/news/"]').first().attr("src") || "";

  // Corpo do artigo
  let $body = $(CONTENT_SELECTOR).first();
  if (!$body || $body.length === 0) {
    // Fallback: pega o maior bloco de <p> da página
    let best = null, bestLen = 0;
    $("div, section, article").each((_, el) => {
      const len = $(el).find("p").text().length;
      if (len > bestLen) { bestLen = len; best = el; }
    });
    $body = best ? $(best) : $("body");
  }

  // Limpeza: remove blocos de "Você pode gostar", newsletter, redes, scripts
  $body.find("script, style, form, .newsletter, .relacionados, .voce-pode-gostar").remove();
  $body.find('a[href*="instagram"], a[href*="facebook"], a[href*="youtube"]').closest("ul").remove();

  // Remove a seção "Você pode gostar de ver também" em diante, se existir como heading
  $body.find("h2, h3, h4").each((_, el) => {
    if (/voc[eê] pode gostar/i.test($(el).text())) {
      $(el).nextAll().remove();
      $(el).remove();
    }
  });

  const bodyHtml = $body.html() || "";
  let markdown = td.turndown(bodyHtml).trim();

  // Remove o H1/H2 do título duplicado e a descrição repetida no topo
  markdown = markdown.replace(/^#{1,3}\s+.*\n/, "").trim();

  const type = /melhor|melhores|top \d|comparativo|vs\b/i.test(title) ? "roundup" : "guia";

  return { category, slug, title, excerpt, hero, type, markdown };
}

function toMdx(a) {
  const fm = [
    "---",
    `title: ${JSON.stringify(a.title)}`,
    `excerpt: ${JSON.stringify(a.excerpt)}`,
    `category: ${JSON.stringify(a.category)}`,
    `type: ${JSON.stringify(a.type)}`,
    a.hero ? `hero: ${JSON.stringify(a.hero)}` : null,
    `publishedAt: ${new Date().toISOString().slice(0, 10)}`,
    `author: "Equipe AZ Pet Shop"`,
    // type roundup: depois da migração, preencha products[] manualmente com os links de afiliado.
    "---",
    "",
  ].filter(Boolean).join("\n");
  return fm + a.markdown + "\n";
}

async function main() {
  console.log("Coletando links...");
  const links = await collectArticleLinks();
  console.log(`Total de artigos encontrados: ${links.length}`);

  let ok = 0, fail = 0;
  for (const url of links.slice(0, LIMIT)) {
    try {
      const a = await parseArticle(url);
      const dir = join(OUT, a.category);
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, `${a.slug}.mdx`), toMdx(a), "utf8");
      console.log(`✓ ${a.category}/${a.slug}`);
      ok++;
    } catch (e) {
      console.warn(`✗ ${url} -> ${e.message}`);
      fail++;
    }
  }
  console.log(`\nPronto. ${ok} migrados, ${fail} falhas.`);
  console.log("Revise os .mdx em src/content/blog/ — especialmente os 'roundup' (preencher products[]).");
}

main();
