export interface ChecklistItem {
  label: string;
  ok: boolean;
  detail: string;
}

export function checkTitleLength(title: string): ChecklistItem {
  const len = title.length;
  const ok = len >= 40 && len <= 70;
  return { label: "Tamanho do title", ok, detail: `${len} caracteres (ideal: 40-70)` };
}

export function checkExcerptLength(excerpt: string): ChecklistItem {
  const len = excerpt.length;
  const ok = len >= 110 && len <= 170;
  return { label: "Tamanho do excerpt (meta description)", ok, detail: `${len} caracteres (ideal: 110-170)` };
}

export function checkFaqPresence(body: string): ChecklistItem {
  const ok = body.includes("<Faq");
  return {
    label: "Presença de FAQ com schema",
    ok,
    detail: ok ? "componente <Faq> encontrado" : "componente <Faq> não encontrado",
  };
}

export function checkHeadingHierarchy(body: string): ChecklistItem {
  const lines = body.split("\n");
  let sawH2 = false;
  let broken = false;
  for (const line of lines) {
    if (/^##\s/.test(line)) sawH2 = true;
    else if (/^###\s/.test(line) && !sawH2) broken = true;
  }
  return {
    label: "Hierarquia de headings",
    ok: !broken,
    detail: broken ? "encontrado H3 antes de qualquer H2" : "hierarquia OK",
  };
}

export function countInternalLinks(body: string): ChecklistItem {
  const matches = body.match(/\]\(\/blog\//g) ?? [];
  const ok = matches.length >= 2;
  return {
    label: "Links internos",
    ok,
    detail: `${matches.length} link(s) para /blog/ encontrados (ideal: 2+)`,
  };
}

export function runChecklist(title: string, excerpt: string, body: string): ChecklistItem[] {
  return [
    checkTitleLength(title),
    checkExcerptLength(excerpt),
    checkFaqPresence(body),
    checkHeadingHierarchy(body),
    countInternalLinks(body),
  ];
}
