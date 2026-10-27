/**
 * MARCA DO CLIENTE (logo, cores, fonte, arredondamento, tema) — funções PURAS.
 *
 * Usado no servidor (app/layout.tsx aplica a marca em todas as páginas) e no
 * navegador (prévia ao vivo da tela /personalizacao). Não acessa o banco:
 * a leitura fica em lib/marca-servidor.ts.
 *
 * Tudo que vem do banco passa por normalizarMarca() antes de virar CSS/HTML
 * (cores só #RRGGBB, fonte/raio/tema só valores da lista, logo só http(s)).
 */
import { DESCRICAO_APP, NOME_APP } from "@/lib/navegacao";

// ---------------------------------------------------------------------------
// Opções
// ---------------------------------------------------------------------------

export const FONTES = [
  { id: "app", nome: "Padrão do cardápio", descricao: "Fraunces + DM Sans" },
  { id: "moderna", nome: "Moderna", descricao: "Inter — limpa e neutra" },
  { id: "elegante", nome: "Elegante", descricao: "Playfair Display + DM Sans" },
  { id: "amigavel", nome: "Amigável", descricao: "Nunito — arredondada" },
  { id: "classica", nome: "Clássica", descricao: "Lora + Source Sans 3" },
  { id: "tecnica", nome: "Técnica", descricao: "Space Grotesk + Manrope" },
  { id: "divertida", nome: "Divertida", descricao: "Fredoka + Nunito" },
] as const;
export type Fonte = (typeof FONTES)[number]["id"];

export const RAIOS = [
  { id: "reto", nome: "Reto" },
  { id: "medio", nome: "Médio" },
  { id: "redondo", nome: "Redondo" },
] as const;
export type Raio = (typeof RAIOS)[number]["id"];

export const TEMAS = [
  { id: "sistema", nome: "Seguir o sistema" },
  { id: "claro", nome: "Claro" },
  { id: "escuro", nome: "Escuro" },
] as const;
export type TemaPadrao = (typeof TEMAS)[number]["id"];

/** Paletas prontas (1 clique). A primeira é o padrão Brasa, preto + dourado. */
export const PALETAS = [
  { id: "brasa", nome: "Brasa (preto e dourado)", principal: "#D5A23A", destaque: "#D5A23A" },
  { id: "oliva", nome: "Oliva", principal: "#56642A", destaque: "#C24E0E" },
  { id: "ameixa", nome: "Ameixa", principal: "#5B2A4E", destaque: "#E0A458" },
  { id: "oceano", nome: "Oceano", principal: "#1D4E89", destaque: "#F4A259" },
  { id: "terracota", nome: "Terracota", principal: "#B5543C", destaque: "#2A9D8F" },
  { id: "rose", nome: "Rosé", principal: "#B83B6B", destaque: "#F2B5A0" },
  { id: "grafite", nome: "Grafite", principal: "#2F3640", destaque: "#E1B12C" },
  { id: "lavanda", nome: "Lavanda", principal: "#6D4BA8", destaque: "#3CB4A0" },
  { id: "turquesa", nome: "Turquesa", principal: "#0E7490", destaque: "#F97316" },
] as const;

export const LOGO_TIPOS = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"] as const;
export const LOGO_TAMANHO_MAX = 1024 * 1024; // 1 MB
export const LOGO_BUCKET = "marca";

