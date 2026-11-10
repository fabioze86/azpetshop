import { test } from "node:test";
import assert from "node:assert/strict";
import { cdnImageUrl } from "./images.ts";

test("cdnImageUrl monta a URL a partir de categoria, slug e nome do produto", () => {
  const url = cdnImageUrl("caes", "melhor-racao-filhotes", "Ração Premium Filhote 15kg");
  assert.equal(
    url,
    "https://cdn.azpetshop.com.br/posts/caes/melhor-racao-filhotes/racao-premium-filhote-15kg.jpg",
  );
});
