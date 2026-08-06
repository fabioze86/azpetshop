import { test } from "node:test";
import assert from "node:assert/strict";
import { csvRecordToPauta } from "./pautas-sync.ts";

test("csvRecordToPauta converte um registro de CSV pra Pauta validada", () => {
  const pauta = csvRecordToPauta({
    slug: "melhor-racao-filhotes",
    categoria: "caes",
    palavra_chave: "melhor ração para filhotes",
    tipo_produto: "ração seca filhote",
    prioridade: "1",
  });
  assert.deepEqual(pauta, {
    slug: "melhor-racao-filhotes",
    categoria: "caes",
    palavraChave: "melhor ração para filhotes",
    tipoProduto: "ração seca filhote",
    prioridade: 1,
  });
});

test("csvRecordToPauta lança erro se faltar uma coluna obrigatória", () => {
  assert.throws(() =>
    csvRecordToPauta({ slug: "x", categoria: "", palavra_chave: "y", tipo_produto: "z", prioridade: "1" }),
  );
});
