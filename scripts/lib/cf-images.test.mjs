import { test } from "node:test";
import assert from "node:assert/strict";
import {
  imageIdFor,
  deliveryUrl,
  parseEnvFile,
  loadCredentials,
  uploadImage,
} from "./cf-images.mjs";

const CREDS = { accountId: "ACC", token: "TOK", hash: "HASH" };

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

test("imageIdFor monta o ID customizado posts/<categoria>/<slug>/<nome>", () => {
  assert.equal(imageIdFor("caes", "rottweiler", "hero"), "posts/caes/rottweiler/hero");
  assert.equal(imageIdFor("caes", "rottweiler", "racao-x"), "posts/caes/rottweiler/racao-x");
});

test("deliveryUrl monta a URL do imagedelivery.net com variante public por padrão", () => {
  assert.equal(
    deliveryUrl("posts/caes/rottweiler/hero", { hash: "HASH" }),
    "https://imagedelivery.net/HASH/posts/caes/rottweiler/hero/public",
  );
  assert.equal(
    deliveryUrl("posts/caes/rottweiler/hero", { hash: "HASH", variant: "cutout" }),
    "https://imagedelivery.net/HASH/posts/caes/rottweiler/hero/cutout",
  );
});

test("parseEnvFile lê KEY=VALUE, ignora comentários/vazias e remove aspas", () => {
  const env = parseEnvFile('# comentário\n\nA=1\nB="dois"\nC=\'tres\'\nD=com=igual\r\n');
  assert.deepEqual(env, { A: "1", B: "dois", C: "tres", D: "com=igual" });
});

test("loadCredentials lê do objeto env e aplica o hash padrão", () => {
  const c = loadCredentials({ CLOUDFLARE_ACCOUNT_ID: "A", CLOUDFLARE_IMAGES_TOKEN: "T" });
  assert.deepEqual(c, { accountId: "A", token: "T", hash: "7gejTBBL2EU6tOfD2F5Elw" });
});

test("loadCredentials falha com mensagem clara quando falta variável", () => {
  assert.throws(() => loadCredentials({}), /CLOUDFLARE_ACCOUNT_ID.*CLOUDFLARE_IMAGES_TOKEN/s);
});

test("uploadImage envia multipart com id customizado e devolve a URL de entrega", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return jsonResponse(200, { success: true, result: { id: "posts/caes/rottweiler/hero" } });
  };
  const url = await uploadImage({
    id: "posts/caes/rottweiler/hero",
    data: Buffer.from("x"),
    filename: "hero.webp",
    contentType: "image/webp",
    creds: CREDS,
    fetchImpl,
  });
  assert.equal(url, "https://imagedelivery.net/HASH/posts/caes/rottweiler/hero/public");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.cloudflare.com/client/v4/accounts/ACC/images/v1");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.headers.Authorization, "Bearer TOK");
  assert.equal(calls[0].init.body.get("id"), "posts/caes/rottweiler/hero");
  assert.equal(calls[0].init.body.get("file").type, "image/webp");
});

test("uploadImage apaga e reenvia quando o ID já existe (409)", async () => {
  const calls = [];
  let posts = 0;
  const fetchImpl = async (url, init) => {
    calls.push({ url, method: init.method });
    if (init.method === "POST") {
      posts += 1;
      return posts === 1
        ? jsonResponse(409, { success: false, errors: [{ code: 5409, message: "Resource already exists" }] })
        : jsonResponse(200, { success: true, result: {} });
    }
    return jsonResponse(200, { success: true, result: {} });
  };
  await uploadImage({
    id: "posts/caes/rottweiler/hero",
    data: Buffer.from("x"),
    filename: "hero.webp",
    contentType: "image/webp",
    creds: CREDS,
    fetchImpl,
  });
  assert.deepEqual(
    calls.map((c) => c.method),
    ["POST", "DELETE", "POST"],
  );
  assert.equal(
    calls[1].url,
    "https://api.cloudflare.com/client/v4/accounts/ACC/images/v1/posts/caes/rottweiler/hero",
  );
});

test("uploadImage propaga a mensagem de erro da API", async () => {
  const fetchImpl = async () =>
    jsonResponse(400, { success: false, errors: [{ code: 5400, message: "Invalid image" }] });
  await assert.rejects(
    uploadImage({
      id: "posts/caes/x/hero",
      data: Buffer.from("x"),
      filename: "hero.webp",
      contentType: "image/webp",
      creds: CREDS,
      fetchImpl,
    }),
    /5400.*Invalid image/s,
  );
});
