"use client";

/**
 * Formulário padrão do projeto: useAcao(serverAction) + <form onSubmit> + <Botao carregando>.
 * O hook mostra o toast de sucesso/erro e devolve os erros por campo.
 */
import Link from "next/link";
import { ImagePlus, Palette } from "lucide-react";
import { useState } from "react";
import { Botao } from "@/components/ui/botao";
import { AreaTexto, Campo, Entrada } from "@/components/ui/campo";
import { Cartao } from "@/components/ui/cartao";
import { Marcador } from "@/components/ui/modal";
import { FotoProduto } from "@/components/cardapio/foto-produto";
import { useToast } from "@/components/ui/toast";
import { formatarTelefone } from "@/lib/formatar";
import { createClient } from "@/lib/supabase/client";
import type { Configuracoes } from "@/lib/tipos";
import { useAcao } from "@/lib/use-acao";
import { salvarConfiguracoes } from "./actions";

export function FormConfiguracoes({ config }: { config: Configuracoes }) {
  const { onSubmit, erros: e, pendente } = useAcao(salvarConfiguracoes);
  const toast = useToast();
  const [capa, setCapa] = useState(config.capa_url ?? "");
  const [enviandoCapa, setEnviandoCapa] = useState(false);

  async function enviarCapa(arquivo: File | undefined) {
    if (!arquivo) return;
    if (!/^image\/(jpeg|png|webp)$/.test(arquivo.type)) {
      toast.erro("Use uma imagem JPG, PNG ou WEBP para a capa.");
      return;
    }
    if (arquivo.size > 5 * 1024 * 1024) {
      toast.erro("A imagem de capa pode ter no máximo 5 MB.");
      return;
    }
    setEnviandoCapa(true);
    try {
      const supabase = createClient();
      const ext = arquivo.type === "image/png" ? "png" : arquivo.type === "image/webp" ? "webp" : "jpg";
      const caminho = `capas/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("produtos").upload(caminho, arquivo, {
        contentType: arquivo.type,
        cacheControl: "31536000",
      });
      if (error) throw error;
      setCapa(supabase.storage.from("produtos").getPublicUrl(caminho).data.publicUrl);
      toast.sucesso("Foto de capa enviada. Clique em Salvar configurações para publicar.");
    } catch (erro) {
      console.error("[enviarCapa]", erro);
      toast.erro("Não foi possível enviar a capa. Confira se o bucket ‘produtos’ foi criado pelo schema.sql.");
    } finally {
      setEnviandoCapa(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <Cartao className="space-y-4">
        <h2 className="text-base font-semibold text-texto">Negócio</h2>
        <Campo rotulo="Nome do negócio" nome="nome_negocio" erro={e.nome_negocio}>
          {(p) => <Entrada {...p} defaultValue={config.nome_negocio} required maxLength={80} autoComplete="organization" />}
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="WhatsApp que recebe os pedidos" nome="whatsapp" erro={e.whatsapp} ajuda="Com DDD. Ex.: (11) 90000-0000">
            {(p) => (
              <Entrada
                {...p}
                type="tel"
                inputMode="tel"
                defaultValue={formatarTelefone(config.whatsapp)}
                placeholder="(11) 90000-0000"
                autoComplete="tel"
              />
            )}
          </Campo>
          <Campo rotulo="Instagram" nome="instagram" erro={e.instagram}>
            {(p) => <Entrada {...p} defaultValue={config.instagram ?? ""} placeholder="@seunegocio" />}
          </Campo>
          <Campo rotulo="Cidade" nome="cidade" erro={e.cidade}>
            {(p) => <Entrada {...p} defaultValue={config.cidade ?? ""} placeholder="São Paulo - SP" />}
          </Campo>
          <Campo rotulo="Endereço (retirada)" nome="endereco" erro={e.endereco}>
            {(p) => <Entrada {...p} defaultValue={config.endereco ?? ""} placeholder="Rua, número, bairro" />}
          </Campo>
        </div>
      </Cartao>

      <Cartao className="space-y-4">
        <h2 className="text-base font-semibold text-texto">Página do cardápio</h2>
        <div className="grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)] sm:items-start">
          <FotoProduto src={capa || null} alt="Prévia da foto de capa" className="h-28 w-full rounded-xl sm:h-32" />
          <div className="space-y-2">
            <Campo rotulo="Foto de capa (link ou arquivo)" nome="capa_url" erro={e.capa_url} ajuda="Cole um link https:// ou envie uma imagem JPG, PNG ou WEBP de até 5 MB.">
              {(p) => <Entrada {...p} type="url" inputMode="url" value={capa} onChange={(ev) => setCapa(ev.target.value)} placeholder="https://..." />}
            </Campo>
            <label className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-borda px-4 text-sm font-semibold hover:bg-superficie-2 ${enviandoCapa ? "pointer-events-none opacity-60" : ""}`}>
              <ImagePlus className="size-4" aria-hidden />
              {enviandoCapa ? "Enviando imagem..." : "Enviar foto de capa"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={enviandoCapa}
                onChange={(ev) => {
                  void enviarCapa(ev.target.files?.[0]);
                  ev.target.value = "";
                }}
              />
            </label>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Avaliação" nome="avaliacao" erro={e.avaliacao} ajuda="Ex.: 4,8 (opcional)">
            {(p) => <Entrada {...p} defaultValue={config.avaliacao ?? ""} maxLength={10} />}
          </Campo>
          <Campo rotulo="Tempo para retirada" nome="tempo_retirada" erro={e.tempo_retirada}>
            {(p) => <Entrada {...p} defaultValue={config.tempo_retirada} maxLength={30} placeholder="30–45 min" />}
          </Campo>
        </div>
      </Cartao>

      <Link
        href="/painel/personalizacao"
        className="flex min-h-11 items-center gap-3 rounded-2xl border border-dashed border-borda p-4 text-sm text-texto-2 hover:bg-superficie-2"
      >
        <Palette className="size-5 shrink-0 text-marca-forte" aria-hidden />
        <span>
          <strong className="text-texto">Logo, cores, fonte e frase de apresentação</strong> do cardápio ficam em{" "}
          <span className="font-medium text-marca-forte underline">Personalização</span>.
        </span>
      </Link>

      <Cartao className="space-y-4">
        <h2 className="text-base font-semibold text-texto">Pedidos e funcionamento</h2>
        <Marcador
          nome="aceitar_pedidos_fechado"
          rotulo="Aceitar pedidos com a loja fechada"
          ajuda="O cliente é avisado de que o pedido será respondido na abertura."
          defaultChecked={config.aceitar_pedidos_fechado}
        />
        <Marcador
          nome="som_novo_pedido"
          rotulo="Tocar aviso sonoro quando chegar pedido novo"
          ajuda="Na tela Pedidos do painel."
          defaultChecked={config.som_novo_pedido}
        />
      </Cartao>

      <Cartao className="space-y-2">
        <h2 className="text-base font-semibold text-texto">Formas de pagamento</h2>
        <div className="grid sm:grid-cols-3">
          <Marcador nome="aceita_pix" rotulo="Pix" defaultChecked={config.aceita_pix} />
          <Marcador nome="aceita_cartao" rotulo="Cartão na retirada" defaultChecked={config.aceita_cartao} />
          <Marcador nome="aceita_dinheiro" rotulo="Dinheiro" defaultChecked={config.aceita_dinheiro} />
        </div>
        {e.aceita_pix && (
          <p role="alert" className="text-sm text-perigo">
            {e.aceita_pix}
          </p>
        )}
        <Campo rotulo="Chave Pix" nome="chave_pix" erro={e.chave_pix} ajuda="Usada na mensagem de WhatsApp que você manda ao cliente.">
          {(p) => <Entrada {...p} defaultValue={config.chave_pix ?? ""} maxLength={120} />}
        </Campo>
        <Campo
          rotulo="Mensagem padrão do WhatsApp"
          nome="mensagem_whatsapp"
          erro={e.mensagem_whatsapp}
          ajuda="Opcional. Pode usar {nome} para o nome do cliente."
        >
          {(p) => <AreaTexto {...p} defaultValue={config.mensagem_whatsapp ?? ""} maxLength={500} rows={3} />}
        </Campo>
      </Cartao>

      <div className="flex justify-end">
        <Botao type="submit" carregando={pendente} className="w-full sm:w-auto">
          {pendente ? "Salvando..." : "Salvar configurações"}
        </Botao>
      </div>
    </form>
  );
}
