import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PautaSchema,
  CandidatosSchema,
  SelecionadosSchema,
  DossiesSchema,
  EscritaResponseSchema,
} from "./schemas.ts";

test("PautaSchema aceita uma pauta válida", () => {
  const pauta = PautaSchema.parse({
    slug: "melhor-racao-filhotes",
    categoria: "caes",
    palavraChave: "melhor ração para filhotes",
    tipoProduto: "ração seca filhote",
    prioridade: 1,
  });
  assert.equal(pauta.slug, "melhor-racao-filhotes");
});

test("PautaSchema rejeita pauta sem categoria", () => {
  assert.throws(() =>
    PautaSchema.parse({
      slug: "x",
      palavraChave: "y",
      tipoProduto: "z",
      prioridade: 1,
    }),
  );
});

test("CandidatosSchema exige ao menos 1 candidato válido", () => {
  const candidatos = CandidatosSchema.parse([
    { nome: "Ração X", marca: "Marca Y", diferencial: "Baixo custo por kg" },
  ]);
  assert.equal(candidatos.length, 1);
  assert.throws(() => CandidatosSchema.parse([]));
});

test("SelecionadosSchema rejeita link de afiliado inválido", () => {
  assert.throws(() =>
    SelecionadosSchema.parse([
      {
        nome: "Ração X",
        marca: "Marca Y",
        diferencial: "Baixo custo por kg",
        asin: "B000123456",
        linkAfiliado: "não é uma url",
        angulo: "Melhor custo-benefício",
      },
    ]),
  );
});

test("DossiesSchema aceita um dossiê completo", () => {
  const dossies = DossiesSchema.parse([
    {
      nome: "Ração X",
      specs: ["Pacote de 15kg"],
      pros: ["Boa palatabilidade"],
      contras: ["Embalagem frágil"],
      faixaPreco: "R$ 150 a R$ 190",
      faqs: [{ pergunta: "Serve pra filhote de porte grande?", resposta: "Sim, a partir de 2 meses." }],
    },
  ]);
  assert.equal(dossies[0].specs.length, 1);
});

test("EscritaResponseSchema rejeita title fora do range de tamanho", () => {
  assert.throws(() =>
    EscritaResponseSchema.parse({
      title: "curto",
      excerpt: "x".repeat(120),
      body: "conteúdo",
    }),
  );
});
