import { test } from "node:test";
import assert from "node:assert/strict";
import { contentTypeFor, slugify, buildImageId, uploadFile } from "./upload.mjs";

const CREDS = { accountId: "ACC", token: "TOK", hash: "HASH" };

test("contentTypeFor reconhece extensões suportadas e rejeita as demais", () => {
  assert.equal(contentTypeFor(".jpg"), "image/jpeg");
  assert.equal(contentTypeFor(".PNG"), "image/png");
  assert.equal(contentTypeFor(".bmp"), undefined);
});

test("slugify normaliza acentos e espaços", () => {
  assert.equal(slugify("Ração Premium!"), "racao-premium");
  assert.equal(slugify("  Foto do Rottweiler  "), "foto-do-rottweiler");
});

test("buildImageId monta o ID sem extensão", () => {
  assert.equal(buildImageId("caes", "rottweiler", "hero.jpg"), "posts/caes/rottweiler/hero");
  assert.equal(buildImageId("caes", "rottweiler", "racao-x.webp"), "posts/caes/rottweiler/racao-x");
});

test("uploadFile envia ao Cloudflare Images e devolve a URL imagedelivery.net", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ success: true, result: {} }), { status: 200 });
  };
  const url = await uploadFile({
    category: "caes",
    slug: "rottweiler",
    filename: "hero.jpg",
    filePath: "/tmp/fake.jpg",
    contentType: "image/jpeg",
    creds: CREDS,
    fetchImpl,
    readFileImpl: async () => Buffer.from("img"),
  });
  assert.equal(url, "https://imagedelivery.net/HASH/posts/caes/rottweiler/hero/public");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.body.get("id"), "posts/caes/rottweiler/hero");
  assert.equal(calls[0].init.body.get("file").type, "image/jpeg");
});
