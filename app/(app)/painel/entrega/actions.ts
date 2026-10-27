"use server";

/** MUTATIONS de Entrega: bairros atendidos e a taxa de cada um. */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type EstadoAcao, errosDoZod, falha, lerFormulario, marcado, mensagemErroBanco, sucesso } from "@/lib/acoes";
import { createClient } from "@/lib/supabase/server";
import { dinheiro, inteiro, uuid } from "@/lib/validacao";

const esquema = z.object({
  id: z.union([uuid, z.literal("")]),
  nome: z.string().trim().min(1, "Informe o bairro.").max(60, "Máximo de 60 caracteres."),
  taxa: dinheiro("Informe a taxa (0 = grátis)."),
  ordem: inteiro(0),
});

export async function salvarBairro(_anterior: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const dados = esquema.safeParse(lerFormulario(formData));
  if (!dados.success) return falha("Confira os campos destacados.", errosDoZod(dados.error));
  const { id, ...campos } = dados.data;
  const registro = { ...campos, ativo: marcado(formData, "ativo") };
  const supabase = await createClient();
  const { error } = id ? await supabase.from("bairros").update(registro).eq("id", id) : await supabase.from("bairros").insert(registro);
  if (error?.code === "23505") return falha("Este bairro já está cadastrado.", { nome: "Este bairro já está cadastrado." });
  if (error) return falha(mensagemErroBanco(error));
  revalidatePath("/painel/entrega");
  revalidatePath("/");
  return sucesso(id ? "Bairro atualizado." : "Bairro adicionado.");
}

export async function excluirBairro(id: string): Promise<EstadoAcao> {
  if (!uuid.safeParse(id).success) return falha("Bairro inválido.");
  const supabase = await createClient();
  const { error } = await supabase.from("bairros").delete().eq("id", id);
  if (error) return falha(mensagemErroBanco(error));
  revalidatePath("/painel/entrega");
  revalidatePath("/");
  return sucesso("Bairro excluído.");
}
