"use server";

/** MUTATIONS de Opcionais: grupos ("Tamanho", "Borda"...) e os itens de cada grupo. */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type EstadoAcao, errosDoZod, falha, lerFormulario, marcado, mensagemErroBanco, sucesso } from "@/lib/acoes";
import { createClient } from "@/lib/supabase/server";
import { dinheiro, inteiro, uuid } from "@/lib/validacao";

function atualizarTelas() {
  revalidatePath("/painel/opcionais");
  revalidatePath("/painel/cardapio");
  revalidatePath("/");
}

const esquemaGrupo = z.object({
  id: z.union([uuid, z.literal("")]),
  titulo: z.string().trim().min(1, "Informe o título do grupo.").max(60, "Máximo de 60 caracteres."),
  tipo: z.enum(["unico", "multiplo"], "Escolha o tipo."),
  max_escolhas: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((n) => n === null || (Number.isInteger(n) && n >= 1 && n <= 20), "Use um número de 1 a 20 (ou deixe vazio)."),
  ordem: inteiro(0),
});

export async function salvarGrupo(_anterior: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const dados = esquemaGrupo.safeParse(lerFormulario(formData));
  if (!dados.success) return falha("Confira os campos destacados.", errosDoZod(dados.error));
  const { id, ...campos } = dados.data;
  const registro = {
    ...campos,
    max_escolhas: campos.tipo === "unico" ? null : campos.max_escolhas,
    obrigatorio: marcado(formData, "obrigatorio"),
    ativo: marcado(formData, "ativo"),
  };
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("grupos_opcionais").update(registro).eq("id", id)
    : await supabase.from("grupos_opcionais").insert(registro);
  if (error) return falha(mensagemErroBanco(error));
  atualizarTelas();
  return sucesso(id ? "Grupo atualizado." : "Grupo criado.");
}

export async function excluirGrupo(id: string): Promise<EstadoAcao> {
  if (!uuid.safeParse(id).success) return falha("Grupo inválido.");
  const supabase = await createClient();
  const { error } = await supabase.from("grupos_opcionais").delete().eq("id", id);
  if (error) return falha(mensagemErroBanco(error));
  atualizarTelas();
  return sucesso("Grupo excluído.");
}

const esquemaOpcional = z.object({
  id: z.union([uuid, z.literal("")]),
  grupo_id: uuid,
  nome: z.string().trim().min(1, "Informe o nome da opção.").max(60, "Máximo de 60 caracteres."),
  preco: dinheiro("Informe o preço (0 = sem custo)."),
  ordem: inteiro(0),
});

export async function salvarOpcional(_anterior: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const dados = esquemaOpcional.safeParse(lerFormulario(formData));
  if (!dados.success) return falha("Confira os campos destacados.", errosDoZod(dados.error));
  const { id, ...campos } = dados.data;
  const registro = { ...campos, ativo: marcado(formData, "ativo") };
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("opcionais").update(registro).eq("id", id)
    : await supabase.from("opcionais").insert(registro);
  if (error) return falha(mensagemErroBanco(error));
  atualizarTelas();
  return sucesso(id ? "Opção atualizada." : "Opção adicionada.");
}

export async function excluirOpcional(id: string): Promise<EstadoAcao> {
  if (!uuid.safeParse(id).success) return falha("Opção inválida.");
  const supabase = await createClient();
  const { error } = await supabase.from("opcionais").delete().eq("id", id);
  if (error) return falha(mensagemErroBanco(error));
  atualizarTelas();
  return sucesso("Opção excluída.");
}
