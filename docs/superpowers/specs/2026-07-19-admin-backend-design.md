# Backend administrativo local para o blog — Design

## Contexto

O blog hoje é composto por 109 posts em Markdown/MDX (`src/content/blog/<categoria>/<slug>.mdx`), lidos via Astro Content Collections e renderizados estaticamente (`getStaticPaths` em `src/pages/blog/[category]/[slug].astro`). Imagens vão para um bucket R2 (`azpetshop-images`) via `scripts/upload-image.mjs`, que chama `wrangler r2 object put --remote`. O deploy é via git push (Cloudflare Workers com adapter `@astrojs/cloudflare`).

Editar posts hoje exige mexer direto no `.mdx` (frontmatter YAML + corpo em Markdown) e rodar o script de upload de imagem manualmente na linha de comando.

## Objetivo

Uma ferramenta administrativa **local** (não deployada, não acessível remotamente) que permita:
1. Listar os 109 posts existentes.
2. Selecionar e abrir um post individual.
3. Editar título, excerpt, capa (URL) e o corpo do artigo através de um **editor visual (WYSIWYG)**.
4. Fazer upload simples de fotos (capa ou imagens soltas no corpo do texto), subindo para o mesmo bucket R2 já usado hoje.

Fora de escopo (decidido explicitamente): criação de posts novos, edição da categoria (ver seção "Decisões e restrições"), autenticação (é local, sem acesso remoto), automação de git commit (o painel só grava o arquivo em disco).

## Arquitetura

Servidor Node **standalone**, totalmente separado do build do Astro/Cloudflare — nenhum arquivo em `src/` importa esse código, então é impossível ele parar no bundle publicado em produção.

- **Comando**: `npm run admin` → `node scripts/admin/server.mjs`, escutando em `http://localhost:4500` (porta arbitrária, diferente da porta 4321 do `astro dev`).
- **Stack**: Express (rotas + servir arquivos estáticos) + Multer (upload multipart de imagem).
- **Novas devDependencies**: `express`, `multer`, `gray-matter` (parse/serialização do frontmatter YAML), `marked` (Markdown → HTML para carregar no editor).
- **Reaproveitada**: `turndown` (já é devDependency do projeto, usada em `migrate.mjs`) para converter o HTML editado de volta em Markdown ao salvar.
- **Editor visual**: Quill.js, carregado via CDN na página de edição (sem bundler, sem instalação npm).

## Componentes

### `scripts/admin/server.mjs`
App Express com as rotas:

| Método | Rota | Função |
|---|---|---|
| GET | `/api/posts` | Lista todos os posts (categoria, slug, título, `publishedAt`, `draft`) lendo o frontmatter de cada `.mdx` em `src/content/blog/**/*.mdx`. |
| GET | `/api/posts/:category/:slug` | Retorna os campos editáveis do post (título, excerpt, hero, heroAlt) + o corpo convertido de Markdown para HTML (via `marked`). |
| PUT | `/api/posts/:category/:slug` | Recebe `{ title, excerpt, hero, heroAlt, contentHtml }`, converte `contentHtml` → Markdown (`turndown`), atualiza `updatedAt` para a data atual, regrava o `.mdx` preservando os demais campos do frontmatter (`type`, `publishedAt`, `author`, `draft`, `products`) inalterados. Categoria **não** é aceita nesse payload (somente leitura). |
| POST | `/api/upload` | Recebe um arquivo (multipart) + `category`/`slug`/`alt`, sobe para o R2 via `wrangler r2 object put --remote` (mesmo padrão de chave `posts/<categoria>/<slug>/<arquivo>` do script atual) e devolve a URL do CDN (`https://cdn.azpetshop.com.br/...`). |

Servidor também serve os arquivos estáticos de `scripts/admin/public/`.

