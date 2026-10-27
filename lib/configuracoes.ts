/**
 * Leitura da linha única de `configuracoes` (nome do negócio, WhatsApp, marca...).
 *
 * `cache()` faz o layout e a página compartilharem a MESMA consulta por requisição.
 * Se a tabela ainda não existir ou estiver vazia, devolve valores padrão
 * (o app continua abrindo e a tela de Configurações cria a linha ao salvar).
 */
import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Configuracoes } from "@/lib/tipos";

export const CONFIG_PADRAO: Configuracoes = {
  id: "",
  unica: true,
  nome_negocio: "Costela Santo Antônio",
  whatsapp: null,
  cidade: null,
  endereco: null,
  instagram: null,
  cor_primaria: "#D5A23A",
  mensagem_whatsapp: null,
  subtitulo: null,
  capa_url: null,
  avaliacao: null,
  tempo_entrega: "Somente retirada",
  tempo_retirada: "30–45 min",
  pedido_minimo: 0,
  entrega_gratis_acima: 0,
  aceitar_pedidos_fechado: true,
  aceita_pix: true,
  aceita_cartao: true,
  aceita_dinheiro: true,
  chave_pix: null,
  som_novo_pedido: true,
  nome_exibicao: null,
  logo_url: null,
  cor_destaque: "#D5A23A",
  fonte: "elegante",
  raio: "medio",
  tema_padrao: "escuro",
  created_at: "",
  updated_at: "",
};

export const obterConfiguracoes = cache(async (): Promise<Configuracoes & { erro?: string }> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("configuracoes").select("*").limit(1).maybeSingle();
  if (error) {
    console.error("[configuracoes]", error.message);
    return { ...CONFIG_PADRAO, erro: error.message };
  }
  return data ?? CONFIG_PADRAO;
});
