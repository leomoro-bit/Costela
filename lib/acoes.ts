/**
 * Formato padrão de retorno das Server Actions (mutations) do projeto.
 *
 * Toda action que grava dados devolve um EstadoAcao. O formulário (client)
 * mostra um toast com `mensagem` e os erros por campo em `erros`.
 * Veja o exemplo completo em app/(app)/configuracoes/.
 */
import type { z } from "zod";

export type EstadoAcao = {
  ok: boolean;
  mensagem?: string;
  /** Erros por campo: { nome_negocio: "Informe o nome" } */
  erros?: Record<string, string>;
};

export const estadoInicial: EstadoAcao = { ok: false };

export function sucesso(mensagem = "Salvo com sucesso."): EstadoAcao {
  return { ok: true, mensagem };
}

export function falha(mensagem: string, erros?: Record<string, string>): EstadoAcao {
  return { ok: false, mensagem, erros };
}

/** Converte o erro do zod em { campo: "primeira mensagem" }. */
export function errosDoZod(erro: z.ZodError): Record<string, string> {
  const erros: Record<string, string> = {};
  for (const issue of erro.issues) {
    const campo = String(issue.path[0] ?? "_");
    if (!erros[campo]) erros[campo] = issue.message;
  }
  return erros;
}

/** Transforma FormData em objeto simples (campos repetidos viram o último valor). */
export function lerFormulario(formData: FormData): Record<string, string> {
  const dados: Record<string, string> = {};
  formData.forEach((valor, chave) => {
    if (typeof valor === "string") dados[chave] = valor;
  });
  return dados;
}

/** Mensagem amigável para erros do banco (PostgREST / Postgres). */
export function mensagemErroBanco(erro: { code?: string; message?: string } | null | undefined) {
  if (!erro) return "Algo deu errado. Tente novamente.";
  switch (erro.code) {
    case "23505":
      return "Já existe um registro com esses dados.";
    case "23503":
      return "Este registro está ligado a outros dados e não pode ser alterado/excluído.";
    case "23514":
      return "Algum valor está fora do permitido.";
    case "42501":
      return "Sem permissão. Faça login novamente.";
    case "P0001":
      // mensagem de regra de negócio escrita nas funções do banco (supabase/schema.sql)
      return erro.message || "Operação não permitida.";
    case "42P01":
    case "PGRST205":
      return "Tabela não encontrada. Rode o arquivo supabase/schema.sql no SQL Editor do Supabase.";
    default:
      return "Não foi possível salvar. Verifique sua conexão e tente novamente.";
  }
}

/** Checkbox de formulário: marcada → "on"; desmarcada → campo ausente. */
export function marcado(formData: FormData, campo: string) {
  return formData.get(campo) === "on";
}
