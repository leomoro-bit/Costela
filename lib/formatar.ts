/**
 * Formatação no padrão brasileiro (Intl pt-BR, fuso de São Paulo).
 * Funções puras: podem ser usadas no servidor e no navegador.
 */

export const FUSO = "America/Sao_Paulo";

const fmtMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmtNumero = new Intl.NumberFormat("pt-BR");
const fmtData = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit", year: "numeric" });
const fmtDataCurta = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "short" });
const fmtDataHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const fmtHora = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" });
const fmtDataExtenso = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  weekday: "long",
  day: "numeric",
  month: "long",
});

type DataEntrada = string | number | Date | null | undefined;

/** "2025-03-10" é tratado como data local (meio-dia) para não "voltar um dia" por causa do fuso. */
function paraData(valor: DataEntrada): Date | null {
  if (valor === null || valor === undefined || valor === "") return null;
  if (valor instanceof Date) return isNaN(valor.getTime()) ? null : valor;
  if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return new Date(`${valor}T12:00:00-03:00`);
  }
  const d = new Date(valor);
  return isNaN(d.getTime()) ? null : d;
}

/** 1234.5 → "R$ 1.234,50" */
export function formatarMoeda(valor: number | string | null | undefined) {
  const n = typeof valor === "string" ? Number(valor) : valor;
  return fmtMoeda.format(Number.isFinite(n) ? (n as number) : 0);
}

/** 1234.5 → "1.234,5" */
export function formatarNumero(valor: number | null | undefined) {
  return fmtNumero.format(valor ?? 0);
}

/** "1.234,56" ou "R$ 1234,56" → 1234.56 (texto digitado pelo usuário → número) */
export function lerMoeda(texto: string | null | undefined): number {
  if (!texto) return 0;
  const limpo = texto.replace(/[^\d,.-]/g, "");
  const normalizado = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : 0;
}

/** → "10/03/2025" */
export function formatarData(valor: DataEntrada) {
  const d = paraData(valor);
  return d ? fmtData.format(d) : "—";
}

/** → "10 de mar." */
export function formatarDataCurta(valor: DataEntrada) {
  const d = paraData(valor);
  return d ? fmtDataCurta.format(d) : "—";
}

/** → "segunda-feira, 10 de março" */
export function formatarDataExtenso(valor: DataEntrada) {
  const d = paraData(valor);
  return d ? fmtDataExtenso.format(d) : "—";
}

/** → "10/03/2025, 14:30" */
export function formatarDataHora(valor: DataEntrada) {
  const d = paraData(valor);
  return d ? fmtDataHora.format(d) : "—";
}

/** → "14:30" */
export function formatarHora(valor: DataEntrada) {
  const d = paraData(valor);
  return d ? fmtHora.format(d) : "—";
}

/** Data de hoje no fuso de São Paulo no formato do <input type="date">: "2025-03-10" */
export function hojeISO(base: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(base);
}

/** Remove tudo que não é dígito. */
export function somenteDigitos(texto: string | null | undefined) {
  return (texto ?? "").replace(/\D/g, "");
}

/**
 * Telefone BR: "11900000000" → "(11) 90000-0000"; "551190000000" → "+55 (11) 9000-0000".
 * Se não reconhecer o formato, devolve o texto original.
 */
export function formatarTelefone(texto: string | null | undefined) {
  let d = somenteDigitos(texto);
  if (!d) return "";
  let prefixo = "";
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) {
    prefixo = "+55 ";
    d = d.slice(2);
  }
  if (d.length === 11) return `${prefixo}(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${prefixo}(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return texto ?? "";
}

/** "maria silva" → "MS" (para avatares) */
export function iniciais(nome: string | null | undefined) {
  const partes = (nome ?? "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const primeira = partes[0][0] ?? "";
  const ultima = partes.length > 1 ? (partes[partes.length - 1][0] ?? "") : "";
  return (primeira + ultima).toUpperCase();
}
