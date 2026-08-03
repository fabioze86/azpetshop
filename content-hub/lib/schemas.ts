import { z } from "zod";

export const PautaSchema = z.object({
  slug: z.string().min(1),
  categoria: z.string().min(1),
  palavraChave: z.string().min(1),
  tipoProduto: z.string().min(1),
  prioridade: z.number().int(),
});
export type Pauta = z.infer<typeof PautaSchema>;

export const CandidatoSchema = z.object({
  nome: z.string().min(1),
  marca: z.string().min(1),
  diferencial: z.string().min(1),
});
export type Candidato = z.infer<typeof CandidatoSchema>;
export const CandidatosSchema = z.array(CandidatoSchema).min(1);

export const SelecionadoSchema = CandidatoSchema.extend({
  asin: z.string().min(1),
  linkAfiliado: z.string().url(),
  angulo: z.string().min(1),
});
export type Selecionado = z.infer<typeof SelecionadoSchema>;
export const SelecionadosSchema = z.array(SelecionadoSchema).min(1);

export const FaqItemSchema = z.object({
  pergunta: z.string().min(1),
  resposta: z.string().min(1),
});

export const DossieContentSchema = z.object({
  specs: z.array(z.string()).min(1),
  pros: z.array(z.string()).min(1),
  contras: z.array(z.string()).min(1),
  faixaPreco: z.string().min(1),
  faqs: z.array(FaqItemSchema).min(1),
});
export type DossieContent = z.infer<typeof DossieContentSchema>;

export const DossieSchema = DossieContentSchema.extend({
  nome: z.string().min(1),
});
export type Dossie = z.infer<typeof DossieSchema>;
export const DossiesSchema = z.array(DossieSchema).min(1);

export const EscritaResponseSchema = z.object({
  title: z.string().min(10).max(70),
  excerpt: z.string().min(50).max(170),
  body: z.string().min(1),
});
export type EscritaResponse = z.infer<typeof EscritaResponseSchema>;
