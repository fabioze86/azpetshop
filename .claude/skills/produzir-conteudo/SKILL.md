---
name: produzir-conteudo
description: Use when the user wants to produce or publish a new AZ Pet Shop affiliate roundup (a blog post comparing products) — messages like "vamos produzir um conteúdo sobre as melhores areias de gato de mandioca", "novo artigo sobre os melhores X para cães", "cria um roundup de Y", "publica um post comparando Z". Also when operating this repo by Remote Control to create an article.
---

# Produzir conteúdo (roundup afiliado)

Leva uma ideia em linguagem natural até um `.mdx` publicável, rodando o pipeline
`content-hub/` e **parando em cada ponto que depende de uma decisão do usuário**.
Pensado para sessão tocada por Remote Control (possivelmente do celular).

## Regras invioláveis

- **Nunca invente** `linkAfiliado`, `asin`, preço real ou foto de produto. Isso vem
  do usuário, colado literalmente. Sem esses dados, pare e peça.
- **Nunca trabalhe na `main`.** Sempre uma branch `content/<slug>`.
- **Nunca** faça `draft: false` nem `git push` para a `main` sem o usuário dizer,
  com essas palavras, "pode publicar" / "pode subir".
- Uma pergunta por mensagem. Respostas curtas e escaneáveis. Não despeje JSON
  inteiro — resuma (a tela pode ser um celular).

## Gates humanos — pare e devolva o controle

| Gate | O que você precisa do usuário antes de seguir |
|---|---|
| Pauta derivada | "ok" no slug / categoria / palavra-chave |
| Candidatos | números aprovados + `linkAfiliado`, `asin`, `angulo` de cada |
| Fotos | caminhos dos `.jpg` locais — ou "publica sem imagem por enquanto" |
| Publicação | "pode publicar" explícito antes de `draft: false` + push na `main` |

## Fluxo

**0. Pré-checagem**
- `node -e "console.log(process.env.GEMINI_API_KEY ? 'ok' : 'FALTA')"` — se `FALTA`,
  pare: peça a chave e instrua `export GEMINI_API_KEY=...` nesta sessão (não há `.env`;
  os passos de IA leem `process.env` direto).
- Atualize a `main` local: `git fetch origin && git switch main && git pull --ff-only`.
  Ainda **não** crie a branch — o nome depende do slug (passo 1).

**1. Pauta**
- Derive do pedido: `slug` = kebab-case da palavra-chave · `categoria` = uma das
  pastas reais `caes | gatos | passaros | hamster | peixes` (mapeie "gato"→`gatos`,
  "cachorro"→`caes`, "roedor/hamster"→`hamster`) · `palavra_chave` = termo de busca
  natural · `tipo_produto` = o produto no singular genérico · `prioridade` = `1`.
- Mostre a pauta derivada em ~4 linhas e peça OK. **Só com o OK:** `git switch -c content/<slug>`.
- Acrescente 1 linha em `content-hub/pautas-master.csv` (cabeçalho
  `slug,categoria,palavra_chave,tipo_produto,prioridade`) e rode
  `npm run content:pautas:sync`.

**2. Candidatos** — `npm run content:candidatos -- --pauta=<slug>`
- Leia `content/pautas/<slug>/candidatos.json`. Liste numerado: `N. Nome — Marca — diferencial`.
- Filtre você mesmo os que fogem do escopo (pediu "mandioca", veio "milho/tofu") e sinalize.
- Peça: números aprovados + para cada um `linkAfiliado`, `asin` e `angulo` (pode
  sugerir ângulos; link e asin são do usuário).

**3. Selecionados** (à mão — nenhum script escreve este arquivo)
- Crie `content/pautas/<slug>/selecionados.json`: array de
  `{ nome, marca, diferencial, asin, linkAfiliado, angulo }`.
- Copie `nome / marca / diferencial` **literalmente** do candidato aprovado.

**4. Pesquisa** — `npm run content:pesquisa -- --pauta=<slug>` (gera `dossies.json`)
- Resuma: nº de dossiês + faixas de preço. Marque claims sensíveis (saúde,
  "biodegradável", "descarte no vaso") para tratar com ressalva na revisão.

**5. Escrever** — `npm run content:escrever -- --pauta=<slug>` (`--force` só para regerar)
- Gera `src/content/blog/<categoria>/<slug>.mdx` com `draft: true` e imprime os
  comandos `upload-image`. **Guarde esses comandos** para o passo 8.

**6. Links internos** — o gerador não injeta links internos e o checklist exige ≥2.
Adicione à mão 2+ links `](/blog/<categoria>/<post-existente>/)` para posts que
realmente existem em `src/content/blog/<categoria>/`.

**7. Revisar** — `npm run content:revisar -- --pauta=<slug>`
- Conserte os itens `⚠️` direto no `.mdx`: title 40–70 chars, excerpt 110–170,
  `<Faq>` presente, hierarquia de headings, ≥2 links internos.
- Releia o `.mdx`: cada `affiliateUrl` == o link que o usuário passou? Os `anchor`
  do `<QuickSummary>` batem com os `id` dos `<ProductHighlight>`? Nenhuma promessa
  de saúde/comportamento sem ressalva?

**8. Fotos** (gate) — entregue ao usuário os comandos `upload-image` (um por produto
+ um `--hero`). Origem **tem que ser `.jpg`** (a URL no `.mdx` termina em `.jpg`).
Precisa de `wrangler` logado na máquina. Se o usuário adiar, siga — as URLs do CDN
ficam 404 até o upload.

**9. Build** — `npm run build` tem que passar (valida o schema das collections).

**10. Publicar** (gate) — só com "pode publicar": `draft: false`, confira
`publishedAt`. `git add` do `.mdx` + `content-hub/pautas-master.csv` +
`content/pautas/<slug>/*.json`; commit. Merge na `main` + `git push` → o Cloudflare
Pages builda e publica sozinho. Sem o OK: deixe commitado na branch ou abra PR.

## Erros comuns

| Sintoma | Causa / correção |
|---|---|
| Scripts não acham arquivos | Rode da raiz `c:\Projetos\azpetshop`. |
| `categoria` recusada / URL errada | Use a pasta: `gatos`, `caes` — não "gato", "cachorro". |
| Imagem não aparece no post | Origem era `.png`/`.webp`; a URL no `.mdx` é `.jpg`. Converta antes de subir. |
| `content:escrever` "não faz nada" | O `.mdx` já existe. Use `--force` para regerar. |
| Passo de IA falha com erro de auth | `GEMINI_API_KEY` não está exportada nesta sessão. |
| `selecionados.json` continua vazio | É 100% manual; nenhum script preenche. |

## Artefatos

- `content/pautas/<slug>/` — `pauta.json` (gerado), `candidatos.json` (gerado, 5–8),
  `selecionados.json` (**você escreve**), `dossies.json` (gerado). Tudo isso é versionado.
- Componentes usáveis no corpo do MDX: `<QuickSummary>`, `<ProductHighlight>`, `<Faq>`
  — só esses três. `ComparisonTable` e `PickBox` são renderizados pelo template a
  partir do frontmatter `products[]`, não escritos no corpo.
