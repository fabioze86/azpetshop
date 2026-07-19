import { test } from "node:test";
import assert from "node:assert/strict";
import { contentTypeFor, slugify, buildKey, buildCdnUrl, uploadFile } from "./upload.mjs";

test("contentTypeFor reconhece extensões suportadas e rejeita as demais", () => {
  assert.equal(contentTypeFor(".jpg"), "image/jpeg");
  assert.equal(contentTypeFor(".PNG"), "image/png");
  assert.equal(contentTypeFor(".bmp"), undefined);
});

test("slugify normaliza acentos e espaços", () => {
  assert.equal(slugify("Ração Premium!"), "racao-premium");
  assert.equal(slugify("  Foto do Rottweiler  "), "foto-do-rottweiler");
});

test("buildKey e buildCdnUrl montam o caminho esperado", () => {
  const key = buildKey("caes", "rottweiler", "hero.jpg");
  assert.equal(key, "posts/caes/rottweiler/hero.jpg");
  assert.equal(buildCdnUrl(key), "https://cdn.azpetshop.com.br/posts/caes/rottweiler/hero.jpg");
});

test("uploadFile monta o comando do wrangler e devolve a URL do CDN", () => {
  const calls = [];
  const fakeExecSync = (cmd, opts) => {
    calls.push({ cmd, opts });
  };
  const url = uploadFile({
    category: "caes",
    slug: "rottweiler",
    filename: "hero.jpg",
    filePath: "/tmp/fake.jpg",
    contentType: "image/jpeg",
    execSync: fakeExecSync,
  });
  assert.equal(url, "https://cdn.azpetshop.com.br/posts/caes/rottweiler/hero.jpg");
  assert.equal(calls.length, 1);
  assert.match(calls[0].cmd, /r2 object put/);
  assert.match(calls[0].cmd, /azpetshop-images\/posts\/caes\/rottweiler\/hero\.jpg/);
});
