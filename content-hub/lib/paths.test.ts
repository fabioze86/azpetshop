import { test } from "node:test";
import assert from "node:assert/strict";
import { join, sep } from "node:path";
import {
  pautaDir,
  pautaJsonPath,
  candidatosJsonPath,
  selecionadosJsonPath,
  dossiesJsonPath,
  blogMdxPath,
} from "./paths.ts";

test("pautaDir aponta pra content/pautas/<slug>", () => {
  const dir = pautaDir("minha-pauta");
  assert.ok(dir.endsWith(join("content", "pautas", "minha-pauta")));
});

test("os *JsonPath ficam dentro de pautaDir", () => {
  const dir = pautaDir("minha-pauta");
  assert.equal(pautaJsonPath("minha-pauta"), join(dir, "pauta.json"));
  assert.equal(candidatosJsonPath("minha-pauta"), join(dir, "candidatos.json"));
  assert.equal(selecionadosJsonPath("minha-pauta"), join(dir, "selecionados.json"));
  assert.equal(dossiesJsonPath("minha-pauta"), join(dir, "dossies.json"));
});

test("blogMdxPath aponta pra src/content/blog/<categoria>/<slug>.mdx", () => {
  const path = blogMdxPath("caes", "minha-pauta");
  assert.ok(path.endsWith(["src", "content", "blog", "caes", "minha-pauta.mdx"].join(sep)));
});
