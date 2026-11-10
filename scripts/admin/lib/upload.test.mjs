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

test("uploadFile invoca o wrangler com os argumentos corretos e devolve a URL do CDN", () => {
  const calls = [];
  const fakeExecFileSync = (file, args, opts) => {
    calls.push({ file, args, opts });
  };
  const url = uploadFile({
    category: "caes",
    slug: "rottweiler",
    filename: "hero.jpg",
    filePath: "/tmp/fake.jpg",
    contentType: "image/jpeg",
    execFileSync: fakeExecFileSync,
  });
  assert.equal(url, "https://cdn.azpetshop.com.br/posts/caes/rottweiler/hero.jpg");
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].args, [
    "r2", "object", "put", "azpetshop-images/posts/caes/rottweiler/hero.jpg",
    "--file", "/tmp/fake.jpg", "--content-type", "image/jpeg", "--remote", "-y",
  ]);
});

test("uploadFile passa valores com caracteres especiais como um único argumento literal (sem interpretação de shell)", () => {
  const calls = [];
  const fakeExecFileSync = (file, args) => {
    calls.push({ file, args });
  };
  uploadFile({
    category: "caes; rm -rf /",
    slug: "rottweiler",
    filename: "hero.jpg",
    filePath: "/tmp/fake.jpg",
    contentType: "image/jpeg",
    execFileSync: fakeExecFileSync,
  });
  assert.equal(calls[0].args[3], "azpetshop-images/posts/caes; rm -rf //rottweiler/hero.jpg");
});
