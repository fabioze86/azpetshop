// Dados dos infográficos de raça (componente BreedInfographic).
// Regra: só informação que já está no artigo da raça — o infográfico resume,
// não acrescenta fatos novos.

export interface RacaInfografico {
  nome: string;
  apelido?: string;
  origem: string;
  reconhecimento?: string;
  stats: { label: string; min: number; max: number; unidade: string; escalaMax: number }[];
  tipos?: { nome: string; porte: string; descricao: string; escala: number }[];
  temperamento: { label: string; nivel: 1 | 2 | 3 | 4 | 5; nota: string }[];
  cores: { nome: string; hex: string; comum?: boolean }[];
  rotina: { icone: "racao" | "passeio" | "banho" | "vet"; titulo: string; texto: string }[];
  saude: { nome: string; dica: string }[];
  mitos: { pergunta: string; veredito: string; resposta: string }[];
  curiosidade?: string;
}

export const RACAS: Record<string, RacaInfografico> = {
  "american-bully": {
    nome: "American Bully",
    apelido: "“Valentão Americano”",
    origem: "Estados Unidos",
    reconhecimento: "2013",
    stats: [
      { label: "Peso", min: 30, max: 50, unidade: "kg", escalaMax: 80 },
      { label: "Altura", min: 40, max: 50, unidade: "cm", escalaMax: 70 },
      { label: "Expectativa de vida", min: 8, max: 15, unidade: "anos", escalaMax: 20 },
    ],
    tipos: [
      { nome: "Pocket", porte: "Pequeno", descricao: "A versão menor — e, geralmente, a mais comum.", escala: 0.62 },
      { nome: "Classic", porte: "Médio", descricao: "Porte médio, com a mesma estrutura forte e musculosa.", escala: 0.76 },
      { nome: "Standard", porte: "Grande", descricao: "Porte grande, corpo robusto e ossatura rígida.", escala: 0.88 },
      { nome: "XL", porte: "Extra grande", descricao: "A versão extra grande da raça.", escala: 1 },
    ],
    temperamento: [
      { label: "Carinho com a família", nivel: 5, nota: "Leal, cria laços fortes com os tutores." },
      { label: "Convivência com crianças", nivel: 4, nota: "Ótimo com crianças — brincadeiras supervisionadas, pela força." },
      { label: "Convívio com outros animais", nivel: 4, nota: "Costuma se dar bem, com adaptação cautelosa." },
      { label: "Necessidade de exercício", nivel: 3, nota: "No mínimo duas caminhadas por dia." },
      { label: "Latido", nivel: 2, nota: "Não é afobado: late quando percebe algo suspeito." },
      { label: "Tolerância a ficar sozinho", nivel: 1, nota: "Fica carente e pode descontar em portas e sapatos." },
      { label: "Trabalho com a pelagem", nivel: 1, nota: "Pelo curto; banho a cada 2 ou 3 semanas." },
    ],
    cores: [
      { nome: "Blue nose", hex: "#6b7a8c", comum: true },
      { nome: "Fulvo", hex: "#d9a066", comum: true },
      { nome: "Castanho", hex: "#7b4a2a" },
      { nome: "Preto", hex: "#1f1f24" },
      { nome: "Branco", hex: "#f4f1ea" },
      { nome: "Prata", hex: "#b8bec6" },
      { nome: "Marrom", hex: "#5a3a22" },
      { nome: "Creme", hex: "#ecd9b0" },
      { nome: "Cinza", hex: "#8a8f96" },
    ],
    rotina: [
      { icone: "racao", titulo: "Alimentação", texto: "Filhote (até 4 meses): 4 refeições por dia. Depois, 3 — sempre com ração específica para cada fase." },
      { icone: "passeio", titulo: "Exercício", texto: "Pelo menos 2 caminhadas diárias, mais brincadeiras que exercitam a mente, como caça a petiscos." },
      { icone: "banho", titulo: "Banho", texto: "A cada 2 ou 3 semanas, com xampu específico e neutro. A pelagem quase não cai." },
      { icone: "vet", titulo: "Check-up", texto: "Consultas regulares são a melhor forma de evitar sustos com a saúde." },
    ],
    saude: [
      { nome: "Alergias de pele", dica: "São as mais frequentes. Banhos com produtos neutros ajudam a prevenir." },
      { nome: "Displasia de quadril e cotovelo", dica: "Pergunte ao veterinário quais exercícios são indicados para evitar." },
      { nome: "Problemas no coração", dica: "Atenção a respiração curta e batimentos acelerados em repouso." },
      { nome: "Catarata", dica: "Deve ser acompanhada pelo veterinário." },
      { nome: "Hipertireoidismo", dica: "Deve ser acompanhado pelo veterinário." },
      { nome: "Surdez", dica: "Deve ser acompanhada pelo veterinário." },
    ],
    mitos: [
      { pergunta: "American Bully é a mesma coisa que Pitbull?", veredito: "Mito", resposta: "São raças diferentes: o Bully tem a cabeça maior e as pernas mais curtas." },
      { pergunta: "É um cão agressivo?", veredito: "Mito", resposta: "Apesar da cara de valentão, é dócil, carinhoso e amigável com pessoas e outros animais." },
      { pergunta: "Posso cortar as orelhas?", veredito: "Proibido", resposta: "Em alguns países é padrão da raça, mas no Brasil a prática é proibida por lei federal." },
    ],
    curiosidade: "Hulk, um American Bully XXL de 80 kg, virou celebridade: tem mais de 1 milhão de seguidores no Instagram.",
  },
};
