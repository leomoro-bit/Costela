"use client";

/**
 * Lista de pedidos com:
 *  - REALTIME (Supabase): pedido novo aparece sozinho + aviso sonoro + toast;
 *  - mudança de status (novo → preparando → saiu → entregue / cancelado);
 *  - WhatsApp para o cliente com mensagem pronta do status;
 *  - impressão da comanda de um pedido.
 */
import {
  Bell,
  BellOff,
  Bike,
  ChefHat,
  CircleCheck,
  MessageCircle,
  PackageCheck,
  Printer,
  ReceiptText,
  Store,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { LogoNegocio } from "@/components/logo-negocio";
import { Cartao, Selo } from "@/components/ui/cartao";
import { useConfirmar } from "@/components/ui/confirmar";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { useToast } from "@/components/ui/toast";
import { formatarDataHora, formatarHora, formatarMoeda, formatarTelefone } from "@/lib/formatar";
import { createClient } from "@/lib/supabase/client";
import type { OpcoesItem, Pedido, PedidoItem, StatusPedido } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import { linkWhatsApp } from "@/lib/whatsapp";
import { mudarStatusPedido } from "./actions";

export type FiltroPedidos = "abertos" | StatusPedido | "todos";

const m = formatarMoeda;

const ROTULOS_FILTRO: Record<FiltroPedidos, string> = {
  abertos: "Em aberto",
  novo: "Novos",
  preparando: "Preparando",
  saiu: "Saiu / pronto",
  entregue: "Entregues",
  cancelado: "Cancelados",
  todos: "Todos",
};

function rotuloStatus(status: StatusPedido, tipo: Pedido["tipo"]) {
  if (status === "saiu") return tipo === "entrega" ? "Saiu para entrega" : "Pronto p/ retirada";
  return { novo: "Novo", preparando: "Preparando", entregue: "Entregue", cancelado: "Cancelado" }[status];
}
const COR_STATUS = { novo: "info", preparando: "alerta", saiu: "marca", entregue: "ok", cancelado: "perigo" } as const;

function proximoPasso(p: Pedido): { status: StatusPedido; rotulo: string; icone: typeof ChefHat } | null {
  if (p.status === "novo") return { status: "preparando", rotulo: "Começar preparo", icone: ChefHat };
  if (p.status === "preparando")
    return p.tipo === "entrega"
      ? { status: "saiu", rotulo: "Saiu para entrega", icone: Bike }
      : { status: "saiu", rotulo: "Pronto p/ retirada", icone: PackageCheck };
  if (p.status === "saiu") return { status: "entregue", rotulo: "Marcar entregue", icone: CircleCheck };
  return null;
}

function mensagemCliente(p: Pedido, negocio: { nome: string; chavePix: string | null }) {
  const nome = p.cliente_nome.split(" ")[0];
  switch (p.status) {
    case "novo":
      return (
        `Olá, ${nome}! Aqui é do ${negocio.nome}. Recebemos seu pedido #${p.numero} (total ${m(p.total)}).` +
        (p.pagamento === "pix" && negocio.chavePix ? `\n\nChave Pix: ${negocio.chavePix}` : "") +
        "\n\nJá já começamos o preparo!"
      );
    case "preparando":
      return `Olá, ${nome}! Seu pedido #${p.numero} já está sendo preparado no ${negocio.nome}.`;
    case "saiu":
      return p.tipo === "entrega"
        ? `Olá, ${nome}! Seu pedido #${p.numero} saiu para entrega e logo chega aí.`
        : `Olá, ${nome}! Seu pedido #${p.numero} está pronto para retirada no ${negocio.nome}.`;
    case "entregue":
      return `Olá, ${nome}! Obrigado pelo pedido #${p.numero}. Esperamos que tenha gostado! 😋`;
    default:
      return `Olá, ${nome}! Sobre o seu pedido #${p.numero} no ${negocio.nome}:`;
  }
}

/** Três bipes curtos com a Web Audio API (não precisa de arquivo de som). */
function tocarAviso(ctx: AudioContext) {
  const t0 = ctx.currentTime;
  [0, 0.2, 0.4].forEach((t, i) => {
    const osc = ctx.createOscillator();
    const ganho = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = i === 2 ? 1175 : 880;
    ganho.gain.setValueAtTime(0.0001, t0 + t);
    ganho.gain.exponentialRampToValueAtTime(0.35, t0 + t + 0.02);
    ganho.gain.exponentialRampToValueAtTime(0.0001, t0 + t + 0.17);
    osc.connect(ganho).connect(ctx.destination);
    osc.start(t0 + t);
    osc.stop(t0 + t + 0.18);
  });
}

export function PainelPedidos({
  filtro,
  pedidos,
  itens,
  contagem,
  kpis,
  negocio,
}: {
  filtro: FiltroPedidos;
  pedidos: Pedido[];
  itens: PedidoItem[];
  contagem: Partial<Record<StatusPedido, number>>;
  kpis: { hoje: number; faturamento: number; ticket: number };
  /** nome/logo = marca (Personalização); usados na comanda impressa e nas mensagens. */
  negocio: { nome: string; logoUrl: string | null; chavePix: string | null; som: boolean };
}) {
  const router = useRouter();
  const toast = useToast();
  const audio = useRef<AudioContext | null>(null);
  const [somLiberado, setSomLiberado] = useState(false);
  const [somLigado, setSomLigado] = useState(negocio.som);
  const [conectado, setConectado] = useState<boolean | null>(null);
  const somRef = useRef(somLigado);

  useEffect(() => {
    somRef.current = somLigado;
  }, [somLigado]);

  // Navegadores só deixam tocar som depois de um toque/clique na página.
  useEffect(() => {
    const liberar = () => {
      try {
        audio.current ??= new AudioContext();
        void audio.current.resume();
        setSomLiberado(true);
      } catch {
        /* navegador sem Web Audio */
      }
    };
    window.addEventListener("pointerdown", liberar, { once: true });
    window.addEventListener("keydown", liberar, { once: true });
    return () => {
      window.removeEventListener("pointerdown", liberar);
      window.removeEventListener("keydown", liberar);
    };
  }, []);

  // REALTIME: escuta INSERT/UPDATE na tabela pedidos (RLS: só a equipe logada recebe).
  useEffect(() => {
    const supabase = createClient();
    let canal: ReturnType<typeof supabase.channel> | null = null;
    let ativo = true;
    void (async () => {
      // Entra no canal JÁ com o token do usuário logado (senão o RLS trata como visitante e não manda nada).
      const { data } = await supabase.auth.getSession();
      if (!ativo) return;
      if (data.session) await supabase.realtime.setAuth(data.session.access_token);
      canal = supabase
        .channel("painel-pedidos")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "pedidos" }, (payload) => {
          const novo = payload.new as Partial<Pedido>;
          if (somRef.current && audio.current) tocarAviso(audio.current);
          toast.sucesso(`Novo pedido #${novo.numero ?? ""} — ${novo.cliente_nome ?? ""} (${m(novo.total ?? 0)})`);
          router.refresh();
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "pedidos" }, () => router.refresh())
        .subscribe((estado) => setConectado(estado === "SUBSCRIBED"));
    })();
    return () => {
      ativo = false;
      if (canal) void supabase.removeChannel(canal);
    };
  }, [router, toast]);

  const itensPorPedido = new Map<string, PedidoItem[]>();
  for (const it of itens) itensPorPedido.set(it.pedido_id, [...(itensPorPedido.get(it.pedido_id) ?? []), it]);
  const abertos = (contagem.novo ?? 0) + (contagem.preparando ?? 0) + (contagem.saiu ?? 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 nao-imprimir">
        <Kpi rotulo="Pedidos hoje" valor={String(kpis.hoje)} icone={ReceiptText} />
        <Kpi rotulo="Faturamento hoje" valor={m(kpis.faturamento)} icone={Wallet} />
        <Kpi rotulo="Ticket médio" valor={m(kpis.ticket)} icone={Store} />
        <Kpi rotulo="Em aberto" valor={String(abertos)} icone={ChefHat} destaque={(contagem.novo ?? 0) > 0} />
      </div>

      <div className="flex flex-wrap items-center gap-2 nao-imprimir">
        <span
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold",
            conectado ? "bg-ok-suave text-ok" : "bg-superficie-2 text-texto-2",
          )}
          role="status"
        >
          <span aria-hidden className={cn("size-2 rounded-full", conectado ? "animate-pulse bg-ok" : "bg-texto-2")} />
          {conectado ? "Recebendo pedidos em tempo real" : conectado === false ? "Reconectando..." : "Conectando..."}
        </span>
        <button
          type="button"
          onClick={() => setSomLigado((v) => !v)}
          aria-pressed={somLigado}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-texto-2 hover:bg-superficie-2"
        >
          {somLigado ? <Bell className="size-4" aria-hidden /> : <BellOff className="size-4" aria-hidden />}
          {somLigado ? "Som ligado" : "Som desligado"}
        </button>
        {somLigado && !somLiberado && <span className="text-xs text-texto-2">Toque em qualquer lugar da tela para liberar o som.</span>}
      </div>

      <nav aria-label="Filtrar pedidos" className="sem-barra -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 nao-imprimir sm:mx-0 sm:flex-wrap sm:px-0">
        {(Object.keys(ROTULOS_FILTRO) as FiltroPedidos[]).map((f) => {
          const n = f === "abertos" ? abertos : f === "novo" || f === "preparando" || f === "saiu" ? contagem[f] : undefined;
          return (
            <Link
              key={f}
              href={f === "abertos" ? "/painel" : `/painel?status=${f}`}
              aria-current={filtro === f ? "page" : undefined}
              className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-borda bg-superficie px-4 text-sm font-semibold text-texto-2 aria-[current=page]:border-marca aria-[current=page]:bg-marca aria-[current=page]:text-marca-texto"
            >
              {ROTULOS_FILTRO[f]}
              {!!n && <span className="rounded-full bg-black/10 px-1.5 text-xs">{n}</span>}
            </Link>
          );
        })}
      </nav>

      {pedidos.length === 0 ? (
        <EstadoVazio
          icone={ReceiptText}
          titulo={filtro === "abertos" ? "Nenhum pedido em aberto" : "Nenhum pedido aqui"}
          descricao="Quando um cliente enviar um pedido pelo cardápio, ele aparece aqui na hora (com aviso sonoro)."
          acao={
            <a href="/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-xl border border-borda px-4 text-sm font-semibold">
              Abrir o cardápio
            </a>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {pedidos.map((p) => (
            <CartaoPedido key={p.id} pedido={p} itens={itensPorPedido.get(p.id) ?? []} negocio={negocio} />
          ))}
        </div>
      )}
    </div>
  );
}

