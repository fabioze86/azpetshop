import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { extractJson, generateJson, type GeminiClient } from "./gemini.ts";

const Schema = z.object({ nome: z.string() });

test("extractJson extrai um objeto JSON de um texto com markdown ao redor", () => {
  const texto = 'Aqui está:\n```json\n{"nome": "ok"}\n```\n';
  const resultado = extractJson(texto, (v) => Schema.parse(v));
  assert.equal(resultado.nome, "ok");
});

test("extractJson extrai um array JSON de um texto puro", () => {
  const resultado = extractJson('[{"nome": "a"}, {"nome": "b"}]', (v) => z.array(Schema).parse(v));
  assert.equal(resultado.length, 2);
});

test("generateJson retorna o valor validado na primeira tentativa", async () => {
  let chamadas = 0;
  const client: GeminiClient = {
    async generateGrounded() {
      chamadas++;
      return '{"nome": "ok"}';
    },
  };
  const resultado = await generateJson(client, "prompt qualquer", (v) => Schema.parse(v));
  assert.equal(resultado.nome, "ok");
  assert.equal(chamadas, 1);
});

test("generateJson tenta de novo com instrução extra se a 1a resposta não for JSON válido", async () => {
  let chamadas = 0;
  const client: GeminiClient = {
    async generateGrounded(prompt: string) {
      chamadas++;
      if (chamadas === 1) return "não é json";
      assert.match(prompt, /responda APENAS com JSON válido/);
      return '{"nome": "ok"}';
    },
  };
  const resultado = await generateJson(client, "prompt qualquer", (v) => Schema.parse(v));
  assert.equal(resultado.nome, "ok");
  assert.equal(chamadas, 2);
});

test("generateJson lança erro se nem o retry vier em JSON válido", async () => {
  const client: GeminiClient = {
    async generateGrounded() {
      return "ainda não é json";
    },
  };
  await assert.rejects(() => generateJson(client, "prompt qualquer", (v) => Schema.parse(v)));
});
