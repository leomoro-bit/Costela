/**
 * Tela de Configurações — LEITURA no servidor (Server Component) e
 * GRAVAÇÃO via Server Action (./actions.ts) chamada pelo formulário (./form-configuracoes.tsx).
 */
import type { Metadata } from "next";
import { CabecalhoPagina } from "@/components/ui/cartao";
import { obterConfiguracoes } from "@/lib/configuracoes";
import { FormConfiguracoes } from "./form-configuracoes";

export const metadata: Metadata = { title: "Configurações" };

export default async function PaginaConfiguracoes() {
  const config = await obterConfiguracoes();
  return (
    <>
      <CabecalhoPagina
        titulo="Configurações"
        descricao="Dados do negócio usados nas telas, documentos e mensagens de WhatsApp."
      />
      {/* key: quando os dados mudam no servidor, o formulário reinicia com os valores novos */}
      <FormConfiguracoes key={config.updated_at} config={config} />
    </>
  );
}
