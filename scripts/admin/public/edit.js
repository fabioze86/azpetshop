const params = new URLSearchParams(location.search);
const category = params.get("category");
const slug = params.get("slug");

const statusEl = document.getElementById("status");
document.getElementById("category-label").textContent = category ?? "";

const quill = new Quill("#editor", { theme: "snow" });

async function loadPost() {
  try {
    const res = await fetch(`/api/posts/${encodeURIComponent(category)}/${encodeURIComponent(slug)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
    document.getElementById("title").value = data.title ?? "";
    document.getElementById("excerpt").value = data.excerpt ?? "";
    document.getElementById("hero").value = data.hero ?? "";
    document.getElementById("heroAlt").value = data.heroAlt ?? "";
    quill.root.innerHTML = data.contentHtml ?? "";
  } catch (err) {
    statusEl.textContent = `Erro ao carregar post: ${err.message}`;
  }
}

document.getElementById("upload-btn").addEventListener("click", async () => {
  const fileInput = document.getElementById("image-file");
  const uploadStatus = document.getElementById("upload-status");
  if (!fileInput.files[0]) {
    uploadStatus.textContent = "Escolha um arquivo primeiro.";
    return;
  }
  const asHero = document.getElementById("use-as-hero").checked;
  const formData = new FormData();
  formData.append("file", fileInput.files[0]);
  formData.append("category", category);
  formData.append("slug", slug);
  formData.append("asHero", String(asHero));

  uploadStatus.textContent = "Enviando...";
  try {
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
    if (asHero) {
      document.getElementById("hero").value = data.url;
    } else {
      const range = quill.getSelection(true) ?? { index: quill.getLength() };
      quill.insertEmbed(range.index, "image", data.url);
    }
    uploadStatus.textContent = `Upload concluído: ${data.url}`;
  } catch (err) {
    uploadStatus.textContent = `Erro no upload: ${err.message}`;
  }
});

document.getElementById("edit-form").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  statusEl.textContent = "Salvando...";
  try {
    const res = await fetch(`/api/posts/${encodeURIComponent(category)}/${encodeURIComponent(slug)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: document.getElementById("title").value,
        excerpt: document.getElementById("excerpt").value,
        hero: document.getElementById("hero").value,
        heroAlt: document.getElementById("heroAlt").value,
        contentHtml: quill.root.innerHTML,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
    statusEl.textContent = "Salvo com sucesso.";
  } catch (err) {
    statusEl.textContent = `Erro ao salvar: ${err.message}`;
  }
});

loadPost();
