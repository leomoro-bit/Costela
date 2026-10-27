"use server";

/** MUTATIONS de Cupons. O cliente nunca vê a lista: ele só valida um código (função validar_cupom). */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type EstadoAcao, errosDoZod, falha, lerFormulario, marcado, mensagemErroBanco, sucesso } from "@/lib/acoes";
import { lerMoeda } from "@/lib/formatar";
import { createClient } from "@/lib/supabase/server";
import { dinheiro, uuid } from "@/lib/validacao";

const esquema = z
  .object({
    id: z.union([uuid, z.literal("")]),
    codigo: z
      .string()
      .trim()
      .transform((v) => v.toUpperCase())
      .refine((v) => /^[A-Z0-9_-]{3,20}$/.test(v), "De 3 a 20 letras/números, sem espaço. Ex.: VILA10"),
    tipo: z.enum(["percentual", "valor", "frete"], "Escolha o tipo."),
    valor: z.string().trim(),
    minimo: dinheiro("Informe o pedido mínimo (0 = sem mínimo)."),
    descricao: z.string().trim().max(120, "Máximo de 120 caracteres."),
    valido_ate: z
      .string()
      .trim()
      .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Data inválida.")
      .transform((v) => (v === "" ? null : v)),
  })
  .transform((d, ctx) => {
    const n = d.tipo === "frete" ? 0 : lerMoeda(d.valor);
    if (d.tipo === "percentual" && !(n > 0 && n <= 100)) ctx.addIssue({ code: "custom", path: ["valor"], message: "Use um percentual de 1 a 100." });
    if (d.tipo === "valor" && !(n > 0 && n <= 100000)) ctx.addIssue({ code: "custom", path: ["valor"], message: "Informe o valor do desconto." });
    return { ...d, valor: n };
  });

export async function salvarCupom(_anterior: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const dados = esquema.safeParse(lerFormulario(formData));
  if (!dados.success) return falha("Confira os campos destacados.", errosDoZod(dados.error));
  const { id, ...campos } = dados.data;
  const registro = { ...campos, ativo: marcado(formData, "ativo") };
  const supabase = await createClient();
  const { error } = id ? await supabase.from("cupons").update(registro).eq("id", id) : await supabase.from("cupons").insert(registro);
  if (error?.code === "23505") return falha("Já existe um cupom com este código.", { codigo: "Já existe um cupom com este código." });
  if (error) return falha(mensagemErroBanco(error));
  revalidatePath("/painel/cupons");
  return sucesso(id ? "Cupom atualizado." : "Cupom criado.");
}

export async function excluirCupom(id: string): Promise<EstadoAcao> {
  if (!uuid.safeParse(id).success) return falha("Cupom inválido.");
  const supabase = await createClient();
  const { error } = await supabase.from("cupons").delete().eq("id", id);
  if (error) return falha(mensagemErroBanco(error));
  revalidatePath("/painel/cupons");
  return sucesso("Cupom excluído.");
}
