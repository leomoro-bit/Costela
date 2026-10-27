/**
 * Peças de validação (zod) reutilizadas nos formulários do painel.
 * Os formulários mandam tudo como texto (FormData); aqui viram número/nulo.
 */
import { z } from "zod";
import { lerMoeda } from "./formatar";

/** Texto opcional: "" vira null no banco. */
export const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo de ${max} caracteres.`)
    .transform((v) => (v === "" ? null : v));

/** Valor em reais digitado ("12,90", "R$ 1.234,50") → número. Obrigatório. */
export const dinheiro = (mensagem = "Informe o valor.") =>
  z
    .string()
    .trim()
    .min(1, mensagem)
    .refine((v) => /\d/.test(v), mensagem)
    .transform((v) => lerMoeda(v))
    .refine((n) => n >= 0 && n <= 1_000_000, "Valor inválido.");

/** Valor em reais opcional ("" → null). */
export const dinheiroOpcional = () =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : lerMoeda(v)))
    .refine((n) => n === null || (n >= 0 && n <= 1_000_000), "Valor inválido.");

/** Número inteiro digitado (ordem, limites). "" → valor padrão. */
export const inteiro = (padrao: number, min = 0, max = 9999) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? padrao : Number(v)))
    .refine((n) => Number.isInteger(n) && n >= min && n <= max, `Use um número inteiro entre ${min} e ${max}.`);

/** Id no formato UUID (z.guid aceita também os ids fixos do seed, gerados com md5). */
export const uuid = z.guid("Registro inválido.");
