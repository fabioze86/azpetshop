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
    body.innerHTML = posts
      .map(
        (p) => `
      <tr>
        <td><a href="/edit.html?category=${encodeURIComponent(p.category)}&slug=${encodeURIComponent(p.slug)}">${escapeHtml(p.title)}</a></td>
        <td>${escapeHtml(p.category)}</td>
        <td>${p.publishedAt ? new Date(p.publishedAt).toLocaleDateString("pt-BR") : ""}</td>
        <td>${p.draft ? "sim" : ""}</td>
      </tr>
    `,
      )
      .join("");
    statusEl.textContent = `${posts.length} posts`;
  } catch (err) {
    statusEl.textContent = `Erro ao carregar posts: ${err.message}`;
  }
}

loadPosts();
