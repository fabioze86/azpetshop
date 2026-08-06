import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify } from "./slug.ts";

test("slugify normaliza acentos, espaços e maiúsculas", () => {
  assert.equal(slugify("Ração Premium Filhote 15kg"), "racao-premium-filhote-15kg");
});

test("slugify remove hífens duplicados e nas pontas", () => {
  assert.equal(slugify("  --Ração!!  "), "racao");
});
