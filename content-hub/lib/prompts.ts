import type { Pauta, Selecionado, Dossie } from "./schemas.ts";

export function buildCandidatosPrompt(pauta: Pauta): string {
  return `Você é um pesquisador de e-commerce especializado em produtos pet, escrevendo para o site AZ Pet Shop (azpetshop.com.br).

Categoria: ${pauta.categoria}
Tipo de produto: ${pauta.tipoProduto}
Palavra-chave alvo: "${pauta.palavraChave}"

Pesquise na web e liste de 5 a 8 produtos candidatos REAIS, vendidos atualmente no Brasil (preferencialmente na Amazon.com.br), adequados a essa palavra-chave.

Responda APENAS com um array JSON, sem markdown, no formato exato:
[
  { "nome": "nome completo do produto", "marca": "marca", "diferencial": "1 frase sobre o que diferencia esse produto dos concorrentes" }
]`;
}

export function buildDossiePrompt(pauta: Pauta, selecionado: Selecionado): string {
  return `Você é um pesquisador de produtos pet para o site AZ Pet Shop (azpetshop.com.br).

Produto: ${selecionado.nome} (marca: ${selecionado.marca})
Categoria: ${pauta.categoria}
Ângulo editorial definido: ${selecionado.angulo}

Pesquise na web informações atuais sobre esse produto e monte um dossiê.

Responda APENAS com um objeto JSON, sem markdown, no formato exato:
{
  "specs": ["especificação 1", "especificação 2"],
  "pros": ["ponto forte 1", "ponto forte 2"],
  "contras": ["ponto fraco 1"],
  "faixaPreco": "ex.: R$ 50 a R$ 80",
  "faqs": [{ "pergunta": "...", "resposta": "..." }]
}`;
}

export function buildEscreverPrompt(input: {
  pauta: Pauta;
  selecionados: Selecionado[];
  dossies: Dossie[];
  knowledge: string;
  imagens: { nome: string; url: string }[];
}): string {
  const { pauta, selecionados, dossies, knowledge, imagens } = input;

  const produtosTexto = selecionados
    .map((s, i) => {
      const d = dossies.find((x) => x.nome === s.nome);
      const img = imagens.find((x) => x.nome === s.nome)?.url ?? "";
      return `### Produto ${i + 1}: ${s.nome}
Marca: ${s.marca}
Diferencial: ${s.diferencial}
Ângulo editorial: ${s.angulo}
Link afiliado: ${s.linkAfiliado}
URL da imagem (use exatamente essa, não invente outra): ${img}
Specs: ${d?.specs.join("; ") ?? ""}
Prós: ${d?.pros.join("; ") ?? ""}
Contras: ${d?.contras.join("; ") ?? ""}
Faixa de preço: ${d?.faixaPreco ?? ""}
FAQs sugeridas: ${d?.faqs.map((f) => `${f.pergunta} -> ${f.resposta}`).join(" | ") ?? ""}`;
    })
    .join("\n\n");

  return `Você é um redator especializado em conteúdo afiliado para o site AZ Pet Shop (azpetshop.com.br), categoria "${pauta.categoria}", palavra-chave alvo "${pauta.palavraChave}".

Siga estas diretrizes de tom de voz e EEAT:
${knowledge}

Estrutura obrigatória do artigo (baseada no formato já usado no site):
1. Um resumo top-3 usando o componente <QuickSummary items={[{label, name, anchor}, ...]} /> logo no início.
2. Uma introdução curta (2 parágrafos) sobre a categoria de produto.
3. Uma review individual por produto, usando <ProductHighlight id="..." badge="..." name="..." image="..." href="..." stars={1-5} score="X/10">texto da review</ProductHighlight> para o produto de destaque, e um formato H3 + parágrafo para os demais.
4. Uma seção "## Como escolher o melhor ${pauta.tipoProduto}" com critérios práticos.
5. Uma seção de perguntas frequentes usando <Faq items={[{question, answer}, ...]} />, com pelo menos 4 perguntas.

Produtos e dados de pesquisa disponíveis (use EXATAMENTE os links afiliados e URLs de imagem fornecidos, não invente novos):
${produtosTexto}

Responda APENAS com um objeto JSON, sem markdown, no formato exato:
{
  "title": "título do artigo, 50-70 caracteres, com o ano quando fizer sentido",
  "excerpt": "meta description, 120-170 caracteres, que gere cliques nos resultados de busca",
  "body": "o corpo completo do artigo em MDX, como uma única string, seguindo a estrutura acima"
}`;
}

export function buildRevisaoPrompt(input: {
  title: string;
  excerpt: string;
  body: string;
  knowledge: string;
}): string {
  return `Você é um editor sênior de conteúdo revisando um artigo do site AZ Pet Shop antes da publicação.

Diretrizes de tom de voz e EEAT que o artigo deve seguir:
${input.knowledge}

Título: ${input.title}
Meta description: ${input.excerpt}

Corpo do artigo:
${input.body}

Escreva uma crítica editorial curta (no máximo 6 bullet points) apontando problemas concretos de clareza, tom de voz, EEAT (autoridade/confiança) ou oportunidades de melhoria. Não repita o checklist técnico (tamanho de título, headings, links) — isso já é verificado separadamente. Responda em texto simples, sem markdown.`;
}
