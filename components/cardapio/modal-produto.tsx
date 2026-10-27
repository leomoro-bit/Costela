"use client";

/**
 * Janela do produto: foto, descrição, grupos de opcionais (obrigatórios, escolha única,
 * limite de escolhas), observação e quantidade. Usa <dialog> nativo (Esc fecha, foco preso).
 */
import { Minus, Plus, Sparkles, Star, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { type EscolhaSacola, type GrupoPub, type ItemSacola, type ProdutoPub, precoUnitario } from "@/lib/cardapio";
import { formatarMoeda } from "@/lib/formatar";
import { cn } from "@/lib/utils";
import { FotoProduto } from "./foto-produto";

export function SeloProduto({ selo }: { selo: ProdutoPub["selo"] }) {
  if (selo === "mais-pedido")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-cta-suave px-2 py-0.5 text-xs font-bold text-alerta">
        <Star className="size-3.5" aria-hidden /> Mais pedido
      </span>
    );
  if (selo === "novo")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-marca-suave px-2 py-0.5 text-xs font-bold text-marca-forte">
        <Sparkles className="size-3.5" aria-hidden /> Novo
      </span>
    );
  return null;
}

export function ModalProduto({
  produto,
  grupos,
  itemEditado,
  aoFechar,
  aoConfirmar,
}: {
  produto: ProdutoPub;
  grupos: GrupoPub[];
  itemEditado: ItemSacola | null;
  aoFechar: () => void;
  aoConfirmar: (item: Omit<ItemSacola, "uid">) => void;
}) {
  const toast = useToast();
  const dialogo = useRef<HTMLDialogElement>(null);
  const [qtd, setQtd] = useState(itemEditado?.qtd ?? 1);
  const [obs, setObs] = useState(itemEditado?.obs ?? "");
  const [erros, setErros] = useState<Set<string>>(new Set());
  const [tremer, setTremer] = useState(0);
  const [selecao, setSelecao] = useState<Record<string, string[]>>(() => {
    const inicial: Record<string, string[]> = {};
    for (const g of grupos) {
      const antes = itemEditado?.escolhas.find((e) => e.grupoId === g.id);
      inicial[g.id] = antes ? antes.itens.map((o) => o.id).filter((id) => g.opcoes.some((o) => o.id === id)) : [];
    }
    return inicial;
  });

  useEffect(() => {
    const d = dialogo.current;
    if (d && !d.open) d.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const escolhas: EscolhaSacola[] = grupos
    .map((g) => ({ grupoId: g.id, grupo: g.titulo, itens: g.opcoes.filter((o) => selecao[g.id]?.includes(o.id)) }))
    .filter((e) => e.itens.length);
  const total = precoUnitario(produto, escolhas) * qtd;

  function alternar(g: GrupoPub, opcaoId: string) {
    setSelecao((atual) => {
      const marcados = atual[g.id] ?? [];
      let novos: string[];
      if (g.tipo === "unico") {
        // clicar de novo numa opção NÃO obrigatória desmarca
        novos = marcados.includes(opcaoId) ? (g.obrigatorio ? marcados : []) : [opcaoId];
      } else if (marcados.includes(opcaoId)) {
        novos = marcados.filter((id) => id !== opcaoId);
      } else {
        if (g.max_escolhas && marcados.length >= g.max_escolhas) return atual;
        novos = [...marcados, opcaoId];
      }
      return { ...atual, [g.id]: novos };
    });
    setErros((e) => {
      if (!e.has(g.id)) return e;
      const n = new Set(e);
      n.delete(g.id);
      return n;
    });
  }

  function confirmar() {
    const faltando = grupos.filter((g) => g.obrigatorio && !(selecao[g.id]?.length));
    if (faltando.length) {
      setErros(new Set(faltando.map((g) => g.id)));
      setTremer((t) => t + 1);
      document.getElementById(`grupo-${faltando[0].id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast.erro(`Escolha: ${faltando.map((g) => g.titulo).join(", ")}`);
      return;
    }
    aoConfirmar({
      produtoId: produto.id,
      nome: produto.nome,
      qtd,
      escolhas,
      obs: obs.trim().slice(0, 140),
      precoUnit: precoUnitario(produto, escolhas),
    });
  }

  return (
    <dialog
      ref={dialogo}
      aria-labelledby="modal-produto-titulo"
      onCancel={(e) => {
        e.preventDefault();
        aoFechar();
      }}
      onClick={(e) => e.target === e.currentTarget && aoFechar()}
      className="animar-subir mx-auto mt-auto mb-0 flex max-h-[94dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-[22px] border-0 bg-superficie p-0 text-texto shadow-2xl backdrop:bg-black/55 lg:my-auto lg:max-h-[88dvh] lg:rounded-[22px]"
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        {produto.foto_url ? (
          <div className="relative h-[220px] bg-superficie-2">
            <FotoProduto src={produto.foto_url.replace("w=600", "w=900")} alt={produto.nome} className="size-full" />
            <BotaoFechar aoFechar={aoFechar} className="absolute top-3 right-3" />
          </div>
        ) : (
          <div className="flex justify-end px-3 pt-3">
            <BotaoFechar aoFechar={aoFechar} />
          </div>
        )}
        <div className="px-[18px] pt-4 pb-2">
          <SeloProduto selo={produto.selo} />
          <h2 id="modal-produto-titulo" className="my-1.5 text-2xl font-bold">
            {produto.nome}
          </h2>
          {produto.descricao && <p className="mb-2 text-texto-2">{produto.descricao}</p>}
          <strong className="text-lg text-marca-forte">{formatarMoeda(produto.preco)}</strong>
        </div>

        {grupos.map((g) => {
          const marcados = selecao[g.id] ?? [];
          const unico = g.tipo === "unico";
          const regra = unico
            ? g.obrigatorio
              ? "Escolha 1 opção"
              : "Escolha até 1 opção"
            : `Escolha até ${g.max_escolhas ?? g.opcoes.length} opções`;
          const comErro = erros.has(g.id);
          return (
            <fieldset
              key={comErro ? `${g.id}-${tremer}` : g.id}
              id={`grupo-${g.id}`}
              className={cn("min-w-0 border-t-8 border-superficie-2 px-[18px] py-3.5", comErro && "animar-tremer")}
            >
              <legend className="sr-only">
                {g.titulo} — {regra}
              </legend>
              <div className="mb-2 flex items-center justify-between gap-2.5">
                <div>
                  <h3 className={cn("font-sans text-base font-bold", comErro && "text-perigo")}>{g.titulo}</h3>
                  <small className="block text-[13px] text-texto-2">{regra}</small>
                </div>
                {g.obrigatorio && (
                  <span
                    className={cn(
                      "rounded-md px-2 py-1 text-[11.5px] font-bold tracking-wide whitespace-nowrap uppercase",
                      marcados.length ? "bg-ok text-white dark:text-black" : "bg-texto text-superficie",
                    )}
                  >
                    {marcados.length ? "OK" : "Obrigatório"}
                  </span>
                )}
              </div>
              {g.opcoes.map((o) => {
                const marcado = marcados.includes(o.id);
                const bloqueado = !unico && !marcado && !!g.max_escolhas && marcados.length >= g.max_escolhas;
                return (
                  <label
                    key={o.id}
                    className={cn(
                      "flex min-h-[50px] cursor-pointer items-center gap-3 border-b border-borda py-1.5 last:border-b-0",
                      bloqueado && "cursor-not-allowed opacity-45",
                    )}
                  >
                    <span className="flex-1">{o.nome}</span>
                    {o.preco > 0 && <small className="font-semibold text-texto-2">+ {formatarMoeda(o.preco)}</small>}
                    <input
                      type={unico ? "radio" : "checkbox"}
                      name={`g-${g.id}`}
                      checked={marcado}
                      disabled={bloqueado}
                      onChange={() => undefined}
                      onClick={() => alternar(g, o.id)}
                      className="size-[22px] accent-[var(--marca)]"
                    />
                  </label>
                );
              })}
              {comErro && (
                <p role="alert" className="text-[13px] font-medium text-perigo">
                  Escolha uma opção para continuar.
                </p>
              )}
            </fieldset>
          );
        })}

        <div className="border-t-8 border-superficie-2 px-[18px] py-3.5">
          <label htmlFor="obs-item" className="mb-1.5 block text-sm font-semibold">
            Alguma observação?
          </label>
          <textarea
            id="obs-item"
            maxLength={140}
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Ex.: tirar a cebola, molho à parte..."
            className="block min-h-[76px] w-full resize-y rounded-[10px] border-[1.5px] border-borda bg-superficie px-3.5 py-2.5 text-base focus:border-marca focus:outline-none"
          />
        </div>
      </div>

      <div className="pb-seguro flex items-center gap-2.5 border-t border-borda bg-superficie px-4 py-3">
        <Contador valor={qtd} aoMudar={setQtd} rotulo="Quantidade" />
        <button
          type="button"
          onClick={confirmar}
          className="flex min-h-[50px] flex-1 items-center justify-between gap-2 rounded-full bg-cta px-5 font-semibold text-cta-texto hover:brightness-95 active:scale-[.98]"
        >
          <span>{itemEditado ? "Salvar" : "Adicionar"}</span>
          <span>{formatarMoeda(total)}</span>
        </button>
      </div>
    </dialog>
  );
}

function BotaoFechar({ aoFechar, className }: { aoFechar: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={aoFechar}
      aria-label="Fechar"
      className={cn(
        "z-10 grid size-11 place-items-center rounded-full border border-borda bg-superficie text-texto shadow-md",
        className,
      )}
    >
      <X className="size-5" aria-hidden />
    </button>
  );
}

/** Botões − / + com o número no meio (alvos de 44px). Com `aoZerar`, o "−" no mínimo vira lixeira. */
export function Contador({
  valor,
  aoMudar,
  rotulo,
  min = 1,
  aoZerar,
}: {
  valor: number;
  aoMudar: (v: number) => void;
  rotulo: string;
  min?: number;
  aoZerar?: () => void;
}) {
  const noMinimo = valor <= min;
  return (
    <div role="group" aria-label={rotulo} className="inline-flex items-center rounded-full border-[1.5px] border-borda bg-superficie">
      <button
        type="button"
        onClick={() => (noMinimo ? aoZerar?.() : aoMudar(valor - 1))}
        disabled={noMinimo && !aoZerar}
        aria-label={noMinimo && aoZerar ? "Remover item" : "Diminuir quantidade"}
        className="grid size-11 place-items-center rounded-full text-marca-forte disabled:cursor-not-allowed disabled:text-borda"
      >
        {noMinimo && aoZerar ? <Trash2 className="size-5" aria-hidden /> : <Minus className="size-5" aria-hidden />}
      </button>
      <output aria-live="polite" className="min-w-[26px] text-center font-bold">
        {valor}
      </output>
      <button
        type="button"
        onClick={() => aoMudar(Math.min(50, valor + 1))}
        aria-label="Aumentar quantidade"
        className="grid size-11 place-items-center rounded-full text-marca-forte"
      >
        <Plus className="size-5" aria-hidden />
      </button>
    </div>
  );
}
