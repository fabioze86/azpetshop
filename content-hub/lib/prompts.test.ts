import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildCandidatosPrompt,
  buildDossiePrompt,
  buildEscreverPrompt,
  buildRevisaoPrompt,
} from "./prompts.ts";
import type { Pauta, Selecionado, Dossie } from "./schemas.ts";

const pauta: Pauta = {
  slug: "melhor-racao-filhotes",
  categoria: "caes",
  palavraChave: "melhor ração para filhotes",
  tipoProduto: "ração seca filhote",
  prioridade: 1,
};

const selecionado: Selecionado = {
  nome: "Ração X",
  marca: "Marca Y",
  diferencial: "Baixo custo por kg",
  asin: "B000123456",
  linkAfiliado: "https://amzn.to/exemplo",
  angulo: "Melhor custo-benefício",
};

const dossie: Dossie = {
  nome: "Ração X",
  specs: ["Pacote de 15kg"],
  pros: ["Boa palatabilidade"],
  contras: ["Embalagem frágil"],
  faixaPreco: "R$ 150 a R$ 190",
  faqs: [{ pergunta: "Serve pra filhote grande?", resposta: "Sim." }],
};

test("buildCandidatosPrompt inclui categoria, tipo de produto e palavra-chave", () => {
  const prompt = buildCandidatosPrompt(pauta);
  assert.match(prompt, /caes/);
  assert.match(prompt, /ração seca filhote/);
  assert.match(prompt, /melhor ração para filhotes/);
});

test("buildDossiePrompt inclui nome do produto e ângulo editorial", () => {
  const prompt = buildDossiePrompt(pauta, selecionado);
  assert.match(prompt, /Ração X/);
  assert.match(prompt, /Melhor custo-benefício/);
});

test("buildEscreverPrompt inclui os links afiliados e URLs de imagem exatos", () => {
  const prompt = buildEscreverPrompt({
    pauta,
    selecionados: [selecionado],
    dossies: [dossie],
    knowledge: "diretrizes de teste",
    imagens: [{ nome: "Ração X", url: "https://cdn.azpetshop.com.br/posts/caes/x/racao-x.jpg" }],
  });
  assert.match(prompt, /https:\/\/amzn\.to\/exemplo/);
  assert.match(prompt, /https:\/\/cdn\.azpetshop\.com\.br\/posts\/caes\/x\/racao-x\.jpg/);
  assert.match(prompt, /diretrizes de teste/);
  assert.match(prompt, /<Faq/);
});

test("buildRevisaoPrompt inclui title, excerpt e knowledge", () => {
  const prompt = buildRevisaoPrompt({
    title: "Título de teste",
    excerpt: "Excerpt de teste",
    body: "corpo de teste",
    knowledge: "diretrizes de teste",
  });
  assert.match(prompt, /Título de teste/);
  assert.match(prompt, /Excerpt de teste/);
  assert.match(prompt, /diretrizes de teste/);
});
