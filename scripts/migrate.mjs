// scripts/migrate.mjs — v3
// Migra os posts do blog MKX para arquivos .mdx do Astro,
// PRESERVANDO a URL: /blog/<categoria>/<slug> -> src/content/blog/<categoria>/<slug>.mdx
//
// PowerShell:
//   $env:LIMIT="1"; node scripts/migrate.mjs    <- 1 post de teste
//   node scripts/migrate.mjs                    <- todos os 109

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";
import TurndownService from "turndown";

const BASE  = "https://www.azpetshop.com.br";
const OUT   = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "content", "blog");
const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : Infinity;
const MAX_LISTING_PAGES = 12;

const td = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });

async function getHtml(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "azpetshop-migrator/3.0" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// ─── 1. Coleta links ────────────────────────────────────────────────────────
async function collectArticleLinks() {
  const links = new Set();
  for (let page = 1; page <= MAX_LISTING_PAGES; page++) {
    const url = page === 1 ? `${BASE}/blog` : `${BASE}/blog/pagina-${page}/`;
    let html;
    try { html = await getHtml(url); } catch { break; }

    const $ = cheerio.load(html);
    let found = 0;
    $('a[href*="/blog/"]').each((_, el) => {
      const href = $(el).attr("href") || "";
      if (/\/blog\/[a-z0-9-]+\/[a-z0-9-]+\/?$/i.test(href) && !href.includes("/pagina-")) {
        const clean = href.replace(/\/$/, "").replace(/^https?:\/\/[^/]+/, "");
        links.add(`${BASE}${clean}`);
        found++;
      }
    });
    console.log(`  listagem p${page}: ${found} links`);
    if (found === 0 && page > 1) break;
  }
  return [...links];
}

// ─── 2. Extrai um artigo ─────────────────────────────────────────────────────
async function parseArticle(url) {
  const html = await getHtml(url);
  const $ = cheerio.load(html);

  // category e slug da URL
  const seg = url.replace(`${BASE}/blog/`, "").replace(/\/$/, "").split("/");
  const category = seg[0];
  const slug     = seg[1];

  // Meta tags
  const og   = (p) => $(`meta[property="${p}"]`).attr("content") || "";
  const name  = (n) => $(`meta[name="${n}"]`).attr("content") || "";
  const title  = (og("og:title") || $("title").text())
    .replace(/\s*[-–|]\s*Blog\s*[-–|]?\s*AZ ?Pet ?Sho?p?\s*$/i, "")
    .replace(/^AZ Pet ?Sho?p?\s*[-–|]?\s*/i, "")
    .trim();
  const excerpt = og("og:description") || name("description") || "";
  const hero    = og("og:image") || $('img[src*="/img/news/"]').first().attr("src") || "";

  // ── LIMPEZA HTML (reduz ruído antes de converter) ────────────────────────
  $("script, style, form, noscript, iframe").remove();
  $("header, footer, nav, aside").remove();
  [
    "menu", "cookie", "lgpd", "popup",
    "sidebar", "widget", "breadcrumb",
    "share", "social", "newsletter",
    "relacionados", "banner-desconto",
  ].forEach((t) => $(`[class*="${t}"], [id*="${t}"]`).remove());
  $('img[src*="/img/blog/"], img[src*="/img/logo"]').remove();

  // ── CONVERSÃO para Markdown bruto ────────────────────────────────────────
  let md = td.turndown($("body").html() || "").trim();

  // ══════════════════════════════════════════════════════════════════════════
  // PÓS-PROCESSAMENTO DO MARKDOWN — abordagem mais confiável que DOM para
  // os padrões específicos do MKX

  // 1. Corta o TOPO: remove tudo até (e incluindo) a hero image
  //    A hero no MKX tem URL no padrão /img/news/<id>/000.webp
  const heroPattern = /!\[.*?\]\(https?:\/\/[^)]*\/img\/news\/[^)]+\)/;
  const heroMatch   = heroPattern.exec(md);
  if (heroMatch) {
    // Pega tudo após a linha da hero image
    md = md.slice(heroMatch.index + heroMatch[0].length).trim();
  } else {
    // Fallback: remove blocos de texto de cookie e links de redes sociais do topo
    md = md
      .replace(/^Nós usamos cookies[\s\S]*?Prosseguir\s*\n+/i, "")
      .replace(/^(\*\s*\[(?:Instagram|Facebook|Youtube|Twitter|Tiktok)[^\]]*\]\([^)]*\)\s*\n*)+/im, "")
      .trim();
  }

  // 2. Remove o excerpt duplicado logo no topo do corpo
  //    (já está no frontmatter, não precisa repetir no artigo)
  if (excerpt) {
    const excerptStart = excerpt.slice(0, 50).trim();
    if (md.startsWith(excerptStart)) {
      const firstBreak = md.indexOf("\n\n");
      md = firstBreak !== -1 ? md.slice(firstBreak).trim() : md;
    }
  }

  // 3. Corta o RODAPÉ e artigos relacionados
  //    Padrões que marcam o fim do conteúdo real no MKX:
  const bottomCuts = [
    /\n+\*\s*\[Instagram\]\(https?:\/\/(www\.)?instagram/i,   // redes sociais repetidas
    /\n+#{1,5}\s*Você pode gostar/i,                           // seção de relacionados
    /\n+#{1,4}\s*Ganhe Agora/i,                                // banner de desconto
    /\n+#{1,4}\s*O pet shop online/i,                          // rodapé institucional
    /\n+#{1,4}\s*AZ Pet ?Shop\s*\n(?!.*artigo|.*guia)/i,       // rodapé (não heading de artigo)
    /\n+© \d{4}/,                                              // copyright
    /\nGRUPO AZ COMERCIAL/i,
    /\nDesenvolvido por/i,
  ];
  for (const pat of bottomCuts) {
    const idx = md.search(pat);
    if (idx > 100) { md = md.slice(0, idx).trim(); break; }
  }

  // 4. Remove artefatos menores restantes
  md = md
    .replace(/^(caes|gatos|passaros|roedores|hamster|pássaros)\s*\n+/im, "")
    .replace(/^Por:\s*.+\n+/im, "")
    .replace(/^\d+ min\.? de leitura\s*\n+/im, "")
    .replace(/^#{1,2}\s+.+\n+/, "")  // H1/H2 de título duplicado
    .trim();

  // ══════════════════════════════════════════════════════════════════════════

  const type = /melhor|melhores|top \d|comparativo|vs\b/i.test(title) ? "roundup" : "guia";
  return { category, slug, title, excerpt, hero, type, markdown: md };
}

// ─── 3. Escreve o .mdx ──────────────────────────────────────────────────────
function toMdx({ title, excerpt, category, type, hero, markdown }) {
  const lines = [
    "---",
    `title: ${JSON.stringify(title)}`,
    `excerpt: ${JSON.stringify(excerpt)}`,
    `category: ${JSON.stringify(category)}`,
    `type: ${JSON.stringify(type)}`,
    hero ? `hero: ${JSON.stringify(hero)}` : null,
    `publishedAt: ${new Date().toISOString().slice(0, 10)}`,
    `author: "Equipe AZ Pet Shop"`,
    "---",
    "",
    markdown,
    "",
  ].filter((l) => l !== null);
  return lines.join("\n");
}

// ─── 4. Main ────────────────────────────────────────────────────────────────
async function main() {
  console.log("Coletando links do blog...");
  const links = await collectArticleLinks();
  console.log(`\nTotal encontrado: ${links.length} artigos`);
  console.log(`Migrando: ${LIMIT === Infinity ? "todos" : LIMIT}\n`);

  let ok = 0, fail = 0;
  for (const url of links.slice(0, LIMIT)) {
    try {
      const article = await parseArticle(url);
      const dir = join(OUT, article.category);
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, `${article.slug}.mdx`), toMdx(article), "utf8");
      console.log(`✓  ${article.category}/${article.slug}`);
      ok++;
    } catch (e) {
      console.warn(`✗  ${url}\n   ${e.message}`);
      fail++;
    }
  }

  console.log(`\n─────────────────────────────────`);
  console.log(`Concluído: ${ok} ok, ${fail} falhas`);
  if (ok > 0) {
    console.log(`\nPróximos passos:`);
    console.log(`  1. npm run dev  →  confira no navegador`);
    console.log(`  2. git add -A && git commit -m "migração 109 posts" && git push`);
  }
}

main();
