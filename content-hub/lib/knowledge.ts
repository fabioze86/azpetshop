import { readFile } from "node:fs/promises";
import { join } from "node:path";

const FILES = ["tom-de-voz.md", "regras-eeat.md", "guia-links-internos.md"];

export async function loadKnowledge(knowledgeDir: string): Promise<string> {
  const parts = await Promise.all(
    FILES.map(async (file) => {
      const text = await readFile(join(knowledgeDir, file), "utf8");
      return `## ${file}\n\n${text.trim()}`;
    }),
  );
  return parts.join("\n\n---\n\n");
}
