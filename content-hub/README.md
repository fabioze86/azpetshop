# Content Hub — pipeline de conteúdo afiliado

Fluxo, na ordem:

1. Edite `content-hub/pautas-master.csv` com as pautas desejadas.
2. `npm run content:pautas:sync` — gera `content/pautas/<slug>/pauta.json` pra cada linha do CSV.
3. `npm run content:candidatos -- --pauta=<slug>` — chama o Gemini e gera `content/pautas/<slug>/candidatos.json` (5-8 produtos candidatos).
4. Edite manualmente `content/pautas/<slug>/selecionados.json`, copiando os produtos aprovados de `candidatos.json` e adicionando `asin`, `linkAfiliado` (link de afiliado completo, colado à mão) e `angulo` (ângulo editorial da review).
5. `npm run content:pesquisa -- --pauta=<slug>` — chama o Gemini pra montar `content/pautas/<slug>/dossies.json` (specs, prós, contras, faixa de preço, FAQs) por produto selecionado.
6. `npm run content:escrever -- --pauta=<slug>` — gera o artigo final em `src/content/blog/<categoria>/<slug>.mdx` (`--force` pra sobrescrever um post já existente).
7. `npm run content:revisar -- --pauta=<slug>` — imprime um checklist técnico + uma crítica editorial do Gemini. Não bloqueia publicação.

Variável de ambiente necessária: `GEMINI_API_KEY`.

Depois de gerar o artigo, faça upload das imagens reais dos produtos com `npm run upload-image` (o comando exato aparece no output de `content:escrever`), e revise o post gerado (`draft: true` por padrão) antes de publicar (mude pra `draft: false`).

**Importante:** as imagens de origem para upload devem ser `.jpg`. As URLs geradas em `content-hub/lib/images.ts` (`cdnImageUrl`) sempre terminam em `.jpg`, mas `scripts/upload-image.mjs` deriva a extensão final do arquivo local passado em `--file` — se você subir um `.png`/`.webp`, a URL final não vai bater com o que já está no frontmatter/corpo do post gerado.
