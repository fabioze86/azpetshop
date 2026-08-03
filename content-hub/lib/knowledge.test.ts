import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadKnowledge } from "./knowledge.ts";

test("loadKnowledge concatena os 3 arquivos de conhecimento", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "content-hub-knowledge-test-"));
  try {
    await writeFile(path.join(dir, "tom-de-voz.md"), "Tom direto.", "utf8");
    await writeFile(path.join(dir, "regras-eeat.md"), "Regra de EEAT.", "utf8");
    await writeFile(path.join(dir, "guia-links-internos.md"), "Guia de links.", "utf8");

    const texto = await loadKnowledge(dir);

    assert.match(texto, /tom-de-voz\.md/);
    assert.match(texto, /Tom direto\./);
    assert.match(texto, /regras-eeat\.md/);
    assert.match(texto, /Regra de EEAT\./);
    assert.match(texto, /guia-links-internos\.md/);
    assert.match(texto, /Guia de links\./);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