/** "1,8 MB" / "320 KB" */
export function formatarTamanho(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Checagem rápida (navegador e servidor): tipo e tamanho. null = ok. */
export function erroArquivoLogo(arquivo: { type: string; size: number }) {
  if (!(LOGO_TIPOS as readonly string[]).includes(arquivo.type)) {
    return "Formato não aceito. Envie uma imagem PNG, JPG, SVG ou WebP.";
  }
  if (arquivo.size > LOGO_TAMANHO_MAX) {
    return `A imagem tem ${formatarTamanho(arquivo.size)} e o limite é 1 MB. Diminua o arquivo (ex.: tinypng.com ou squoosh.app) e tente de novo.`;
  }
  if (arquivo.size === 0) return "O arquivo está vazio.";
  return null;
}

// ---------------------------------------------------------------------------
// Tipo resolvido + padrão
// ---------------------------------------------------------------------------

export type Marca = {
  /** Nome exibido (menu, login, título da aba). */
  nome: string;
  /** Subtítulo (ex.: "Agenda online"). null = usa o texto padrão de cada tela. */
  subtitulo: string | null;
  logoUrl: string | null;
  corPrimaria: string;
  corDestaque: string;
  fonte: Fonte;
  raio: Raio;
  temaPadrao: TemaPadrao;
};

export const MARCA_PADRAO: Marca = {
  nome: NOME_APP,
  subtitulo: null,
  logoUrl: null,
  corPrimaria: PALETAS[0].principal,
  corDestaque: PALETAS[0].destaque,
  fonte: "elegante",
  raio: "medio",
  temaPadrao: "escuro",
};

/** Textos padrão quando o subtítulo está vazio. */
export const SUBTITULO_PADRAO_MENU = NOME_APP;
export const SUBTITULO_PADRAO_LOGIN = DESCRICAO_APP;

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Aceita só cores #RRGGBB (evita injetar CSS arbitrário). */
export function corValida(cor: unknown, padrao: string) {
  return typeof cor === "string" && HEX.test(cor) ? cor.toUpperCase() : padrao;
}

function daLista<T extends string>(valor: unknown, lista: readonly { id: T }[], padrao: T): T {
  return lista.some((i) => i.id === valor) ? (valor as T) : padrao;
}

/** Só URLs http(s) (nada de javascript:). */
export function urlSegura(url: unknown): string | null {
  if (typeof url !== "string" || url.length > 500) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Linha do banco (função marca_publica() ou tabela configuracoes) → Marca segura. */
export function normalizarMarca(
  linha:
    | {
        nome_exibido?: string | null;
        nome_exibicao?: string | null;
        nome_negocio?: string | null;
        subtitulo?: string | null;
        logo_url?: string | null;
        cor_primaria?: string | null;
        cor_destaque?: string | null;
        fonte?: string | null;
        raio?: string | null;
        tema_padrao?: string | null;
      }
    | null
    | undefined,
): Marca {
  if (!linha) return MARCA_PADRAO;
  const nome = (linha.nome_exibido ?? linha.nome_exibicao ?? linha.nome_negocio ?? "").trim();
  return {
    nome: nome || MARCA_PADRAO.nome,
    subtitulo: linha.subtitulo?.trim() || null,
    logoUrl: urlSegura(linha.logo_url),
    corPrimaria: corValida(linha.cor_primaria, MARCA_PADRAO.corPrimaria),
    corDestaque: corValida(linha.cor_destaque, MARCA_PADRAO.corDestaque),
    fonte: daLista(linha.fonte, FONTES, MARCA_PADRAO.fonte),
    raio: daLista(linha.raio, RAIOS, MARCA_PADRAO.raio),
    temaPadrao: daLista(linha.tema_padrao, TEMAS, MARCA_PADRAO.temaPadrao),
  };
}

// ---------------------------------------------------------------------------
// Cores: contraste WCAG e ajustes automáticos para claro/escuro
// ---------------------------------------------------------------------------

type Rgb = [number, number, number]; // sRGB LINEAR 0..1

const paraLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const paraSrgb = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function hexParaRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [paraLinear(((n >> 16) & 255) / 255), paraLinear(((n >> 8) & 255) / 255), paraLinear((n & 255) / 255)];
}

function rgbParaHex(rgb: Rgb) {
  return (
    "#" +
    rgb
      .map((c) => Math.round(Math.min(1, Math.max(0, paraSrgb(Math.min(1, Math.max(0, c))))) * 255))
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

function rgbParaOklab([r, g, b]: Rgb): Rgb {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabParaRgb([L, a, b]: Rgb): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** Igual ao CSS `color-mix(in oklab, a p%, b)` (p de 0 a 100). */
function misturar(a: string, b: string, p: number): string {
  const A = rgbParaOklab(hexParaRgb(a));
  const B = rgbParaOklab(hexParaRgb(b));
  const t = p / 100;
  return rgbParaHex(oklabParaRgb([A[0] * t + B[0] * (1 - t), A[1] * t + B[1] * (1 - t), A[2] * t + B[2] * (1 - t)]));
}

function luminancia(hex: string) {
  const [r, g, b] = hexParaRgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razão de contraste WCAG (1 a 21). 4,5 = mínimo para texto normal. */
export function contraste(a: string, b: string) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

const BRANCO = "#FFFFFF";
const PRETO = "#111111";

/** Branco ou preto: o que tiver MAIS contraste sobre a cor. */
export function corTextoSobre(fundo: string) {
  return contraste(fundo, BRANCO) >= contraste(fundo, PRETO) ? BRANCO : PRETO;
}

// Fundos dos temas (iguais a app/globals.css)
const CLARO = { superficie: "#FFFFFF", fundo: "#FBF6EE" };
const ESCURO = { superficie: "#221E17", superficie2: "#2B261D" };

/** No escuro, cores muito escuras "somem": clareia até ter contraste mínimo com o fundo. */
function corParaEscuro(cor: string) {
  for (let branco = 0; branco <= 60; branco += 4) {
    const c = misturar(cor, BRANCO, 100 - branco);
    if (contraste(c, ESCURO.superficie) >= 2.2) return c;
  }
  return misturar(cor, BRANCO, 40);
}

/** % da cor no "forte" (texto colorido) para dar contraste 4,5 sobre a superfície e o "suave". */
function mixForte(cor: string, escuro: boolean) {
  const inicio = escuro ? 35 : 82;
  const alvo = escuro ? BRANCO : "#000000";
  const suave = escuro ? misturar(cor, ESCURO.superficie, 30) : misturar(cor, CLARO.superficie, 12);
  const fundos = escuro ? [ESCURO.superficie, ESCURO.superficie2, suave] : [CLARO.superficie, CLARO.fundo, suave];
  for (let p = inicio; p >= 0; p -= 3) {
    const forte = misturar(cor, alvo, p);
    if (fundos.every((f) => contraste(forte, f) >= 4.5)) return p;
  }
  return 0;
}

type VarsCor = { base: string; texto: string; mix: number };

function varsCor(cor: string, escuro: boolean): VarsCor {
  const base = escuro ? corParaEscuro(cor) : cor;
  return { base, texto: corTextoSobre(base), mix: mixForte(base, escuro) };
}

/**
 * CSS com as variáveis da marca para o tema claro e o escuro.
 * Os tons "forte" e "suave" continuam calculados por color-mix em app/globals.css;
 * aqui só entram a cor, a cor do texto sobre ela e a % do "forte".
 */
export function cssMarca(
  cores: { corPrimaria: string; corDestaque: string },
  seletores: { claro: string; escuro: string } = { claro: "html:root", escuro: "html:root.dark" },
) {
  const p = corValida(cores.corPrimaria, MARCA_PADRAO.corPrimaria);
  const d = corValida(cores.corDestaque, MARCA_PADRAO.corDestaque);
  const bloco = (escuro: boolean) => {
    const m = varsCor(p, escuro);
    const x = varsCor(d, escuro);
    const sufixo = escuro ? "-escuro" : "";
    return (
      `--marca:${m.base};--marca-texto:${m.texto};--marca-mix${sufixo}:${m.mix}%;` +
      `--destaque:${x.base};--destaque-texto:${x.texto};--destaque-mix${sufixo}:${x.mix}%;`
    );
  };
  return `${seletores.claro}{${bloco(false)}}${seletores.escuro}{${bloco(true)}}`;
}

/** Avisos amigáveis quando a combinação de cores pode ficar difícil de ler. */
export function avisosContraste(cores: { corPrimaria: string; corDestaque: string }) {
  const avisos: string[] = [];
  const checar = (cor: string, nome: string) => {
    const c = contraste(cor, corTextoSobre(cor));
    if (c < 4.5) {
      avisos.push(
        `O texto sobre a ${nome} fica com contraste baixo (${c.toFixed(1).replace(".", ",")}:1, o ideal é 4,5:1). Experimente um tom mais escuro ou mais claro.`,
      );
    }
  };
  checar(cores.corPrimaria, "cor principal");
  checar(cores.corDestaque, "cor de destaque");
  if (contraste(cores.corPrimaria, CLARO.superficie) < 1.8) {
    avisos.push("A cor principal é muito clara: botões e o menu ficam apagados sobre o fundo branco.");
  }
  return avisos;
}

/** Script que aplica o tema ANTES da página aparecer (a escolha do usuário vale por cima do padrão). */
export function scriptTema(padrao: TemaPadrao) {
  const p = daLista(padrao, TEMAS, "sistema");
  return `(function(){try{var t=localStorage.getItem('tema');var p='${p}';var e=t==='escuro'||(t!=='claro'&&(p==='escuro'||(p==='sistema'&&window.matchMedia('(prefers-color-scheme: dark)').matches)));document.documentElement.classList.toggle('dark',e);}catch(_){}})();`;
}
