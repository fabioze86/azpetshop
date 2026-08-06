import { GoogleGenAI } from "@google/genai";

export interface GeminiClient {
  generateGrounded(prompt: string): Promise<string>;
}

export function createGeminiClient(apiKey: string | undefined = process.env.GEMINI_API_KEY): GeminiClient {
  if (!apiKey) {
    throw new Error("faltou a variável de ambiente GEMINI_API_KEY");
  }
  const ai = new GoogleGenAI({ apiKey });

  return {
    async generateGrounded(prompt: string): Promise<string> {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] },
      });
      const text = response.text;
      if (!text) {
        throw new Error("Gemini não retornou texto na resposta");
      }
      return text;
    },
  };
}

export function extractJson<T>(text: string, parse: (value: unknown) => T): T {
  const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  const jsonText = match ? match[0] : text;
  const value = JSON.parse(jsonText);
  return parse(value);
}

export async function generateJson<T>(
  client: GeminiClient,
  prompt: string,
  parse: (value: unknown) => T,
): Promise<T> {
  const primeiraResposta = await client.generateGrounded(prompt);
  try {
    return extractJson(primeiraResposta, parse);
  } catch (primeiroErro) {
    const retryPrompt = `${prompt}\n\nIMPORTANTE: responda APENAS com JSON válido, sem markdown, sem texto antes ou depois.`;
    const segundaResposta = await client.generateGrounded(retryPrompt);
    try {
      return extractJson(segundaResposta, parse);
    } catch {
      throw new Error(
        `Gemini não retornou JSON válido mesmo após retry. Erro original: ${String(primeiroErro)}`,
      );
    }
  }
}