### `scripts/admin/lib/posts.mjs`
Funções puras reusadas pelas rotas:
- `listPosts()` — varre `src/content/blog` recursivamente, lê frontmatter de cada arquivo com `gray-matter`.
- `readPost(category, slug)` — lê um `.mdx`, retorna frontmatter + corpo convertido para HTML.
- `writePost(category, slug, fields)` — mescla os campos editáveis no frontmatter existente, converte o HTML recebido para Markdown, serializa com `gray-matter` e grava o arquivo.

### `scripts/admin/lib/upload.mjs`
Função que recebe um buffer + caminho de destino e faz o upload via `execSync("wrangler r2 object put ...")`, no mesmo padrão do `scripts/upload-image.mjs` existente (esse script continua intacto e não é modificado — a lógica é reimplementada aqui de forma independente para não acoplar as duas ferramentas).

### `scripts/admin/public/`
Duas páginas HTML estáticas com JS puro (sem framework, sem build step):
- **`index.html`** — busca `/api/posts`, renderiza a lista de posts (título, categoria, data), cada item linkando para a página de edição.
- **`edit.html`** — lê `category`/`slug` da query string, busca `/api/posts/:category/:slug`, preenche o formulário (título, excerpt, capa — categoria exibida como texto não editável) e carrega o corpo no editor Quill. Tem um campo de upload de arquivo que, ao selecionar uma imagem, faz o POST para `/api/upload` e insere a imagem retornada no editor (ou no campo de capa, se marcado como "usar como capa"). Um botão "Salvar" dispara o PUT.

## Fluxo de dados

1. `npm run admin` sobe o servidor em `localhost:4500`.
2. Usuário abre a lista, escolhe um post.
3. Página de edição carrega os campos atuais (corpo em Markdown é convertido para HTML antes de entrar no Quill).
4. Usuário edita texto no Quill, ajusta título/excerpt/capa, opcionalmente sobe uma foto (vai pro R2, URL retorna e é inserida no editor ou na capa).
5. Ao salvar, o HTML do Quill volta a virar Markdown e o `.mdx` é regravado no disco, com `updatedAt` atualizado.
6. Usuário revisa manualmente (`npm run dev` para conferir visualmente, `git diff` para ver o que mudou) e commita/dá push como já faz hoje — o painel não mexe em git.

## Decisões e restrições

- **Categoria é somente leitura no painel.** A categoria determina a pasta do arquivo e a URL pública (`/blog/<categoria>/<slug>`). Editá-la pelo painel moveria o arquivo e mudaria a URL, com risco de quebrar links já indexados. Trocar a categoria de um post continua sendo uma operação manual (mover o arquivo), fora do escopo desta ferramenta.
- **Sem autenticação.** A ferramenta só roda localmente (`localhost`), nunca é deployada — não há superfície de ataque remota a proteger.
- **Sem criação de posts novos.** O painel só lista e edita os 109 posts existentes.
- **Sem automação de git.** Salvar só grava o arquivo; commit/push continuam manuais.
- **Sem proteção de edição concorrente.** É uma ferramenta de um usuário só, local — a última gravação vence, não há necessidade de lock/versionamento adicional.

## Tratamento de erros

- Post inexistente ou frontmatter malformado ao ler → resposta 404/400 da API, exibida como banner de erro na UI.
- Falha no upload para o R2 (autenticação do wrangler expirada, rede) → stderr do `wrangler` é repassado como mensagem de erro visível na UI, não falha silenciosamente.
- Upload: mesma lista de extensões aceitas do script atual (`.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.svg`); extensão fora da lista é rejeitada com mensagem clara.

## Verificação

Ferramenta local de uso único (o próprio desenvolvedor), sem necessidade de suíte de testes automatizada. A verificação será manual, ao final da implementação:
1. Subir o painel e conferir que os 109 posts aparecem na listagem.
2. Abrir um post existente, editar título/excerpt/texto, salvar, e conferir via `git diff` que o Markdown resultante é razoável (sem HTML bruto vazando, formatação de listas/títulos preservada).
3. Subir uma imagem nova e confirmar que ela aparece no bucket R2 e que a URL do CDN funciona.
4. Rodar `npm run dev` e conferir visualmente que o post editado renderiza corretamente no site.
