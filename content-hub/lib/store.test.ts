import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { z } from "zod";
import { loadJson } from "./store.ts";

const Schema = z.object({ nome: z.string() });

test("loadJson lê e valida um arquivo existente", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "content-hub-store-test-"));
  try {
    const file = path.join(dir, "dado.json");
    await writeFile(file, JSON.stringify({ nome: "ok" }), "utf8");
    const dado = await loadJson(file, Schema, "dica qualquer");
    assert.equal(dado.nome, "ok");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("loadJson lança erro com a dica quando o arquivo não existe", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "content-hub-store-test-"));
  try {
    const file = path.join(dir, "nao-existe.json");
    await assert.rejects(
      () => loadJson(file, Schema, "rode o passo anterior primeiro"),
      /rode o passo anterior primeiro/,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("loadJson propaga erro de validação Zod quando o conteúdo é inválido", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "content-hub-store-test-"));
  try {
    const file = path.join(dir, "invalido.json");
    await writeFile(file, JSON.stringify({ outraCoisa: 1 }), "utf8");
    await assert.rejects(() => loadJson(file, Schema, "dica"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
