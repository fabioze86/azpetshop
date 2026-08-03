import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv, parseCsvRecords } from "./csv.ts";

test("parseCsv separa linhas e colunas simples", () => {
  const rows = parseCsv("a,b,c\n1,2,3\n");
  assert.deepEqual(rows, [
    ["a", "b", "c"],
    ["1", "2", "3"],
  ]);
});

test("parseCsv respeita campos entre aspas com vírgula", () => {
  const rows = parseCsv('slug,titulo\nx,"Título, com vírgula"\n');
  assert.deepEqual(rows, [
    ["slug", "titulo"],
    ["x", "Título, com vírgula"],
  ]);
});

test("parseCsvRecords usa a primeira linha como cabeçalho", () => {
  const records = parseCsvRecords(
    "slug,categoria,palavra_chave,tipo_produto,prioridade\nmeu-slug,caes,minha palavra,tipo,1\n",
  );
  assert.deepEqual(records, [
    {
      slug: "meu-slug",
      categoria: "caes",
      palavra_chave: "minha palavra",
      tipo_produto: "tipo",
      prioridade: "1",
    },
  ]);
});
