"use server";

/** MUTATIONS da tela Pedidos (mudar status). Os pedidos em si são criados pela função criar_pedido(). */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type EstadoAcao, falha, mensagemErroBanco, sucesso } from "@/lib/acoes";
import { createClient } from "@/lib/supabase/server";
import { uuid } from "@/lib/validacao";

const status = z.enum(["novo", "preparando", "saiu", "entregue", "cancelado"]);

export async function mudarStatusPedido(id: string, novo: string): Promise<EstadoAcao> {
  const dados = z.object({ id: uuid, status }).safeParse({ id, status: novo });
  if (!dados.success) return falha("Status inválido.");
  const supabase = await createClient();
  const { error } = await supabase.from("pedidos").update({ status: dados.data.status }).eq("id", dados.data.id);
  if (error) return falha(mensagemErroBanco(error));
  revalidatePath("/painel");
  return sucesso("Status atualizado.");
}
