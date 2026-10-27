"use server";

/** MUTATIONS de Horários: faixas de funcionamento por dia da semana. */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type EstadoAcao, errosDoZod, falha, lerFormulario, mensagemErroBanco, sucesso } from "@/lib/acoes";
import { createClient } from "@/lib/supabase/server";
import { uuid } from "@/lib/validacao";

const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida (use HH:MM).");

const esquema = z
  .object({
    dia_semana: z.coerce.number().int().min(0).max(6),
    abre: hora,
    fecha: hora,
  })
  .refine((d) => d.abre !== d.fecha, { path: ["fecha"], message: "Abre e fecha não podem ser iguais." });

export async function adicionarHorario(_anterior: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const dados = esquema.safeParse(lerFormulario(formData));
  if (!dados.success) return falha("Confira os campos destacados.", errosDoZod(dados.error));
  const supabase = await createClient();
  const { error } = await supabase.from("horarios").insert(dados.data);
  if (error) return falha(mensagemErroBanco(error));
  revalidatePath("/painel/horarios");
  revalidatePath("/");
  return sucesso("Horário adicionado.");
}

export async function excluirHorario(id: string): Promise<EstadoAcao> {
  if (!uuid.safeParse(id).success) return falha("Horário inválido.");
  const supabase = await createClient();
  const { error } = await supabase.from("horarios").delete().eq("id", id);
  if (error) return falha(mensagemErroBanco(error));
  revalidatePath("/painel/horarios");
  revalidatePath("/");
  return sucesso("Horário removido.");
}
