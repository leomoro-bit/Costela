"use client";

/**
 * CARDÁPIO DIGITAL do cliente final (página "/").
 *
 * Telas: Cardápio (capa, status aberto/fechado, busca, abas de categoria com
 * scrollspy, produtos) · Meus pedidos (histórico deste aparelho) · Informações.
 * Sacola: tela que sobe no celular / coluna fixa no computador (./sacola.tsx).
 * Ao enviar: o pedido é registrado no banco (número sequencial) e o WhatsApp
 * do restaurante abre com a mensagem pronta.
 */
import {
  CalendarDays,
  Check,
  Flame,
  Clock,
  CreditCard,
  Info,
  MapPin,
  MessageCircle,
  ReceiptText,
  RefreshCw,
  Search,
  ShoppingBag,
  Star,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useConfirmar } from "@/components/ui/confirmar";
import { TemaToggle } from "@/components/ui/tema-toggle";
import { useToast } from "@/components/ui/toast";
import {
  DIAS,
  type DadosCardapio,
  type EscolhaSacola,
  type ItemSacola,
  type PedidoCriado,
  type ProdutoPub,
  agoraEmSaoPaulo,
  hhmm,
  precoUnitario,
  statusFuncionamento,
} from "@/lib/cardapio";
import { LogoNegocio } from "@/components/logo-negocio";
import { formatarDataHora, formatarMoeda } from "@/lib/formatar";
import { cn } from "@/lib/utils";
import { linkWhatsApp } from "@/lib/whatsapp";
import { armazenamentoDisponivel, atualizarCliente, estadoVazio, novoId, useEstadoCliente } from "./estado-cliente";
import { FotoProduto } from "./foto-produto";
import { montarMensagemPedido } from "./mensagem";
import { ModalProduto, SeloProduto } from "./modal-produto";
import { Sacola } from "./sacola";

const m = formatarMoeda;
type View = "cardapio" | "pedidos" | "info";

/** "Minuto atual" que muda sozinho (status aberto/fechado). No servidor = null. */
function assinarMinuto(cb: () => void) {
  const t = window.setInterval(cb, 30_000);
  return () => window.clearInterval(t);
}
const lerMinuto = () => Math.floor(Date.now() / 60_000);
const lerMinutoServidor = () => null;

