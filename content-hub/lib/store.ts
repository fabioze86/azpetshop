import { readFile } from "node:fs/promises";

export async function loadJson<T>(
  path: string,
  schema: { parse: (value: unknown) => T },
  hint: string,
): Promise<T> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    throw new Error(`Arquivo não encontrado: ${path}\n${hint}`);
  }
  return schema.parse(JSON.parse(raw));
}