function Kpi({ rotulo, valor, icone: Icone, destaque }: { rotulo: string; valor: string; icone: typeof Bell; destaque?: boolean }) {
  return (
    <Cartao className={cn("p-4", destaque && "border-cta")}>
      <p className="flex items-center gap-1.5 text-xs font-semibold text-texto-2 sm:text-sm">
        <Icone className="size-4" aria-hidden /> {rotulo}
      </p>
      <p className="mt-1 font-titulo text-xl font-bold text-texto sm:text-2xl">{valor}</p>
    </Cartao>
  );
}

function CartaoPedido({
  pedido: p,
  itens,
  negocio,
}: {
  pedido: Pedido;
  itens: PedidoItem[];
  negocio: { nome: string; logoUrl: string | null; chavePix: string | null };
}) {
  const toast = useToast();
  const confirmar = useConfirmar();
  const [pendente, iniciar] = useTransition();
  const cartao = useRef<HTMLElement>(null);
  const passo = proximoPasso(p);

  function mudar(status: StatusPedido) {
    iniciar(async () => {
      const r = await mudarStatusPedido(p.id, status);
      if (r.ok) toast.sucesso(`Pedido #${p.numero}: ${rotuloStatus(status, p.tipo)}`);
      else toast.erro(r.mensagem ?? "Não foi possível mudar o status.");
    });
  }

  async function aoEscolherStatus(status: StatusPedido) {
    if (status === p.status) return;
    if (status === "cancelado") {
      const ok = await confirmar({
        titulo: `Cancelar o pedido #${p.numero}?`,
        mensagem: "Ele sai da lista de pedidos em aberto. Avise o cliente pelo WhatsApp.",
        textoConfirmar: "Cancelar pedido",
        textoCancelar: "Voltar",
        perigo: true,
      });
      if (!ok) return;
    }
    mudar(status);
  }

  function imprimir() {
    const el = cartao.current;
    if (!el) return;
    document.body.classList.add("imprimindo-um");
    el.classList.add("imprimir-este");
    const limpar = () => {
      document.body.classList.remove("imprimindo-um");
      el.classList.remove("imprimir-este");
      window.removeEventListener("afterprint", limpar);
    };
    window.addEventListener("afterprint", limpar);
    window.print();
  }

  return (
    <article ref={cartao} data-pedido={p.numero} className={cn("rounded-2xl border border-borda bg-superficie p-4 shadow-sm sm:p-5", p.status === "novo" && "border-info ring-2 ring-info/20")}>
      {/* Cabeçalho da COMANDA (só no papel): logo pequena em preto e branco (ou só o nome, sem logo). */}
      <div className="mb-3 hidden items-center gap-2 border-b border-dashed border-borda pb-2 print:flex" data-comanda-cabecalho>
        {negocio.logoUrl && (
          <LogoNegocio nome={negocio.nome} logoUrl={negocio.logoUrl} tamanho="sm" className="grayscale" />
        )}
        <p className="min-w-0 truncate font-bold">{negocio.nome}</p>
      </div>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">Pedido #{p.numero}</h2>
          <p className="text-sm text-texto-2" title={formatarDataHora(p.created_at)}>
            {formatarHora(p.created_at)} · {formatarDataHora(p.created_at).split(",")[0]}
            {p.fora_do_horario && " · fora do horário"}
          </p>
        </div>
        <Selo cor={COR_STATUS[p.status]}>{rotuloStatus(p.status, p.tipo)}</Selo>
      </header>

      <div className="mt-3 grid gap-1 text-sm">
        <p>
          <strong>{p.cliente_nome}</strong>
          {p.cliente_telefone && <span className="text-texto-2"> · {formatarTelefone(p.cliente_telefone)}</span>}
        </p>
        {p.tipo === "entrega" ? (
          <p className="text-texto-2">
            <Bike className="mr-1 inline size-4" aria-hidden />
            {p.rua}, {p.numero_endereco}
            {p.complemento && ` — ${p.complemento}`} · {p.bairro}
            {p.referencia && ` · Ref.: ${p.referencia}`}
          </p>
        ) : (
          <p className="text-texto-2">
            <Store className="mr-1 inline size-4" aria-hidden />
            Retirada no local
          </p>
        )}
      </div>

      <ul className="mt-3 divide-y divide-borda rounded-xl bg-superficie-2 px-3 text-sm">
        {itens.map((it) => (
          <li key={it.id} className="py-2">
            <div className="flex justify-between gap-2">
              <span className="font-semibold">
                {it.quantidade}× {it.nome}
              </span>
              <span className="whitespace-nowrap">{m(it.total)}</span>
            </div>
            {(it.opcoes as OpcoesItem).map((g) => (
              <p key={g.grupo} className="text-texto-2">
                • {g.grupo}: {g.itens.map((o) => o.nome).join(", ")}
              </p>
            ))}
            {it.observacao && <p className="text-texto-2 italic">Obs.: {it.observacao}</p>}
          </li>
        ))}
      </ul>

      <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 text-sm">
        <dt className="text-texto-2">Subtotal</dt>
        <dd className="text-right">{m(p.subtotal)}</dd>
        {p.tipo === "entrega" && (
          <>
            <dt className="text-texto-2">Entrega</dt>
            <dd className="text-right">{p.taxa_entrega > 0 ? m(p.taxa_entrega) : "Grátis"}</dd>
          </>
        )}
        {p.desconto > 0 && (
          <>
            <dt className="text-texto-2">Desconto{p.cupom && ` (${p.cupom})`}</dt>
            <dd className="text-right text-ok">− {m(p.desconto)}</dd>
          </>
        )}
        <dt className="font-bold">Total</dt>
        <dd className="text-right font-bold">{m(p.total)}</dd>
        <dt className="text-texto-2">Pagamento</dt>
        <dd className="text-right">
          {{ pix: "Pix", cartao: "Cartão", dinheiro: "Dinheiro" }[p.pagamento]}
          {p.pagamento === "dinheiro" && (p.troco_para ? ` · troco p/ ${m(p.troco_para)} (levar ${m(p.troco_para - p.total)})` : " · sem troco")}
        </dd>
      </dl>
      {p.observacoes && <p className="mt-2 rounded-lg bg-cta-suave px-3 py-2 text-sm">Obs.: {p.observacoes}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2 nao-imprimir">
        {passo && (
          <button
            type="button"
            onClick={() => mudar(passo.status)}
            disabled={pendente}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-marca px-4 text-sm font-semibold text-marca-texto disabled:opacity-60"
          >
            <passo.icone className="size-4" aria-hidden /> {passo.rotulo}
          </button>
        )}
        {p.cliente_telefone && (
          <a
            href={linkWhatsApp(p.cliente_telefone, mensagemCliente(p, negocio))}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-borda px-3 text-sm font-semibold"
          >
            <MessageCircle className="size-4" aria-hidden /> WhatsApp
          </a>
        )}
        <button type="button" onClick={imprimir} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-texto-2 hover:bg-superficie-2">
          <Printer className="size-4" aria-hidden /> Imprimir
        </button>
        <label className="ml-auto">
          <span className="sr-only">Status do pedido #{p.numero}</span>
          <select
            value={p.status}
            disabled={pendente}
            onChange={(e) => void aoEscolherStatus(e.target.value as StatusPedido)}
            className="min-h-11 rounded-xl border border-borda bg-superficie px-2 text-sm"
          >
            {(["novo", "preparando", "saiu", "entregue", "cancelado"] as StatusPedido[]).map((s) => (
              <option key={s} value={s}>
                {rotuloStatus(s, p.tipo)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </article>
  );
}
