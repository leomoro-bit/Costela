"use client";

/** Cupons de desconto: percentual, valor fixo ou entrega grátis, com pedido mínimo e validade. */
import { BadgePercent, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Botao } from "@/components/ui/botao";
import { Campo, Entrada, Selecao } from "@/components/ui/campo";
import { Cartao, Selo } from "@/components/ui/cartao";
import { useConfirmar } from "@/components/ui/confirmar";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { Marcador, Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatarData, formatarMoeda, hojeISO } from "@/lib/formatar";
import type { Cupom } from "@/lib/tipos";
import { useAcao } from "@/lib/use-acao";
import { cn } from "@/lib/utils";
import { excluirCupom, salvarCupom } from "./actions";

function resumo(c: Pick<Cupom, "tipo" | "valor" | "minimo">) {
  const base = c.tipo === "percentual" ? `${c.valor}% de desconto` : c.tipo === "valor" ? `${formatarMoeda(c.valor)} de desconto` : "Entrega grátis";
  return c.minimo > 0 ? `${base} a partir de ${formatarMoeda(c.minimo)}` : base;
}

export function GerenciarCupons({ cupons, usos }: { cupons: Cupom[]; usos: Record<string, number> }) {
  const toast = useToast();
  const confirmar = useConfirmar();
  const [, iniciar] = useTransition();
  const [aberto, setAberto] = useState<Cupom | "novo" | null>(null);
  const hoje = hojeISO();

  async function excluir(c: Cupom) {
    if (!(await confirmar({ titulo: `Excluir o cupom ${c.codigo}?`, mensagem: "Clientes não conseguirão mais usar este código.", perigo: true }))) return;
    iniciar(async () => {
      const r = await excluirCupom(c.id);
      if (r.ok) toast.sucesso(r.mensagem ?? "Excluído.");
      else toast.erro(r.mensagem ?? "Não foi possível excluir.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Botao onClick={() => setAberto("novo")}>
          <Plus className="size-4" aria-hidden /> Novo cupom
        </Botao>
      </div>
      {cupons.length === 0 ? (
        <EstadoVazio icone={BadgePercent} titulo="Nenhum cupom" descricao="Crie um cupom como BEMVINDO (R$ 8 off) ou FRETEGRATIS." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cupons.map((c) => {
            const vencido = c.valido_ate !== null && c.valido_ate < hoje;
            return (
              <Cartao key={c.id} className={cn(!c.ativo || vencido ? "opacity-70" : "")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-lg font-bold tracking-wide">{c.codigo}</p>
                    <p className="text-sm text-texto-2">{resumo(c)}</p>
                  </div>
                  <div className="flex">
                    <button type="button" onClick={() => setAberto(c)} aria-label={`Editar cupom ${c.codigo}`} className="grid size-11 place-items-center rounded-xl text-texto-2 hover:bg-superficie-2">
                      <Pencil className="size-4" aria-hidden />
                    </button>
                    <button type="button" onClick={() => excluir(c)} aria-label={`Excluir cupom ${c.codigo}`} className="grid size-11 place-items-center rounded-xl text-perigo hover:bg-perigo-suave">
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                </div>
                {c.descricao && <p className="mt-2 text-sm">{c.descricao}</p>}
                <div className="mt-2 flex flex-wrap gap-1">
                  {!c.ativo ? <Selo>Inativo</Selo> : vencido ? <Selo cor="perigo">Vencido</Selo> : <Selo cor="ok">Ativo</Selo>}
                  {c.valido_ate && <Selo cor="info">até {formatarData(c.valido_ate)}</Selo>}
                  <Selo>{usos[c.codigo] ?? 0} uso(s)</Selo>
                </div>
              </Cartao>
            );
          })}
        </div>
      )}
      <Modal aberto={aberto !== null} aoFechar={() => setAberto(null)} titulo={aberto === "novo" ? "Novo cupom" : "Editar cupom"}>
        {aberto !== null && <FormCupom key={aberto === "novo" ? "novo" : aberto.id} cupom={aberto === "novo" ? null : aberto} aoTerminar={() => setAberto(null)} />}
      </Modal>
    </div>
  );
}

function FormCupom({ cupom, aoTerminar }: { cupom: Cupom | null; aoTerminar: () => void }) {
  const { onSubmit, erros: e, pendente } = useAcao(salvarCupom, { aoSucesso: aoTerminar });
  const [tipo, setTipo] = useState<Cupom["tipo"]>(cupom?.tipo ?? "percentual");
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <input type="hidden" name="id" value={cupom?.id ?? ""} />
      <Campo rotulo="Código" nome="codigo" erro={e.codigo} ajuda="O que o cliente digita. Ex.: VILA10">
        {(p) => <Entrada {...p} defaultValue={cupom?.codigo ?? ""} maxLength={20} className="uppercase" autoCapitalize="characters" autoFocus />}
      </Campo>
      <div className="grid grid-cols-2 gap-4">
        <Campo rotulo="Tipo" nome="tipo" erro={e.tipo}>
          {(p) => (
            <Selecao {...p} value={tipo} onChange={(ev) => setTipo(ev.target.value as Cupom["tipo"])}>
              <option value="percentual">% de desconto</option>
              <option value="valor">R$ de desconto</option>
            </Selecao>
          )}
        </Campo>
        {tipo === "frete" ? (
          <input type="hidden" name="valor" value="0" />
        ) : (
          <Campo rotulo={tipo === "percentual" ? "Desconto (%)" : "Desconto (R$)"} nome="valor" erro={e.valor}>
            {(p) => <Entrada {...p} inputMode="decimal" defaultValue={cupom && cupom.tipo !== "frete" ? String(cupom.valor).replace(".", ",") : ""} />}
          </Campo>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Campo rotulo="Pedido mínimo (R$)" nome="minimo" erro={e.minimo}>
          {(p) => <Entrada {...p} inputMode="decimal" defaultValue={(cupom?.minimo ?? 0).toFixed(2).replace(".", ",")} />}
        </Campo>
        <Campo rotulo="Válido até" nome="valido_ate" erro={e.valido_ate} ajuda="Vazio = sem prazo.">
          {(p) => <Entrada {...p} type="date" defaultValue={cupom?.valido_ate ?? ""} />}
        </Campo>
      </div>
      <Campo rotulo="Descrição (o cliente vê ao aplicar)" nome="descricao" erro={e.descricao}>
        {(p) => <Entrada {...p} defaultValue={cupom?.descricao ?? ""} maxLength={120} placeholder="10% off acima de R$ 50" />}
      </Campo>
      <Marcador nome="ativo" rotulo="Ativo" defaultChecked={cupom?.ativo ?? true} />
      <div className="flex justify-end">
        <Botao type="submit" carregando={pendente}>
          Salvar cupom
        </Botao>
      </div>
    </form>
  );
}
