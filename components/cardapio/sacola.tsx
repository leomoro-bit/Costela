"use client";

/**
 * SACOLA / CHECKOUT do cliente: itens, retirada no local, dados, pagamento (troco),
 * cupom (validado no banco), observações, resumo e "Enviar pedido".
 * No celular é uma tela que sobe por cima; no computador fica fixa à direita.
 */
import {
  AlertTriangle,
  Banknote,
  ChevronLeft,
  Clock,
  CreditCard,
  Info,
  MapPin,
  MessageCircle,
  Pencil,
  Plus,
  QrCode,
  ShoppingBag,
  Store,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { conferirCupom, enviarPedido } from "@/app/acoes-cardapio";
import { useConfirmar } from "@/components/ui/confirmar";
import { useToast } from "@/components/ui/toast";
import {
  type BairroPub,
  type ConfigPublica,
  type ItemSacola,
  type PedidoCriado,
  type StatusLoja,
  calcularTotais,
  descricaoEscolhas,
  erroCupom,
} from "@/lib/cardapio";
import { formatarMoeda, somenteDigitos } from "@/lib/formatar";
import { FotoProduto } from "./foto-produto";
import { cn } from "@/lib/utils";
import { type EstadoCliente, atualizarCliente } from "./estado-cliente";
import { lerValor } from "./mensagem";
import { Contador } from "./modal-produto";

const m = formatarMoeda;

type Props = {
  config: ConfigPublica;
  bairros: BairroPub[];
  itens: ItemSacola[];
  removidos: number;
  estado: EstadoCliente;
  status: StatusLoja | null;
  aberta: boolean;
  aoFechar: () => void;
  aoVerCardapio: () => void;
  aoEditarItem: (item: ItemSacola) => void;
  aoPedidoEnviado: (pedido: PedidoCriado, cupomAplicado: string) => void;
};

const estiloCampo =
  "block min-h-[46px] w-full rounded-[10px] border-[1.5px] border-borda bg-superficie px-3.5 py-2.5 text-base text-texto " +
  "focus:border-marca focus:outline-none focus:ring-3 focus:ring-marca-suave aria-[invalid=true]:border-perigo disabled:opacity-60";

export function Sacola(props: Props) {
  const { config, itens, removidos, estado: e, status, aberta } = props;
  const toast = useToast();
  const confirmar = useConfirmar();
  const [erros, setErros] = useState<Record<string, string>>({});
  const [codigoCupom, setCodigoCupom] = useState("");
  const [erroCodigo, setErroCodigo] = useState("");
  const [conferindo, iniciarCupom] = useTransition();
  const [enviando, iniciarEnvio] = useTransition();
  const corpo = useRef<HTMLDivElement>(null);

  const n = itens.reduce((s, it) => s + it.qtd, 0);
  const cupomErro = erroCupom(e.cupom, itens.reduce((s, it) => s + it.precoUnit * it.qtd, 0), "retirada", m);
  const r = calcularTotais({ itens, tipo: "retirada", bairro: null, config, cupom: cupomErro ? null : e.cupom });

  const formasPagamento = [
    config.aceita_pix && { valor: "pix" as const, icone: QrCode, rotulo: "Pix", ajuda: "· chave enviada no WhatsApp" },
    config.aceita_cartao && { valor: "cartao" as const, icone: CreditCard, rotulo: "Cartão", ajuda: "· na retirada" },
    config.aceita_dinheiro && { valor: "dinheiro" as const, icone: Banknote, rotulo: "Dinheiro", ajuda: "" },
  ].filter(Boolean) as { valor: "pix" | "cartao" | "dinheiro"; icone: typeof QrCode; rotulo: string; ajuda: string }[];
  const formaAtual = formasPagamento.some((f) => f.valor === e.pagamento.forma) ? e.pagamento.forma : formasPagamento[0]?.valor;

  function mudar(fn: (atual: EstadoCliente) => EstadoCliente, campo?: string) {
    atualizarCliente(fn);
    if (campo && erros[campo])
      setErros((atual) => {
        const novo = { ...atual };
        delete novo[campo];
        return novo;
      });
  }
  async function remover(item: ItemSacola) {
    if (!(await confirmar({ titulo: "Remover item?", mensagem: `Tirar "${item.nome}" da sacola?`, textoConfirmar: "Remover", perigo: true }))) return;
    atualizarCliente((a) => ({ ...a, sacola: a.sacola.filter((x) => x.uid !== item.uid) }));
    toast.info("Item removido");
  }

  async function esvaziar() {
    if (!(await confirmar({ titulo: "Esvaziar a sacola?", mensagem: "Todos os itens serão removidos.", textoConfirmar: "Esvaziar", perigo: true }))) return;
    atualizarCliente((a) => ({ ...a, sacola: [], cupom: null }));
    toast.info("Sacola esvaziada");
  }

  function aplicarCupom() {
    const codigo = codigoCupom.trim().toUpperCase();
    if (!codigo) {
      setErroCodigo("Digite o código do cupom.");
      return;
    }
    iniciarCupom(async () => {
      const res = await conferirCupom(codigo, r.sub, "retirada");
      if (!res.valido) {
        setErroCodigo(res.mensagem);
        return;
      }
      setErroCodigo("");
      setCodigoCupom("");
      atualizarCliente((a) => ({ ...a, cupom: res }));
      toast.sucesso(`Cupom ${res.codigo} aplicado!`);
    });
  }

  function validar() {
    const novos: Record<string, string> = {};
    if (e.cliente.nome.trim().length < 2) novos.cliente_nome = "Informe seu nome.";
    const tel = somenteDigitos(e.cliente.telefone);
    if (tel && (tel.length < 10 || tel.length > 13)) novos.cliente_telefone = "Telefone incompleto. Use DDD + número.";
    if (formaAtual === "dinheiro" && !e.pagamento.semTroco && e.pagamento.troco.trim() && lerValor(e.pagamento.troco) < r.total) {
      novos.troco_para = `O troco precisa ser para um valor maior que ${m(r.total)}.`;
    }
    return novos;
  }

  function focarPrimeiroErro(campos: Record<string, string>) {
    const ordem = ["cliente_nome", "cliente_telefone", "troco_para"];
    const primeiro = ordem.find((c) => campos[c]) ?? Object.keys(campos)[0];
    const el = primeiro ? document.getElementById(`f-${primeiro}`) : null;
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.focus({ preventScroll: true });
  }

  function finalizar() {
    if (!itens.length || enviando) return;
    if (status && !status.aberto && !config.aceitar_pedidos_fechado) {
      toast.erro(`Estamos fechados.${status.abre ? " Abrimos " + status.abre + "." : ""}`);
      return;
    }
    const novos = validar();
    if (Object.keys(novos).length) {
      setErros(novos);
      toast.erro("Confira os campos destacados");
      focarPrimeiroErro(novos);
      return;
    }
    const cupomAplicado = e.cupom && !cupomErro ? (e.cupom.codigo ?? "") : "";
    const troco = formaAtual === "dinheiro" && !e.pagamento.semTroco && e.pagamento.troco.trim() ? lerValor(e.pagamento.troco) : null;
    iniciarEnvio(async () => {
      const res = await enviarPedido({
        tipo: "retirada",
        cliente_nome: e.cliente.nome,
        cliente_telefone: e.cliente.telefone,
        bairro_id: "",
        rua: "",
        numero: "",
        complemento: "",
        referencia: "",
        pagamento: formaAtual ?? "pix",
        troco_para: troco,
        cupom: cupomAplicado,
        observacoes: e.obs,
        itens: itens.map((it) => ({
          produto_id: it.produtoId,
          quantidade: it.qtd,
          opcionais: it.escolhas.flatMap((g) => g.itens.map((o) => o.id)),
          observacao: it.obs,
        })),
      });
      if (!res.ok) {
        toast.erro(res.mensagem);
        if (res.erros && Object.keys(res.erros).length) {
          setErros(res.erros);
          focarPrimeiroErro(res.erros);
        }
        return;
      }
      setErros({});
      props.aoPedidoEnviado(res.pedido, cupomAplicado);
    });
  }

  return (
    <aside
      aria-label="Sacola de compras"
      className={cn(
        "fixed inset-0 z-50 flex flex-col bg-fundo transition-[transform,visibility] duration-300",
        aberta ? "visible translate-y-0" : "invisible translate-y-full",
        "lg:visible lg:sticky lg:top-15 lg:z-10 lg:h-[calc(100dvh-60px)] lg:translate-y-0 lg:border-l lg:border-borda lg:transition-none",
      )}
    >
      <div className="flex items-center gap-2.5 border-b border-borda bg-superficie py-2.5 pr-3 pl-4">
        <button
          type="button"
          onClick={props.aoFechar}
          aria-label="Fechar sacola"
          className="grid size-11 place-items-center rounded-full border border-borda bg-superficie lg:hidden"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <h2 className="flex-1 text-[21px] font-bold">Sua sacola</h2>
        {n > 0 && (
          <button type="button" onClick={esvaziar} className="min-h-11 rounded-[10px] px-2.5 text-sm font-semibold text-texto-2 hover:bg-superficie-2">
            Esvaziar
          </button>
        )}
      </div>

      <div ref={corpo} className="flex-1 overflow-y-auto px-4 pt-3.5 pb-6">
        {!n ? (
          <div className="px-5 py-9 text-center text-texto-2">
            <IlustracaoSacola />
            <h3 className="mb-1.5 text-[19px] font-bold text-texto">Sua sacola está vazia</h3>
            <p className="mb-3.5">Escolha algo gostoso no cardápio e ele aparece aqui.</p>
            {removidos > 0 && <p className="mb-3.5 text-sm">{removidos} item(ns) saíram do cardápio e foram retirados.</p>}
            <button type="button" onClick={props.aoVerCardapio} className="min-h-11 rounded-full bg-marca px-5 font-semibold text-marca-texto">
              Ver cardápio
            </button>
          </div>
        ) : (
          <>
            {status && !status.aberto && (
              <Alerta icone={Clock}>
                <strong>Estamos fechados agora.</strong> {status.abre ? `Abrimos ${status.abre}.` : ""}{" "}
                {config.aceitar_pedidos_fechado ? "Você pode enviar o pedido e ele será respondido na abertura." : ""}
              </Alerta>
            )}
            {removidos > 0 && (
              <Alerta icone={AlertTriangle}>
                {removidos} item(ns) da sua sacola saíram do cardápio ou esgotaram e foram retirados.
              </Alerta>
            )}

            <Bloco titulo="Itens" icone={ShoppingBag}>
              {itens.map((it) => (
                <div key={it.uid} className="flex gap-3 border-b border-borda py-3 last-of-type:border-b-0">
                  <FotoProduto src={it.foto_url ?? null} alt={it.nome} className="size-[68px] shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 font-bold leading-snug">{it.nome}</div>
                      <div className="shrink-0 font-bold whitespace-nowrap text-marca-forte">{m(it.precoUnit * it.qtd)}</div>
                    </div>
                    {it.escolhas.length > 0 && <div className="mt-0.5 text-[12px] text-texto-2">{descricaoEscolhas(it.escolhas, m)}</div>}
                    {it.obs && (
                      <div className="mt-0.5 text-[12px] text-texto-2">
                        <em>Obs.: {it.obs}</em>
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      <Contador
                        valor={it.qtd}
                        rotulo={`Quantidade de ${it.nome}`}
                        aoMudar={(q) => atualizarCliente((a) => ({ ...a, sacola: a.sacola.map((x) => (x.uid === it.uid ? { ...x, qtd: q } : x)) }))}
                        aoZerar={() => remover(it)}
                      />
                      <button type="button" onClick={() => props.aoEditarItem(it)} className={estiloMiniBotao}>
                        <Pencil className="size-4" aria-hidden /> Editar
                      </button>
                      <button type="button" onClick={() => remover(it)} aria-label={`Remover ${it.nome}`} title="Remover" className={cn(estiloMiniBotao, "ml-auto")}>
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={props.aoVerCardapio} className="mt-1.5 inline-flex min-h-11 items-center gap-2 rounded-full px-4 font-semibold text-marca-forte lg:hidden">
                <Plus className="size-5" aria-hidden /> Adicionar mais itens
              </button>
            </Bloco>

            <Bloco titulo="Retirada no local" icone={Store}>
              <p className="flex items-start gap-1.5">
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  <strong>Retire em:</strong> {config.endereco ?? "combine pelo WhatsApp"}
                </span>
              </p>
              <p className="mt-2.5 text-[13px] text-texto-2">Fica pronto em {config.tempo_retirada}.</p>
              <p className="mt-2 rounded-xl border border-borda bg-superficie-2 p-3 text-sm text-texto-2">
                Trabalhamos exclusivamente com retirada no local. Não fazemos entregas.
              </p>
            </Bloco>

            <Bloco titulo="Seus dados" icone={Info}>
              <CampoSacola id="cliente_nome" rotulo="Seu nome *" erro={erros.cliente_nome}>
                {(p) => (
                  <input {...p} autoComplete="name" maxLength={80} value={e.cliente.nome} onChange={(ev) => mudar((a) => ({ ...a, cliente: { ...a.cliente, nome: ev.target.value } }), "cliente_nome")} className={estiloCampo} />
                )}
              </CampoSacola>
              <CampoSacola id="cliente_telefone" rotulo="Seu WhatsApp" erro={erros.cliente_telefone}>
                {(p) => (
                  <input
                    {...p}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="(11) 90000-0000"
                    maxLength={20}
                    value={e.cliente.telefone}
                    onChange={(ev) => mudar((a) => ({ ...a, cliente: { ...a.cliente, telefone: ev.target.value } }), "cliente_telefone")}
                    className={estiloCampo}
                  />
                )}
              </CampoSacola>
              <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[14.5px]">
                <input type="checkbox" checked={e.lembrar} onChange={(ev) => mudar((a) => ({ ...a, lembrar: ev.target.checked }))} className="size-5 accent-[var(--marca)]" />
                Lembrar meus dados neste aparelho
              </label>
            </Bloco>

            <Bloco titulo="Pagamento" icone={CreditCard}>
              <div role="radiogroup" aria-label="Forma de pagamento" className="grid gap-2">
                {formasPagamento.map((f) => (
                  <label
                    key={f.valor}
                    className="flex min-h-[52px] cursor-pointer items-center gap-3 rounded-xl border-[1.5px] border-borda bg-superficie px-3.5 py-2.5 has-[:checked]:border-marca has-[:checked]:bg-marca-suave"
                  >
                    <input
                      type="radio"
                      name="pagamento"
                      value={f.valor}
                      checked={formaAtual === f.valor}
                      onChange={() => mudar((a) => ({ ...a, pagamento: { ...a.pagamento, forma: f.valor } }), "troco_para")}
                      className="size-5 accent-[var(--marca)]"
                    />
                    <f.icone className="size-5" aria-hidden />
                    <span className="flex-1 font-semibold">
                      {f.rotulo} {f.ajuda && <small className="font-medium text-texto-2">{f.ajuda}</small>}
                    </span>
                  </label>
                ))}
              </div>
              {formaAtual === "dinheiro" && (
                <div className="mt-3">
                  <CampoSacola id="troco_para" rotulo="Troco para quanto?" erro={erros.troco_para}>
                    {(p) => (
                      <input
                        {...p}
                        inputMode="decimal"
                        placeholder="Ex.: 100"
                        maxLength={12}
                        disabled={e.pagamento.semTroco}
                        value={e.pagamento.troco}
                        onChange={(ev) => mudar((a) => ({ ...a, pagamento: { ...a.pagamento, troco: ev.target.value } }), "troco_para")}
                        className={estiloCampo}
                      />
                    )}
                  </CampoSacola>
                  <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[14.5px]">
                    <input
                      type="checkbox"
                      checked={e.pagamento.semTroco}
                      onChange={(ev) =>
                        mudar((a) => ({ ...a, pagamento: { ...a.pagamento, semTroco: ev.target.checked, troco: ev.target.checked ? "" : a.pagamento.troco } }), "troco_para")
                      }
                      className="size-5 accent-[var(--marca)]"
                    />
                    Não preciso de troco
                  </label>
                </div>
              )}
            </Bloco>

            <Bloco titulo="Cupom de desconto" icone={Tag}>
              {e.cupom ? (
                <>
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-marca-suave py-2 pr-2 pl-3 font-semibold">
                    <span className="min-w-0">
                      <Tag className="mr-1 inline size-4" aria-hidden />
                      {e.cupom.codigo} <small className="font-medium text-texto-2">· {e.cupom.descricao}</small>
                    </span>
                    <button
                      type="button"
                      onClick={() => atualizarCliente((a) => ({ ...a, cupom: null }))}
                      aria-label="Remover cupom"
                      className="grid size-11 shrink-0 place-items-center rounded-[10px] hover:bg-superficie-2"
                    >
                      <X className="size-5" aria-hidden />
                    </button>
                  </div>
                  {cupomErro && <p className="mt-2 text-[13px] font-medium text-perigo">{cupomErro}</p>}
                </>
              ) : (
                <>
                  <div className="flex gap-2">
                    <label htmlFor="f-cupom" className="sr-only">
                      Código do cupom
                    </label>
                    <input
                      id="f-cupom"
                      placeholder="Digite o cupom"
                      autoComplete="off"
                      maxLength={20}
                      value={codigoCupom}
                      aria-invalid={erroCodigo ? true : undefined}
                      onChange={(ev) => {
                        setCodigoCupom(ev.target.value.toUpperCase());
                        setErroCodigo("");
                      }}
                      onKeyDown={(ev) => {
                        if (ev.key === "Enter") {
                          ev.preventDefault();
                          aplicarCupom();
                        }
                      }}
                      className={cn(estiloCampo, "min-w-0 flex-1 uppercase")}
                    />
                    <button
                      type="button"
                      onClick={aplicarCupom}
                      disabled={conferindo}
                      className="min-h-11 rounded-full bg-marca px-5 font-semibold text-marca-texto disabled:opacity-60"
                    >
                      {conferindo ? "..." : "Aplicar"}
                    </button>
                  </div>
                  {erroCodigo && (
                    <p role="alert" className="mt-2 text-[13px] font-medium text-perigo">
                      {erroCodigo}
                    </p>
                  )}
                </>
              )}
            </Bloco>

            <Bloco>
              <label htmlFor="f-obs" className="mb-1.5 block text-sm font-semibold">
                Observações do pedido
              </label>
              <textarea
                id="f-obs"
                maxLength={200}
                placeholder="Ex.: interfone quebrado, ligar ao chegar"
                value={e.obs}
                onChange={(ev) => mudar((a) => ({ ...a, obs: ev.target.value }))}
                className={cn(estiloCampo, "min-h-[76px] resize-y")}
              />
            </Bloco>

            <div id="resumo-sacola" aria-live="polite" className="mb-3.5 rounded-2xl border border-borda bg-superficie p-3.5">
              <LinhaResumo rotulo="Subtotal" valor={m(r.sub)} />
              <LinhaResumo rotulo="Retirada no local" valor="Grátis" />
              {r.desconto > 0 && <LinhaResumo rotulo={`Desconto (${e.cupom?.codigo})`} valor={`− ${m(r.desconto)}`} className="text-ok" />}
              <div className="mt-1.5 flex justify-between gap-2.5 border-t border-dashed border-borda pt-2.5 text-[19px] font-bold">
                <span>Total</span>
                <span>{m(r.total)}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {n > 0 && (
        <div className="pb-seguro border-t border-borda bg-superficie px-4 py-3">
          <button
            type="button"
            onClick={finalizar}
            disabled={enviando}
            className="inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-full bg-cta px-5 text-[16.5px] font-semibold text-cta-texto hover:brightness-95 disabled:opacity-70"
          >
            <MessageCircle className="size-5" aria-hidden />
            {enviando ? "Registrando pedido..." : `Enviar pedido · ${m(r.total)}`}
          </button>
        </div>
      )}
    </aside>
  );
}

const estiloMiniBotao =
  "inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-[10px] px-2.5 text-sm font-semibold text-texto-2 hover:bg-superficie-2";

function Bloco({ titulo, icone: Icone, children }: { titulo?: string; icone?: typeof Info; children: React.ReactNode }) {
  return (
    <section className="mb-3.5 rounded-2xl border border-borda bg-superficie p-3.5">
      {titulo && (
        <h3 className="mb-3 flex items-center gap-2 text-[17px] font-bold">
          {Icone && <Icone className="size-5" aria-hidden />}
          {titulo}
        </h3>
      )}
      {children}
    </section>
  );
}

function CampoSacola({
  id,
  rotulo,
  erro,
  children,
}: {
  id: string;
  rotulo: string;
  erro?: string;
  children: (p: { id: string; "aria-invalid"?: boolean; "aria-describedby"?: string }) => React.ReactNode;
}) {
  const idCampo = `f-${id}`;
  return (
    <div className="mb-3 flex min-w-0 flex-col gap-1.5">
      <label htmlFor={idCampo} className="text-sm font-semibold">
        {rotulo}
      </label>
      {children({ id: idCampo, "aria-invalid": erro ? true : undefined, "aria-describedby": erro ? `${idCampo}-erro` : undefined })}
      {erro && (
        <span id={`${idCampo}-erro`} role="alert" className="text-[13px] font-medium text-perigo">
          {erro}
        </span>
      )}
    </div>
  );
}

function Alerta({ icone: Icone, children }: { icone: typeof Info; children: React.ReactNode }) {
  return (
    <div role="note" className="mb-3 flex items-start gap-2.5 rounded-xl bg-cta-suave px-3 py-2.5 text-sm">
      <Icone className="mt-0.5 size-5 shrink-0 text-cta" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

function LinhaResumo({ rotulo, valor, className }: { rotulo: string; valor: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex justify-between gap-2.5 py-1 text-texto-2", className)}>
      <span>{rotulo}</span>
      <span>{valor}</span>
    </div>
  );
}

function IlustracaoSacola() {
  return (
    <svg viewBox="0 0 140 110" aria-hidden className="mx-auto mb-3 block h-[110px] w-[140px]">
      <ellipse cx="70" cy="100" rx="44" ry="6" fill="var(--borda)" />
      <path d="M36 38h68l6 58H30z" fill="var(--superficie)" stroke="var(--marca)" strokeWidth="4" strokeLinejoin="round" />
      <path d="M54 46V32a16 16 0 0 1 32 0v14" fill="none" stroke="var(--marca)" strokeWidth="4" strokeLinecap="round" />
      <circle cx="58" cy="66" r="3" fill="var(--texto-2)" />
      <circle cx="82" cy="66" r="3" fill="var(--texto-2)" />
      <path d="M60 80c6-4 14-4 20 0" stroke="var(--cta)" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}
