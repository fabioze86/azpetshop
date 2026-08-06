import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkTitleLength,
  checkExcerptLength,
  checkFaqPresence,
  checkHeadingHierarchy,
  countInternalLinks,
  runChecklist,
} from "./checklist.ts";

test("checkTitleLength reprova title curto demais", () => {
  assert.equal(checkTitleLength("Curto").ok, false);
});

test("checkTitleLength aprova title dentro do range", () => {
  assert.equal(checkTitleLength("Os 5 Melhores Tapetes Higiênicos para Cães em 2026").ok, true);
});

test("checkExcerptLength reprova excerpt curto demais", () => {
  assert.equal(checkExcerptLength("Muito curto.").ok, false);
});

test("checkFaqPresence detecta o componente <Faq>", () => {
  assert.equal(checkFaqPresence("texto sem faq").ok, false);
  assert.equal(checkFaqPresence('texto com <Faq items={[]} />').ok, true);
});

test("checkHeadingHierarchy reprova H3 antes de qualquer H2", () => {
  assert.equal(checkHeadingHierarchy("### Sub\n\nTexto\n\n## Principal").ok, false);
  assert.equal(checkHeadingHierarchy("## Principal\n\n### Sub").ok, true);
});

test("countInternalLinks conta links pra /blog/", () => {
  const body = "Veja [este post](/blog/caes/rottweiler/) e [este outro](/blog/gatos/persa/).";
  assert.equal(countInternalLinks(body).ok, true);
  assert.match(countInternalLinks(body).detail, /2 link/);
});

test("runChecklist retorna os 5 itens", () => {
  const items = runChecklist("Título de teste", "Excerpt de teste", "corpo de teste");
  assert.equal(items.length, 5);
});
