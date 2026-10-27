"use server";

/**
 * Server Actions do CARDÁPIO PÚBLICO (visitante sem login).
 *
 * Não gravam em tabelas diretamente: chamam as funções do banco
 * validar_cupom() e criar_pedido(), que rodam com "security definer" e
 * RECALCULAM preços, descontos e total a partir do banco.
 * O navegador só manda: produtos, opcionais, quantidades e dados do cliente.
 * A loja trabalha exclusivamente com retirada no local.
 */
import { z } from "zod";
import type { CupomValidado, PedidoCriado } from "@/lib/cardapio";
import { somenteDigitos } from "@/lib/formatar";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/tipos";

const uuid = z.guid(); // aceita também os ids fixos do seed (md5)

const esquemaCupom = z.object({
  codigo: z.string().trim().max(20),
  subtotal: z.number().min(0).max(1_000_000),
  tipo: z.literal("retirada"),
});

export async function conferirCupom(codigo: string, subtotal: number, tipo: "retirada" = "retirada"): Promise<CupomValidado> {
  const dados = esquemaCupom.safeParse({ codigo, subtotal, tipo });
  if (!dados.success) return { valido: false, mensagem: "Confira o código do cupom." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("validar_cupom", {
    p_codigo: dados.data.codigo.toUpperCase(),
    p_subtotal: dados.data.subtotal,
    p_tipo: dados.data.tipo,
  });
  if (error || !data) {
    console.error("[conferirCupom]", error);
    return { valido: false, mensagem: "Não foi possível conferir o cupom agora. Tente de novo." };
  }
  return data as CupomValidado;
}

const esquemaPedido = z
  .object({
    tipo: z.literal("retirada"),
    cliente_nome: z.string().trim().min(2, "Informe seu nome.").max(80, "Nome muito longo."),
    cliente_telefone: z
      .string()
      .transform((v) => somenteDigitos(v))
      .refine((v) => v === "" || (v.length >= 10 && v.length <= 13), "Telefone incompleto. Use DDD + número."),
    bairro_id: z.union([uuid, z.literal("")]),
    rua: z.string().trim().max(120),
    numero: z.string().trim().max(20),
    complemento: z.string().trim().max(80),
    referencia: z.string().trim().max(120),
    pagamento: z.enum(["pix", "cartao", "dinheiro"]),
    troco_para: z.number().min(0).max(100_000).nullable(),
    cupom: z.string().trim().max(20),
    observacoes: z.string().trim().max(200),
    itens: z
      .array(
        z.object({
          produto_id: uuid,
          quantidade: z.number().int().min(1).max(50),
          opcionais: z.array(uuid).max(30),
          observacao: z.string().trim().max(140),
        }),
      )
      .min(1, "Sua sacola está vazia.")
      .max(40),
  });

export type EntradaPedido = z.input<typeof esquemaPedido>;
export type ResultadoPedido =
  | { ok: true; pedido: PedidoCriado }
  | { ok: false; mensagem: string; erros?: Record<string, string> };

export async function enviarPedido(entrada: EntradaPedido): Promise<ResultadoPedido> {
  const dados = esquemaPedido.safeParse(entrada);
  if (!dados.success) {
    const erros: Record<string, string> = {};
    for (const i of dados.error.issues) {
      const campo = String(i.path[0] ?? "_");
      if (!erros[campo]) erros[campo] = i.message;
    }
    return { ok: false, mensagem: Object.values(erros)[0] ?? "Confira os campos destacados.", erros };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("criar_pedido", { p: dados.data as unknown as Json });
  if (error) {
    // P0001 = mensagem de regra de negócio escrita no banco (ex.: loja fechada ou entrega desativada).
    if (error.code === "P0001" && error.message) return { ok: false, mensagem: error.message };
    console.error("[enviarPedido]", error);
    if (error.code === "PGRST202" || error.code === "42883") {
      return { ok: false, mensagem: "Cardápio ainda não configurado: rode o supabase/schema.sql no Supabase." };
    }
    return { ok: false, mensagem: "Não foi possível registrar o pedido agora. Verifique sua conexão e tente de novo." };
  }
  return { ok: true, pedido: data as unknown as PedidoCriado };
}
