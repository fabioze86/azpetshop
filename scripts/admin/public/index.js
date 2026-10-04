function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

async function loadPosts() {
  const statusEl = document.getElementById("status");
  const body = document.getElementById("posts-body");
  try {
    const res = await fetch("/api/posts");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const posts = await res.json();
    const FLAG_LABELS = {
      "hero-ausente": "sem imagem de capa",
      "sem-alt-da-capa": "capa sem texto alternativo",
      "titulo-longo": "título passa de 60 caracteres",
      "excerpt-fora-do-range": "excerpt fora de 70–160 caracteres",
      "h1-duplicado": "H1 duplicado no corpo",
    };

    body.innerHTML = posts
      .map((p) => {
        const flags = (p.seoFlags ?? []).map((f) => FLAG_LABELS[f] ?? f);
        return `
      <tr>
        <td><a href="/edit.html?category=${encodeURIComponent(p.category)}&slug=${encodeURIComponent(p.slug)}">${escapeHtml(p.title)}</a></td>
        <td>${escapeHtml(p.category)}</td>
        <td>${p.publishedAt ? new Date(p.publishedAt).toLocaleDateString("pt-BR") : ""}</td>
        <td>${p.draft ? "sim" : ""}</td>
        <td>${flags.length ? escapeHtml(flags.join(", ")) : "—"}</td>
      </tr>
    `;
      })
      .join("");
    statusEl.textContent = `${posts.length} posts`;
  } catch (err) {
    statusEl.textContent = `Erro ao carregar posts: ${err.message}`;
  }
}

loadPosts();
