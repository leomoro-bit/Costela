/**
 * Tela de PERSONALIZAÇÃO — o dono do negócio muda a marca do app SEM mexer em código:
 * logo, cores (paletas prontas ou personalizadas), fonte, nome exibido, subtítulo,
 * tema padrão e arredondamento, com prévia ao vivo antes de salvar.
 *
 * Leitura aqui (Server Component) → formulário client (./form-personalizacao.tsx)
 * → Server Actions (./actions.ts). A marca salva é aplicada pelo app/layout.tsx.
 */
import type { Metadata } from "next";
import { CabecalhoPagina } from "@/components/ui/cartao";
import { obterConfiguracoes } from "@/lib/configuracoes";
import { normalizarMarca } from "@/lib/marca";
import { BotaoRestaurar } from "./botao-restaurar";
import { FormPersonalizacao } from "./form-personalizacao";

export const metadata: Metadata = { title: "Personalização" };

export default async function PaginaPersonalizacao() {
  const config = await obterConfiguracoes();
  const marca = normalizarMarca({ ...config, nome_exibido: config.nome_negocio });

  return (
    <>
      <CabecalhoPagina
        titulo="Personalização"
        descricao="Logo, cores, fonte e nome do app. Veja a prévia e salve quando gostar."
        acoes={<BotaoRestaurar />}
      />
      {/* key: depois de salvar, o formulário reinicia com os valores novos */}
      <FormPersonalizacao
        key={config.updated_at}
        nomeNegocio={config.nome_negocio}
        inicial={{
          nome_exibicao: config.nome_exibicao ?? "",
          subtitulo: config.subtitulo ?? "",
          logo_url: marca.logoUrl,
          cor_primaria: marca.corPrimaria,
          cor_destaque: marca.corDestaque,
          fonte: marca.fonte,
          raio: marca.raio,
          tema_padrao: marca.temaPadrao,
        }}
      />
    </>
  );
}
