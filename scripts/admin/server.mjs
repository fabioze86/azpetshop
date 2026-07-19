import express from "express";
import multer from "multer";
import { dirname, join, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFile, unlink } from "node:fs/promises";
import os from "node:os";

import { listPosts, readPost, writePost } from "./lib/posts.mjs";
import { uploadFile, contentTypeFor, slugify } from "./lib/upload.mjs";

const ADMIN_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(ADMIN_DIR, "..", "..");
const BLOG_DIR = join(ROOT, "src", "content", "blog");
const PORT = 4500;

const app = express();
app.use(express.json());
app.use(express.static(join(ADMIN_DIR, "public")));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function isValidSegment(value) {
  return typeof value === "string" && /^[a-z0-9-]+$/.test(value);
}

app.get("/api/posts", async (req, res) => {
  try {
    res.json(await listPosts(BLOG_DIR));
  } catch (err) {
    res.status(500).json({ error: String(err.message ?? err) });
  }
});

app.get("/api/posts/:category/:slug", async (req, res) => {
  if (!isValidSegment(req.params.category) || !isValidSegment(req.params.slug)) {
    return res.status(400).json({ error: "categoria ou slug inválidos" });
  }
  try {
    res.json(await readPost(BLOG_DIR, req.params.category, req.params.slug));
  } catch (err) {
    if (err.code === "ENOENT") return res.status(404).json({ error: "post não encontrado" });
    res.status(500).json({ error: String(err.message ?? err) });
  }
});

app.put("/api/posts/:category/:slug", async (req, res) => {
  if (!isValidSegment(req.params.category) || !isValidSegment(req.params.slug)) {
    return res.status(400).json({ error: "categoria ou slug inválidos" });
  }
  try {
    const { title, excerpt, hero, heroAlt, contentHtml } = req.body;
    await writePost(BLOG_DIR, req.params.category, req.params.slug, { title, excerpt, hero, heroAlt, contentHtml });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === "ENOENT") return res.status(404).json({ error: "post não encontrado" });
    res.status(500).json({ error: String(err.message ?? err) });
  }
});

app.post("/api/upload", upload.single("file"), async (req, res) => {
  const { category, slug, asHero } = req.body;
  if (!category || !slug) return res.status(400).json({ error: "category e slug são obrigatórios" });
  if (!isValidSegment(category) || !isValidSegment(slug)) {
    return res.status(400).json({ error: "categoria ou slug inválidos" });
  }
  if (!req.file) return res.status(400).json({ error: "nenhum arquivo enviado" });

  const ext = extname(req.file.originalname).toLowerCase();
  const contentType = contentTypeFor(ext);
  if (!contentType) return res.status(400).json({ error: `extensão não suportada: ${ext || "(nenhuma)"}` });

  const filename = asHero === "true" ? `hero${ext}` : `${slugify(basename(req.file.originalname, ext))}${ext}`;
  const tmpPath = join(os.tmpdir(), `azpetshop-upload-${Date.now()}${ext}`);

  try {
    await writeFile(tmpPath, req.file.buffer);
    const url = uploadFile({ category, slug, filename, filePath: tmpPath, contentType });
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: String(err.message ?? err) });
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
});

app.listen(PORT, () => {
  console.log(`Admin do blog rodando em http://localhost:${PORT}`);
});
