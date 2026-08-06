import { test } from "node:test";
import assert from "node:assert/strict";
import { getArg, requireArg, hasFlag } from "./cli.ts";

test("getArg lê --nome=valor", () => {
  assert.equal(getArg(["--pauta=minha-pauta"], "pauta"), "minha-pauta");
});

test("getArg retorna undefined se o argumento não existe", () => {
  assert.equal(getArg(["--outro=x"], "pauta"), undefined);
});

test("requireArg lança erro se o argumento obrigatório faltar", () => {
  assert.throws(() => requireArg([], "pauta"), /--pauta=/);
});

test("hasFlag detecta uma flag booleana", () => {
  assert.equal(hasFlag(["--force"], "force"), true);
  assert.equal(hasFlag([], "force"), false);
});
