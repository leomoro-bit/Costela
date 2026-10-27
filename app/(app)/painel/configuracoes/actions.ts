"use server";

/**
 * MUTATIONS de Configurações — exemplo do PADRÃO do projeto (Server Actions):
 *   1. validar com zod
 *   2. gravar com o cliente Supabase do servidor (respeita RLS)
 *   3. revalidatePath() para as telas mostrarem o dado novo
 *   4. devolver EstadoAcao ({ ok, mensagem, erros }) para o formulário
 *
 * Nome exibido, frase de apresentação, logo, cores e fonte ficam em Personalização
 * (../personalizacao/actions.ts). Exemplo de ação de 1 clique com confirmação:
 * ../personalizacao/botao-restaurar.tsx
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type EstadoAcao, errosDoZod, falha, lerFormulario, marcado, mensagemErroBanco, sucesso } from "@/lib/acoes";
import { somenteDigitos } from "@/lib/formatar";
import { createClient } from "@/lib/supabase/server";
import { textoOpcional } from "@/lib/validacao";

const esquema = z.object({
  nome_negocio: z.string().trim().min(2, "Informe o nome do negócio.").max(80, "Máximo de 80 caracteres."),
  whatsapp: z
    .string()
    .transform((v) => somenteDigitos(v))
    .refine((v) => v === "" || (v.length >= 10 && v.length <= 13), "WhatsApp com DDD, ex.: (11) 90000-0000.")
    .transform((v) => (v === "" ? null : v)),
  cidade: textoOpcional(80),
  endereco: textoOpcional(160),
  instagram: textoOpcional(60).transform((v) => (v ? v.replace(/^@/, "") : v)),
  mensagem_whatsapp: textoOpcional(500),
  capa_url: textoOpcional(500).refine((v) => v === null || /^https?:\/\//i.test(v), "Use um link que comece com https://"),
  avaliacao: textoOpcional(10),
  tempo_retirada: z.string().trim().min(1, "Informe o tempo de retirada.").max(30),
  chave_pix: textoOpcional(120),
});

export async function salvarConfiguracoes(_anterior: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const dados = esquema.safeParse(lerFormulario(formData));
  if (!dados.success) return falha("Confira os campos destacados.", errosDoZod(dados.error));
  const opcoes = {
    aceitar_pedidos_fechado: marcado(formData, "aceitar_pedidos_fechado"),
    aceita_pix: marcado(formData, "aceita_pix"),
    aceita_cartao: marcado(formData, "aceita_cartao"),
    aceita_dinheiro: marcado(formData, "aceita_dinheiro"),
    som_novo_pedido: marcado(formData, "som_novo_pedido"),
  };
  if (!opcoes.aceita_pix && !opcoes.aceita_cartao && !opcoes.aceita_dinheiro) {
    return falha("Marque pelo menos uma forma de pagamento.", { aceita_pix: "Marque pelo menos uma forma de pagamento." });
  }

  const supabase = await createClient();
  // Linha única: "unica = true" + ON CONFLICT garante que sempre exista só uma.
  const { error } = await supabase
    .from("configuracoes")
    .upsert(
      {
        unica: true,
        ...dados.data,
        ...opcoes,
        // Campos legados ficam neutralizados porque este restaurante só oferece retirada.
        tempo_entrega: "Somente retirada",
        pedido_minimo: 0,
        entrega_gratis_acima: 0,
      },
      { onConflict: "unica" },
    );

  if (error) {
    console.error("[salvarConfiguracoes]", error);
    return falha(mensagemErroBanco(error));
  }

  // "layout" atualiza também o nome no topo/menu de todas as páginas.
  revalidatePath("/", "layout");
  return sucesso("Configurações salvas.");
}
