import { test } from "node:test";
import assert from "node:assert/strict";
import { imageDeliveryUrl } from "./images.ts";

test("imageDeliveryUrl monta a URL do Cloudflare Images a partir de categoria, slug e nome do produto", () => {
  const url = imageDeliveryUrl("caes", "melhor-racao-filhotes", "Ração Premium Filhote 15kg");
  assert.equal(
    url,
    "https://imagedelivery.net/7gejTBBL2EU6tOfD2F5Elw/posts/caes/melhor-racao-filhotes/racao-premium-filhote-15kg/public",
  );
});