function semAcento(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function Cardapio({ dados }: { dados: DadosCardapio }) {
  const { marca, config, produtos, grupos, bairros, horarios } = dados;
  const toast = useToast();
  const confirmar = useConfirmar();
  const estado = useEstadoCliente();
  const minuto = useSyncExternalStore(assinarMinuto, lerMinuto, lerMinutoServidor);
  const status = useMemo(() => (minuto === null ? null : statusFuncionamento(horarios, new Date(minuto * 60_000))), [minuto, horarios]);

  const [view, setView] = useState<View>("cardapio");
  const [busca, setBusca] = useState("");
  const [sacolaAberta, setSacolaAberta] = useState(false);
  const [modal, setModal] = useState<{ produtoId: string; item: ItemSacola | null; chave: number } | null>(null);
  const [sucesso, setSucesso] = useState<{ numero: number; url: string; pix: boolean } | null>(null);

  const produtoPorId = useMemo(() => new Map(produtos.map((p) => [p.id, p])), [produtos]);
  const gruposDo = (p: ProdutoPub) => p.grupos.map((id) => grupos[id]).filter(Boolean);

  // Sacola "viva": refaz preços e opções com o cardápio ATUAL (preço mudou / item saiu).
  const sacola = useMemo(() => {
    const itens: ItemSacola[] = [];
    for (const it of estado.sacola) {
      const p = produtoPorId.get(it.produtoId);
      if (!p || !p.disponivel) continue;
      const escolhas: EscolhaSacola[] = p.grupos
        .map((gid) => grupos[gid])
        .filter(Boolean)
        .map((g) => {
          const ids = it.escolhas.find((e) => e.grupoId === g.id)?.itens.map((o) => o.id) ?? [];
          return { grupoId: g.id, grupo: g.titulo, itens: g.opcoes.filter((o) => ids.includes(o.id)) };
        })
        .filter((e) => e.itens.length);
      itens.push({ ...it, nome: p.nome, foto_url: p.foto_url, escolhas, precoUnit: precoUnitario(p, escolhas) });
    }
    return itens;
  }, [estado.sacola, produtoPorId, grupos]);
  const removidos = estado.sacola.length - sacola.length;
  const qtdItens = sacola.reduce((s, it) => s + it.qtd, 0);
  const subtotal = sacola.reduce((s, it) => s + it.precoUnit * it.qtd, 0);

  // O restaurante trabalha só com retirada. Corrige também qualquer estado antigo no navegador.
  useEffect(() => {
    if (estado.entrega.tipo !== "retirada") {
      atualizarCliente((a) => ({ ...a, entrega: { ...a.entrega, tipo: "retirada" } }));
    }
  }, [estado.entrega.tipo]);

  // Trava a rolagem do fundo quando a sacola cobre a tela (celular).
  useEffect(() => {
    if (!sacolaAberta) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sacolaAberta]);

  // Ao passar para o computador com a sacola aberta, fecha a "tela" do celular.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const aoMudar = () => mq.matches && setSacolaAberta(false);
    mq.addEventListener("change", aoMudar);
    return () => mq.removeEventListener("change", aoMudar);
  }, []);

  function irPara(v: View) {
    setSacolaAberta(false);
    setView(v);
    window.scrollTo({ top: 0 });
  }

  function abrirSacola() {
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    setSacolaAberta(true);
  }

  function abrirProduto(produtoId: string, item: ItemSacola | null = null) {
    const p = produtoPorId.get(produtoId);
    if (!p) return;
    if (!p.disponivel) {
      toast.erro("Este item está esgotado hoje.");
      return;
    }
    setModal({ produtoId, item, chave: Date.now() });
  }

  function confirmarProduto(novo: Omit<ItemSacola, "uid">) {
    const editado = modal?.item;
    if (editado) {
      atualizarCliente((a) => ({ ...a, sacola: a.sacola.map((it) => (it.uid === editado.uid ? { ...novo, uid: editado.uid } : it)) }));
      toast.sucesso("Item atualizado");
    } else {
      atualizarCliente((a) => ({ ...a, sacola: [...a.sacola, { ...novo, uid: novoId() }] }));
      toast.sucesso(`${novo.qtd}× ${novo.nome} na sacola`);
    }
    setModal(null);
  }

  function aoPedidoEnviado(pedido: PedidoCriado, cupomAplicado: string) {
    const texto = montarMensagemPedido(pedido, estado, marca, cupomAplicado);
    const url = linkWhatsApp(config.whatsapp, texto);
    const pix = estado.pagamento.forma === "pix";
    atualizarCliente((a) => ({
      ...a,
      pedidos: [
        { id: pedido.id, numero: pedido.numero, data: new Date().toISOString(), itens: sacola, tipo: a.entrega.tipo, total: pedido.total },
        ...a.pedidos,
      ].slice(0, 30),
      sacola: [],
      cupom: null,
      obs: "",
    }));
    setSacolaAberta(false);
    setSucesso({ numero: pedido.numero, url, pix });
    const janela = window.open(url, "_blank");
    if (janela) janela.opener = null;
  }

  function pedirDeNovo(itens: ItemSacola[]) {
    let fora = 0;
    const novos: ItemSacola[] = [];
    for (const it of itens) {
      const p = produtoPorId.get(it.produtoId);
      if (!p || !p.disponivel) {
        fora++;
        continue;
      }
      novos.push({ ...it, uid: novoId() });
    }
    atualizarCliente((a) => ({ ...a, sacola: [...a.sacola, ...novos] }));
    toast.sucesso(fora ? `Itens adicionados (${fora} indisponível hoje)` : "Itens adicionados à sacola");
    setView("cardapio");
    abrirSacola();
  }

  const produtoModal = modal ? produtoPorId.get(modal.produtoId) : null;

  return (
    <>
      {/* ===== BARRA SUPERIOR ===== */}
      <header className="sticky top-0 z-30 flex h-15 items-center gap-2.5 border-b border-borda bg-fundo/90 px-4 backdrop-blur">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <LogoNegocio nome={marca.nome} logoUrl={marca.logoUrl} className="font-titulo" />
          <span className="truncate font-titulo text-lg font-bold">{marca.nome}</span>
        </div>
        <TemaToggle className="rounded-full border border-borda bg-superficie" />
      </header>

      <div className="mx-auto max-w-[1440px] lg:grid lg:grid-cols-[210px_minmax(0,1fr)_350px] lg:items-start xl:grid-cols-[250px_minmax(0,1fr)_390px]">
        {/* ===== NAVEGAÇÃO LATERAL (COMPUTADOR) ===== */}
        <nav aria-label="Navegação principal" className="sticky top-15 hidden h-[calc(100dvh-60px)] flex-col gap-1 overflow-y-auto border-r border-borda px-3 py-5 lg:flex">
          <LinkLateral ativo={view === "cardapio"} onClick={() => irPara("cardapio")} icone={UtensilsCrossed}>
            Cardápio
          </LinkLateral>
          <LinkLateral ativo={view === "pedidos"} onClick={() => irPara("pedidos")} icone={ReceiptText}>
            Meus pedidos
          </LinkLateral>
          <LinkLateral ativo={view === "info"} onClick={() => irPara("info")} icone={Info}>
            Informações
          </LinkLateral>
          <div id="titulo-categorias" className={cn("px-3 pt-3.5 pb-1.5 text-xs font-bold tracking-[.08em] text-texto-2 uppercase", view !== "cardapio" && "invisible")}>
            Categorias
          </div>
          <div aria-labelledby="titulo-categorias" className={cn("flex flex-col gap-1", view !== "cardapio" && "invisible")} data-lateral-categorias />
        </nav>

        {/* ===== CONTEÚDO ===== */}
        <main id="conteudo" className="min-w-0 pb-[140px] lg:pb-[60px]">
          {!armazenamentoDisponivel() && (
            <div role="status" className="bg-cta-suave px-4 py-2 text-center text-[13px]">
              Seu navegador não permite salvar dados. A sacola funciona, mas será perdida ao fechar esta página.
            </div>
          )}

          {view === "cardapio" && (
            <ListaProdutos dados={dados} status={status} busca={busca} setBusca={setBusca} aoAbrir={(id) => abrirProduto(id)} />
          )}

          {view === "pedidos" && (
            <section className="px-4 py-[18px] lg:px-6">
              <h1 className="mb-1 text-[26px] font-bold">Meus pedidos</h1>
              <p className="mb-4 text-texto-2">Pedidos enviados deste aparelho. Toque em &quot;Pedir de novo&quot; para repetir.</p>
              {estado.pedidos.length === 0 ? (
                <div className="px-5 py-9 text-center text-texto-2">
                  <ReceiptText className="mx-auto mb-3 size-16 text-marca" aria-hidden />
                  <h2 className="mb-1.5 text-[19px] font-bold text-texto">Nenhum pedido ainda</h2>
                  <p className="mb-3.5">Quando você enviar um pedido, ele aparece aqui para repetir com 1 toque.</p>
                  <button type="button" onClick={() => irPara("cardapio")} className="min-h-11 rounded-full bg-marca px-5 font-semibold text-marca-texto">
                    Ver cardápio
                  </button>
                </div>
              ) : (
                estado.pedidos.map((p) => (
                  <article key={p.id} className="sombra-cartao mb-3 rounded-2xl border border-borda bg-superficie p-3.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <strong>Pedido #{p.numero}</strong>
                      <span className="text-[13.5px] text-texto-2">{formatarDataHora(p.data)}</span>
                    </div>
                    <p className="my-2 text-sm text-texto-2">
                      {p.itens.map((it) => `${it.qtd}× ${it.nome}`).join(" · ")}
                      <br />
                      <small>{p.tipo === "entrega" ? "Entrega" : "Retirada"}</small>
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="mr-auto font-bold">{m(p.total)}</span>
                      <button
                        type="button"
                        aria-label={`Excluir pedido #${p.numero} do histórico`}
                        onClick={async () => {
                          const ok = await confirmar({
                            titulo: "Excluir do histórico?",
                            mensagem: "Este pedido será removido apenas da lista deste aparelho.",
                            textoConfirmar: "Excluir",
                            perigo: true,
                          });
                          if (!ok) return;
                          atualizarCliente((a) => ({ ...a, pedidos: a.pedidos.filter((x) => x.id !== p.id) }));
                          toast.info("Pedido removido do histórico");
                        }}
                        className="grid size-11 place-items-center rounded-[10px] text-texto-2 hover:bg-superficie-2"
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                      <button type="button" onClick={() => pedirDeNovo(p.itens)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-marca px-4 font-semibold text-marca-texto">
                        <RefreshCw className="size-4" aria-hidden /> Pedir de novo
                      </button>
                    </div>
                  </article>
                ))
              )}
            </section>
          )}

          {view === "info" && <Informacoes dados={dados} />}
        </main>

        {/* ===== SACOLA ===== */}
        <Sacola
          config={config}
          bairros={bairros}
          itens={sacola}
          removidos={removidos}
          estado={estado}
          status={status}
          aberta={sacolaAberta}
          aoFechar={() => setSacolaAberta(false)}
          aoVerCardapio={() => irPara("cardapio")}
          aoEditarItem={(it) => abrirProduto(it.produtoId, it)}
          aoPedidoEnviado={aoPedidoEnviado}
        />
      </div>

      {/* ===== BARRA FLUTUANTE DA SACOLA (CELULAR) ===== */}
      {qtdItens > 0 && view === "cardapio" && !sacolaAberta && (
        <button
          type="button"
          onClick={abrirSacola}
          className="animar-subir fixed right-3 bottom-[calc(70px+env(safe-area-inset-bottom))] left-3 z-[35] flex min-h-[54px] items-center gap-2.5 rounded-2xl bg-cta px-[18px] text-base font-bold text-cta-texto shadow-2xl lg:hidden"
        >
          <ShoppingBag className="size-5" aria-hidden />
          <span>Ver sacola</span>
          <span className="rounded-lg bg-white/20 px-2 py-0.5 text-sm">{qtdItens}</span>
          <span className="ml-auto">{m(subtotal)}</span>
        </button>
      )}

      {/* ===== NAVEGAÇÃO INFERIOR (CELULAR) ===== */}
      <nav aria-label="Navegação" className="pb-seguro fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-borda bg-superficie lg:hidden">
        <ItemNav ativo={view === "cardapio" && !sacolaAberta} onClick={() => irPara("cardapio")} icone={UtensilsCrossed}>
          Cardápio
        </ItemNav>
        <ItemNav ativo={sacolaAberta} onClick={abrirSacola} icone={ShoppingBag} contador={qtdItens}>
          Sacola
        </ItemNav>
        <ItemNav ativo={view === "pedidos" && !sacolaAberta} onClick={() => irPara("pedidos")} icone={ReceiptText}>
          Pedidos
        </ItemNav>
        <ItemNav ativo={view === "info" && !sacolaAberta} onClick={() => irPara("info")} icone={Info}>
          Info
        </ItemNav>
      </nav>

      {produtoModal && modal && (
        <ModalProduto
          key={modal.chave}
          produto={produtoModal}
          grupos={gruposDo(produtoModal)}
          itemEditado={modal.item}
          aoFechar={() => setModal(null)}
          aoConfirmar={confirmarProduto}
        />
      )}

      {sucesso && (
        <DialogoSucesso
          {...sucesso}
          aoFechar={() => {
            setSucesso(null);
            irPara("cardapio");
          }}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Lista de produtos: capa, status, busca, abas com scrollspy e seções
// ---------------------------------------------------------------------------
function ListaProdutos({
  dados,
  status,
  busca,
  setBusca,
  aoAbrir,
}: {
  dados: DadosCardapio;
  status: ReturnType<typeof statusFuncionamento> | null;
  busca: string;
  setBusca: (v: string) => void;
  aoAbrir: (id: string) => void;
}) {
  const { marca, config, categorias, produtos, grupos } = dados;
  const isCostela = semAcento(marca.nome).includes("costela");
  const [catAtiva, setCatAtiva] = useState<string | null>(null);
  const abas = useRef<HTMLElement>(null);
  const termo = semAcento(busca.trim());

  const secoes = useMemo(
    () => categorias.map((c) => ({ ...c, itens: produtos.filter((p) => p.categoria_id === c.id) })).filter((c) => c.itens.length),
    [categorias, produtos],
  );
  const achados = termo ? produtos.filter((p) => semAcento(`${p.nome} ${p.descricao}`).includes(termo)) : [];
  const ativa = catAtiva ?? secoes[0]?.id ?? null;

  // Scrollspy: a aba acompanha a rolagem da página.
  useEffect(() => {
    if (termo) return;
    let raf = 0;
    const calcular = () => {
      const els = Array.from(document.querySelectorAll<HTMLElement>("[data-secao]"));
      if (!els.length) return;
      const desktop = window.matchMedia("(min-width: 1024px)").matches;
      const limite = (desktop ? 60 : 60 + (abas.current?.offsetHeight ?? 0)) + Math.min(180, window.innerHeight * 0.25);
      let atual = els[0].dataset.secao ?? null;
      for (const s of els) if (s.getBoundingClientRect().top - limite <= 0) atual = s.dataset.secao ?? atual;
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) atual = els[els.length - 1].dataset.secao ?? atual;
      setCatAtiva(atual);
    };
    const aoRolar = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(calcular);
    };
    window.addEventListener("scroll", aoRolar, { passive: true });
    raf = requestAnimationFrame(calcular);
    return () => {
      window.removeEventListener("scroll", aoRolar);
      cancelAnimationFrame(raf);
    };
  }, [termo]);

  // Mantém a aba ativa visível na barra horizontal (celular).
  useEffect(() => {
    const barra = abas.current;
    const aba = ativa ? barra?.querySelector<HTMLElement>(`[data-cat="${ativa}"]`) : null;
    if (barra && aba) barra.scrollTo({ left: aba.offsetLeft - 16, behavior: "smooth" });
  }, [ativa]);

  function irParaCategoria(id: string) {
    if (termo) setBusca("");
    requestAnimationFrame(() => {
      document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      setCatAtiva(id);
    });
  }

  const botoesCategorias = (classe: string) =>
    secoes.map((c) => (
      <button key={c.id} type="button" data-cat={c.id} aria-current={ativa === c.id} onClick={() => irParaCategoria(c.id)} className={classe}>
        {c.nome}
      </button>
    ));

  return (
    <section aria-label="Cardápio">
      {/* Capa da loja: layout especial Brasa para Costela Santo Antônio. */}
      {isCostela ? (
        <>
          <div className="relative isolate mx-4 mt-4 min-h-[232px] overflow-hidden rounded-2xl border border-[#5b451e] bg-[#080808] lg:mx-6 lg:mt-5 lg:min-h-[255px]">
            {config.capa_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={config.capa_url}
                alt="Costela assada na brasa"
                className="absolute inset-y-0 right-0 h-full w-[66%] object-cover object-center opacity-90 [mask-image:linear-gradient(to_right,transparent_0%,black_36%)]"
              />
            )}
            <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-[#080808] via-[#080808]/80 to-transparent" />
            <div className="relative z-10 flex max-w-[78%] items-start gap-3 px-4 pt-5 sm:max-w-[64%] lg:max-w-[62%] lg:items-center lg:px-6 lg:pt-6">
              <LogoNegocio nome={marca.nome} logoUrl={marca.logoUrl} tamanho="xl" className="size-[66px] sm:size-[76px]" />
              <div className="min-w-0 pt-1">
                <p className="mb-1 text-[10px] font-extrabold tracking-[.2em] text-[#D5A23A] sm:text-xs">COSTELA ASSADA AOS DOMINGOS</p>
                <h1 className="font-titulo text-[19px] font-extrabold leading-tight tracking-[.045em] text-[#E0AE43] sm:text-[25px] lg:text-[27px]">VÉSPERA DE SEGUNDA</h1>
                <p className="mt-1 text-[9px] font-medium uppercase tracking-[.12em] text-[#e8e0d1] sm:text-[10px]">Santo Antônio · Campos Novos - SC</p>
              </div>
            </div>
            <p className="relative z-10 max-w-[74%] px-4 pt-4 pb-4 font-titulo text-[14px] italic leading-snug text-[#f6efe3] sm:max-w-[59%] sm:text-[16px] lg:px-6 lg:pt-3 lg:text-[18px]">
              {marca.subtitulo ?? 'O melhor antídoto para a “fobia de segunda-feira” é uma boa costela no domingo.'}
            </p>
          </div>
          <div className="mx-4 mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3 lg:mx-6">
            <div className="flex min-h-[62px] items-center gap-3 rounded-xl border border-[#3c301a] bg-[#151515] px-3 py-2.5">
              <CalendarDays className="size-6 shrink-0 text-[#D5A23A]" aria-hidden />
              <div className="min-w-0 text-[11px] leading-snug text-[#c9c0b0]"><strong className="block text-[10px] tracking-wide text-[#f1e6d0]">FUNCIONAMENTO</strong>Domingos<br /><span className="text-[#D5A23A]">11h30 às 13h30</span></div>
            </div>
            <div className="flex min-h-[62px] items-center gap-3 rounded-xl border border-[#3c301a] bg-[#151515] px-3 py-2.5">
              <MapPin className="size-6 shrink-0 text-[#D5A23A]" aria-hidden />
              <div className="min-w-0 text-[11px] leading-snug text-[#c9c0b0]"><strong className="block text-[10px] tracking-wide text-[#f1e6d0]">RETIRADA</strong>Santo Antônio,<br />Campos Novos - SC</div>
            </div>
            <div className="flex min-h-[62px] items-center gap-3 rounded-xl border border-[#3c301a] bg-[#151515] px-3 py-2.5">
              <Clock className="size-6 shrink-0 text-[#D5A23A]" aria-hidden />
              <div className="min-w-0 text-[11px] leading-snug text-[#c9c0b0]"><strong className="block text-[10px] tracking-wide text-[#f1e6d0]">FAÇA SEU PEDIDO</strong>Até <span className="text-[#D5A23A]">9h30</span><br />do domingo</div>
            </div>
          </div>
          <div className="sr-only"><StatusLoja status={status} /></div>
        </>
      ) : (
        <>
          <div className="relative h-[180px] overflow-hidden bg-superficie-2 lg:mx-6 lg:mt-5 lg:h-[240px] lg:rounded-2xl">
            {config.capa_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.capa_url} alt="" className="size-full object-cover" />
            )}
            <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/5 from-30% to-black/45" />
          </div>
          <div className="sombra-cartao relative z-[2] mx-4 -mt-14 rounded-2xl border border-borda bg-superficie p-[18px] lg:mx-11 lg:-mt-[70px] lg:px-6 lg:py-[22px]">
            <h1 className="text-[26px] font-bold lg:text-[32px]">{marca.nome}</h1>
            {marca.subtitulo && <p className="mt-1 mb-3 text-[15px] text-texto-2">{marca.subtitulo}</p>}
            <StatusLoja status={status} />
            <div className="mt-3 flex flex-wrap gap-2">
              {config.avaliacao && (
                <Chip icone={Star}>
                  <strong>{config.avaliacao}</strong>
                </Chip>
              )}
              <Chip icone={Clock}>
                <strong>Retirada · {config.tempo_retirada}</strong>
              </Chip>
            </div>
          </div>
        </>
      )}

      {/* Busca */}
      <div className="px-4 pt-4 pb-1 lg:px-6">
        <label htmlFor="busca" className="sr-only">
          Buscar no cardápio
        </label>
        <div className="relative">
          <Search className="absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-texto-2" aria-hidden />
          <input
            id="busca"
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar pratos, lanches, bebidas..."
            autoComplete="off"
            className={cn("min-h-12 w-full border-[1.5px] border-borda bg-superficie px-11 text-base focus:border-marca focus:ring-3 focus:ring-marca-suave focus:outline-none [&::-webkit-search-cancel-button]:hidden", isCostela ? "rounded-lg border-[#5b451e] bg-[#151515] placeholder:text-[#8f8779]" : "rounded-full") }
          />
          {busca && (
            <button type="button" onClick={() => setBusca("")} aria-label="Limpar busca" className="absolute top-1/2 right-1 grid size-10 -translate-y-1/2 place-items-center rounded-full text-texto-2">
              <X className="size-5" aria-hidden />
            </button>
          )}
        </div>
      </div>

      {/* Abas de categoria (celular) */}
      {!termo && (
        <nav
          ref={abas}
          aria-label="Categorias do cardápio"
          className={cn("sem-barra sticky top-15 z-20 flex gap-1.5 overflow-x-auto border-b border-borda bg-fundo px-4 py-2.5 lg:hidden", isCostela && "border-[#302719] bg-[#080808]")}
        >
          {botoesCategorias(
            cn("min-h-10 shrink-0 rounded-full border border-borda bg-superficie px-4 text-[14.5px] font-semibold whitespace-nowrap text-texto-2 aria-[current=true]:border-marca aria-[current=true]:bg-marca aria-[current=true]:text-marca-texto", isCostela && "border-[#48371b] bg-[#141414] text-[#d2c7b5] aria-[current=true]:border-[#D5A23A] aria-[current=true]:bg-[#D5A23A] aria-[current=true]:text-[#090909]") as string,
          )}
        </nav>
      )}
      {/* Categorias na lateral (computador): portal simples para a <nav> lateral */}
      <CategoriasLateral>
        {botoesCategorias(
          "flex min-h-11 w-full items-center rounded-[10px] px-3 text-left font-semibold text-texto-2 hover:bg-superficie-2 aria-[current=true]:bg-marca-suave aria-[current=true]:text-marca-forte",
        )}
      </CategoriasLateral>

      {termo ? (
        achados.length ? (
          <section className="px-4 pt-[18px] pb-1 lg:px-6">
            <h2 className="mb-3 text-[22px] font-bold">
              Resultados
              <span className="ml-1.5 font-sans text-sm font-medium text-texto-2">
                {achados.length} {achados.length === 1 ? "item" : "itens"}
              </span>
            </h2>
            <GradeProdutos produtos={achados} grupos={grupos} aoAbrir={aoAbrir} />
          </section>
        ) : (
          <div className="px-5 py-9 text-center text-texto-2">
            <Search className="mx-auto mb-3 size-14 text-marca" aria-hidden />
            <h2 className="mb-1.5 text-[19px] font-bold text-texto">Nada encontrado para &quot;{busca}&quot;</h2>
            <p className="mb-3.5">Tente outro nome, como &quot;pizza&quot; ou &quot;suco&quot;.</p>
            <button type="button" onClick={() => setBusca("")} className="min-h-11 rounded-full border border-borda bg-superficie px-5 font-semibold">
              Ver cardápio completo
            </button>
          </div>
        )
      ) : secoes.length === 0 ? (
        <div className="px-5 py-12 text-center text-texto-2">
          <UtensilsCrossed className="mx-auto mb-3 size-14 text-marca" aria-hidden />
          <h2 className="mb-1.5 text-[19px] font-bold text-texto">Cardápio em preparação</h2>
          <p>Em breve os pratos aparecem aqui.</p>
        </div>
      ) : (
        secoes.map((c) => (
          <section key={c.id} id={`cat-${c.id}`} data-secao={c.id} aria-labelledby={`h-${c.id}`} className="scroll-mt-[124px] px-4 pt-[18px] pb-1 lg:scroll-mt-[72px] lg:px-6">
            {isCostela ? (
              <h2 id={`h-${c.id}`} className="mb-3 flex items-center gap-3 text-[17px] font-extrabold uppercase tracking-[.08em] text-[#D5A23A] sm:text-[19px]">
                <span aria-hidden className="h-px flex-1 bg-[#5b451e]" />
                <span>{c.nome}</span>
                <span className="text-xs font-medium tracking-normal text-[#9c9078]">{c.itens.length}</span>
                <span aria-hidden className="h-px flex-1 bg-[#5b451e]" />
              </h2>
            ) : (
              <h2 id={`h-${c.id}`} className="mb-3 text-[22px] font-bold">
                {c.nome}
                <span className="ml-1.5 font-sans text-sm font-medium text-texto-2">{c.itens.length}</span>
              </h2>
            )}
            <GradeProdutos produtos={c.itens} grupos={grupos} aoAbrir={aoAbrir} />
          </section>
        ))
      )}

      {isCostela && !termo && (
        <>
          <div className="mx-4 mt-7 grid grid-cols-3 gap-2 rounded-xl border border-[#5b451e] bg-[#0a0a0a] px-2 py-4 text-center lg:mx-6">
            <div className="flex flex-col items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-[#e8dfce] sm:text-[11px]"><Flame className="size-5 text-[#D5A23A]" aria-hidden />100% fogo de chão</div>
            <div className="flex flex-col items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-[#e8dfce] sm:text-[11px]"><Star className="size-5 text-[#D5A23A]" aria-hidden />Tempero especial</div>
            <div className="flex flex-col items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-[#e8dfce] sm:text-[11px]"><UtensilsCrossed className="size-5 text-[#D5A23A]" aria-hidden />Carne selecionada</div>
          </div>
          <footer className="mx-4 mt-4 border-t border-[#282116] px-2 py-5 text-center text-[11px] text-[#8d8577] lg:mx-6">
            © Costela Santo Antônio · Todos os direitos reservados.
          </footer>
        </>
      )}
      {isCostela && config.whatsapp && (
        <a
          href={linkWhatsApp(config.whatsapp, `Olá! Gostaria de fazer um pedido na ${marca.nome}.`)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Falar com a Costela Santo Antônio pelo WhatsApp"
          className="fixed right-4 bottom-[calc(76px+env(safe-area-inset-bottom))] z-30 grid size-12 place-items-center rounded-full bg-[#20c864] text-white shadow-[0_4px_18px_rgba(0,0,0,0.4)] transition-transform hover:scale-105 lg:bottom-5"
        >
          <MessageCircle className="size-6" aria-hidden />
        </a>
      )}
    </section>
  );
}

/** Coloca os botões de categoria dentro da <nav> lateral (computador) sem duplicar estado. */
function CategoriasLateral({ children }: { children: React.ReactNode }) {
  const alvo = useSyncExternalStore(
    () => () => undefined,
    () => document.querySelector<HTMLElement>("[data-lateral-categorias]"),
    () => null,
  );
  if (!alvo) return null;
  return <PortalSimples alvo={alvo}>{children}</PortalSimples>;
}

function PortalSimples({ alvo, children }: { alvo: HTMLElement; children: React.ReactNode }) {
  return createPortal(children, alvo);
}

function GradeProdutos({ produtos, grupos, aoAbrir }: { produtos: ProdutoPub[]; grupos: DadosCardapio["grupos"]; aoAbrir: (id: string) => void }) {
  return (
    <div className="grid gap-3 lg:grid-cols-[repeat(auto-fill,minmax(320px,1fr))]">
      {produtos.map((p) => {
        const aPartirDe = p.grupos.some((gid) => {
          const g = grupos[gid];
          return g?.obrigatorio && g.tipo === "unico" && g.opcoes.some((o) => o.preco > 0);
        });
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => aoAbrir(p.id)}
            aria-disabled={!p.disponivel || undefined}
            className={cn(
              "sombra-cartao flex min-h-[120px] w-full items-stretch gap-3 rounded-xl border border-borda bg-superficie p-2.5 text-left transition-transform hover:-translate-y-0.5 focus-visible:outline-offset-2",
              !p.disponivel && "opacity-60",
            )}
          >
            <div className={cn("relative size-[94px] shrink-0 self-center overflow-hidden rounded-lg bg-superficie-2 sm:size-[104px]", !p.disponivel && "grayscale")}>
              <FotoProduto key={p.foto_url} src={p.foto_url} alt={p.nome} className="size-full" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1 py-0.5">
              {!p.disponivel ? (
                <div><span className="inline-flex rounded bg-superficie-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-texto-2">Esgotado</span></div>
              ) : (
                p.selo && <div><SeloProduto selo={p.selo} /></div>
              )}
              <span className="font-bold leading-snug text-texto">{p.nome}</span>
              <span className="line-clamp-2 text-[11px] leading-snug text-texto-2 sm:text-xs">{p.descricao}</span>
              <span className="mt-auto flex flex-wrap items-baseline gap-1.5 pt-1 font-extrabold text-marca-forte">
                {aPartirDe && <span className="text-[11px] font-medium text-texto-2">a partir de</span>}
                {m(p.preco)}
                {p.preco_antigo && <span className="text-[11px] font-medium text-texto-2 line-through">{m(p.preco_antigo)}</span>}
              </span>
              <span className="mt-1 inline-flex min-h-7 w-fit items-center gap-1 rounded-md border border-[#8c6928] px-2 text-[10px] font-bold text-[#D5A23A]">
                <ShoppingBag className="size-3" aria-hidden /> {p.grupos.length ? "Escolher opções" : "Adicionar"}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function StatusLoja({ status }: { status: ReturnType<typeof statusFuncionamento> | null }) {
  if (!status) return <span className="inline-block h-8 w-44 animate-pulse rounded-full bg-superficie-2" aria-hidden />;
  return (
    <span
      role="status"
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold",
        status.aberto ? "bg-ok-suave text-ok" : "bg-perigo-suave text-perigo",
      )}
    >
      <span aria-hidden className="size-2 rounded-full bg-current shadow-[0_0_0_3px_color-mix(in_srgb,currentColor_25%,transparent)]" />
      {status.aberto ? `Aberto agora · fecha às ${status.fechaAs}` : `Fechado${status.abre ? " · abre " + status.abre : ""}`}
    </span>
  );
}

function Chip({ icone: Icone, children }: { icone: typeof Star; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-superficie-2 px-2.5 py-1.5 text-[13.5px] text-texto-2 [&_strong]:font-semibold [&_strong]:text-texto">
      <Icone className="size-4" aria-hidden />
      {children}
    </span>
  );
}

function LinkLateral({ ativo, onClick, icone: Icone, children }: { ativo: boolean; onClick: () => void; icone: typeof Star; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={ativo ? "page" : undefined}
      className="flex min-h-11 w-full items-center gap-2.5 rounded-[10px] px-3 text-left font-semibold text-texto-2 hover:bg-superficie-2 aria-[current=page]:bg-marca-suave aria-[current=page]:text-marca-forte"
    >
      <Icone className="size-5" aria-hidden />
      {children}
    </button>
  );
}

function ItemNav({
  ativo,
  onClick,
  icone: Icone,
  contador,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  icone: typeof Star;
  contador?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={ativo ? "page" : undefined}
      className="relative flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-xs font-semibold text-texto-2 aria-[current=page]:text-marca-forte"
    >
      <Icone className="size-[22px]" aria-hidden />
      {children}
      {!!contador && (
        <span className="absolute top-1.5 left-[calc(50%+6px)] grid h-5 min-w-5 place-items-center rounded-full bg-cta px-1.5 text-[11.5px] font-bold text-cta-texto">
          {contador}
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Informações: horários, endereço para retirada e pagamentos
// ---------------------------------------------------------------------------
function Informacoes({ dados }: { dados: DadosCardapio }) {
  const { marca, config, horarios } = dados;
  const toast = useToast();
  const confirmar = useConfirmar();
  const hoje = useSyncExternalStore(
    () => () => undefined,
    () => agoraEmSaoPaulo().dia,
    () => -1,
  );
  const pagamentos = [config.aceita_pix && "Pix", config.aceita_cartao && "Cartão na retirada", config.aceita_dinheiro && "Dinheiro"].filter(Boolean);

  return (
    <section className="px-4 py-[18px] lg:px-6">
      <h1 className="mb-1 text-[26px] font-bold">Informações</h1>
      {marca.subtitulo && <p className="mb-4 text-texto-2">{marca.subtitulo}</p>}

      <BlocoInfo titulo="Horário de funcionamento" icone={Clock}>
        <table className="w-full border-collapse text-[15px]">
          <tbody>
            {[1, 2, 3, 4, 5, 6, 0].map((d) => {
              const faixas = horarios.filter((h) => h.dia_semana === d);
              return (
                <tr key={d} className={cn(d === hoje && "font-bold text-marca-forte")}>
                  <td className="border-b border-borda py-2">
                    {DIAS[d]}
                    {d === hoje && " (hoje)"}
                  </td>
                  <td className={cn("border-b border-borda py-2 text-right", d !== hoje && "text-texto-2")}>
                    {faixas.length ? faixas.map((h) => `${hhmm(h.abre)}–${hhmm(h.fecha)}`).join(" · ") : "Fechado"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </BlocoInfo>

      {config.endereco && (
        <BlocoInfo titulo="Endereço" icone={MapPin}>
          <p className="mb-3">{config.endereco}</p>
          <div className="grid gap-2.5">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(config.endereco)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-borda bg-superficie px-4 font-semibold"
            >
              <MapPin className="size-5" aria-hidden /> Abrir no mapa
            </a>
            {config.whatsapp && (
              <a
                href={linkWhatsApp(config.whatsapp, `Olá, ${marca.nome}! Vim pelo cardápio digital e tenho uma dúvida:`)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-marca px-4 font-semibold text-marca-texto"
              >
                <MessageCircle className="size-5" aria-hidden /> Falar com o restaurante
              </a>
            )}
          </div>
        </BlocoInfo>
      )}

      <BlocoInfo titulo="Retirada no local" icone={MapPin}>
        <p><strong>Endereço:</strong> {config.endereco ?? "Confirme o endereço pelo WhatsApp."}</p>
        <p className="mt-2 text-texto-2">Previsão para retirada: {config.tempo_retirada}.</p>
        <p className="mt-2 text-sm text-texto-2">Atendimento exclusivo para retirada no local. Não fazemos entregas.</p>
      </BlocoInfo>

      <BlocoInfo titulo="Formas de pagamento" icone={CreditCard}>
        <p>{pagamentos.join(" · ")}</p>
      </BlocoInfo>

      <BlocoInfo titulo="Seus dados neste aparelho" icone={Info}>
        <button
          type="button"
          onClick={async () => {
            const ok = await confirmar({
              titulo: "Começar do zero?",
              mensagem: "A sacola, seus dados salvos e o histórico de pedidos deste aparelho serão apagados.",
              textoConfirmar: "Apagar tudo",
              perigo: true,
            });
            if (!ok) return;
            atualizarCliente(() => estadoVazio());
            toast.info("Pronto! Tudo limpo.");
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-borda bg-superficie px-4 font-semibold text-perigo"
        >
          <RefreshCw className="size-5" aria-hidden /> Limpar meus dados deste aparelho
        </button>
        <p className="mt-2.5 text-[13px] text-texto-2">
          Sua sacola, endereço e histórico ficam salvos só neste navegador. O pedido é registrado no restaurante quando você o envia.
        </p>
      </BlocoInfo>
    </section>
  );
}

function BlocoInfo({ titulo, icone: Icone, children }: { titulo: string; icone: typeof Star; children: React.ReactNode }) {
  return (
    <section className="mb-3.5 rounded-2xl border border-borda bg-superficie p-3.5">
      <h2 className="mb-3 flex items-center gap-2 text-[17px] font-bold">
        <Icone className="size-5" aria-hidden />
        {titulo}
      </h2>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Pedido registrado
// ---------------------------------------------------------------------------
function DialogoSucesso({ numero, url, pix, aoFechar }: { numero: number; url: string; pix: boolean; aoFechar: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="sucesso-titulo"
      onCancel={(e) => {
        e.preventDefault();
        aoFechar();
      }}
      className="animar-subir m-auto w-[calc(100%-2rem)] max-w-[420px] rounded-[20px] border-0 bg-superficie p-[22px] text-center text-texto shadow-2xl backdrop:bg-black/55"
    >
      <div className="mx-auto mb-3 grid size-16 place-items-center rounded-full bg-marca-suave text-ok">
        <Check className="size-[34px]" aria-hidden />
      </div>
      <h2 id="sucesso-titulo" className="mb-2 text-[21px] font-bold">
        Pedido #{numero} pronto!
      </h2>
      <p className="mb-[18px] text-texto-2">
        Abrimos o WhatsApp com seu pedido. É só tocar em <strong>enviar</strong> lá. {pix && "A chave Pix vem na resposta."}
      </p>
      <div className="grid gap-2.5">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-cta px-5 font-semibold text-cta-texto"
        >
          <MessageCircle className="size-5" aria-hidden /> Abrir o WhatsApp
        </a>
        <button type="button" onClick={aoFechar} autoFocus className="min-h-11 rounded-full border border-borda bg-superficie px-5 font-semibold">
          Voltar ao cardápio
        </button>
      </div>
    </dialog>
  );
}
