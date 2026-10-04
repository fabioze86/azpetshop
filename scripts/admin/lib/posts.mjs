import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import TurndownService from "turndown";

const turndownService = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });

const SITE_TITLE_SUFFIX = " — AZ Pet Shop";
const EXCERPT_MIN = 70;
const EXCERPT_MAX = 160;

const H1_PATTERN = /^#\s+/;

/**
 * Localiza o índice (na lista de linhas do corpo) do H1 duplicado, se houver.
 *
 * Padrões reconhecidos:
 *  - H1 já na primeira linha não-branca do corpo (caso legado).
 *  - Uma única linha de abertura (texto solto, não heading) seguida de
 *    linhas em branco e então um H1 — padrão real encontrado na maioria dos
 *    posts do blog, onde o H1 duplica o <h1> renderizado pelo layout a
 *    partir do frontmatter.
 *
 * Retorna o índice da linha do H1 em `lines`, ou -1 se nenhum padrão bater.
 */
function findDuplicateH1LineIndex(lines) {
  let i = 0;
  while (i < lines.length && lines[i].trim() === "") i++;
  if (i >= lines.length) return -1;

  if (H1_PATTERN.test(lines[i].trim())) {
    return i;
  }

  // Linha de abertura (texto comum, não heading): pula ela e as linhas em
  // branco seguintes, e verifica se o que vem depois é um H1.
  i++;
  while (i < lines.length && lines[i].trim() === "") i++;
  if (i < lines.length && H1_PATTERN.test(lines[i].trim())) {
    return i;
  }

  return -1;
}

export function stripDuplicateH1(markdown) {
  const lines = markdown.split("\n");
  const h1Index = findDuplicateH1LineIndex(lines);
  if (h1Index === -1) return markdown;

  let end = h1Index + 1;
  while (end < lines.length && lines[end].trim() === "") end++;

  return [...lines.slice(0, h1Index), ...lines.slice(end)].join("\n");
}

function computeSeoFlags(data, content) {
  const flags = [];
  if (!data.hero) flags.push("hero-ausente");
  if (data.hero && !data.heroAlt) flags.push("sem-alt-da-capa");
  if (((data.title ?? "").length + SITE_TITLE_SUFFIX.length) > 60) flags.push("titulo-longo");
  const excerptLen = (data.excerpt ?? "").length;
  if (excerptLen < EXCERPT_MIN || excerptLen > EXCERPT_MAX) flags.push("excerpt-fora-do-range");
  if (findDuplicateH1LineIndex(content.split("\n")) !== -1) flags.push("h1-duplicado");
  return flags;
}

async function walkMdxFiles(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkMdxFiles(full, base)));
    } else if (entry.isFile() && entry.name.endsWith(".mdx")) {
      files.push(path.relative(base, full).split(path.sep).join("/"));
    }
  }
  return files;
}

function postFilePath(blogDir, category, slug) {
  return path.join(blogDir, category, `${slug}.mdx`);
}

export async function listPosts(blogDir) {
  const relPaths = await walkMdxFiles(blogDir);
  const posts = await Promise.all(
    relPaths.map(async (relPath) => {
      const [category, ...slugParts] = relPath.replace(/\.mdx$/, "").split("/");
      const raw = await readFile(path.join(blogDir, relPath), "utf8");
      const { data, content } = matter(raw);
      return {
        category,
        slug: slugParts.join("/"),
        title: data.title,
        publishedAt: data.publishedAt,
        draft: Boolean(data.draft),
        seoFlags: computeSeoFlags(data, content),
      };
    }),
  );
  posts.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  return posts;
}

export async function readPost(blogDir, category, slug) {
  const raw = await readFile(postFilePath(blogDir, category, slug), "utf8");
  const { data, content } = matter(raw);
  return {
    category,
    slug,
    title: data.title,
    excerpt: data.excerpt,
    hero: data.hero ?? "",
    heroAlt: data.heroAlt ?? "",
    contentHtml: marked.parse(content),
  };
}

export async function writePost(blogDir, category, slug, fields) {
  const filePath = postFilePath(blogDir, category, slug);
  const raw = await readFile(filePath, "utf8");
  const { data } = matter(raw);

  data.title = fields.title;
  data.excerpt = fields.excerpt;
  if (fields.hero) data.hero = fields.hero;
  else delete data.hero;
  if (fields.heroAlt) data.heroAlt = fields.heroAlt;
  else delete data.heroAlt;
  data.updatedAt = new Date().toISOString().slice(0, 10);

  const markdownBody = stripDuplicateH1(turndownService.turndown(fields.contentHtml ?? ""));
  const output = matter.stringify(markdownBody, data);
  await writeFile(filePath, output, "utf8");
}
