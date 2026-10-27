"use client";

/** Horários de funcionamento: lista por dia + formulário para adicionar faixa + remover com confirmação. */
import { Plus, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { Botao } from "@/components/ui/botao";
import { Campo, Entrada, Selecao } from "@/components/ui/campo";
import { Cartao } from "@/components/ui/cartao";
import { useConfirmar } from "@/components/ui/confirmar";
import { useToast } from "@/components/ui/toast";
import { DIAS, hhmm } from "@/lib/cardapio";
import type { Horario } from "@/lib/tipos";
import { useAcao } from "@/lib/use-acao";
import { adicionarHorario, excluirHorario } from "./actions";

export function GerenciarHorarios({ horarios }: { horarios: Horario[] }) {
  const toast = useToast();
  const confirmar = useConfirmar();
  const [, iniciar] = useTransition();
  const { onSubmit, erros: e, pendente } = useAcao(adicionarHorario);

  async function remover(h: Horario) {
    const ok = await confirmar({
      titulo: "Remover este horário?",
      mensagem: `${DIAS[h.dia_semana]}, ${hhmm(h.abre)}–${hhmm(h.fecha)}.`,
      textoConfirmar: "Remover",
      perigo: true,
    });
    if (!ok) return;
    iniciar(async () => {
      const r = await excluirHorario(h.id);
      if (r.ok) toast.sucesso(r.mensagem ?? "Removido.");
      else toast.erro(r.mensagem ?? "Não foi possível remover.");
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
      <Cartao className="p-0 sm:p-0">
        <ul className="divide-y divide-borda">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => {
            const faixas = horarios.filter((h) => h.dia_semana === d);
            return (
              <li key={d} className="flex flex-wrap items-center gap-2 px-4 py-3">
                <span className="w-24 font-semibold">{DIAS[d]}</span>
                {faixas.length === 0 ? (
                  <span className="text-sm text-texto-2">Fechado</span>
                ) : (
                  faixas.map((h) => (
                    <span key={h.id} className="inline-flex items-center gap-1 rounded-full bg-marca-suave py-0.5 pr-0.5 pl-3 text-sm font-medium text-marca-forte">
                      {hhmm(h.abre)}–{hhmm(h.fecha)}
                      <button
                        type="button"
                        onClick={() => remover(h)}
                        aria-label={`Remover ${DIAS[d]} ${hhmm(h.abre)} às ${hhmm(h.fecha)}`}
                        className="grid size-9 place-items-center rounded-full hover:bg-superficie"
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </span>
                  ))
                )}
              </li>
            );
          })}
        </ul>
      </Cartao>

      <Cartao>
        <h2 className="mb-3 font-semibold">Adicionar horário</h2>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <Campo rotulo="Dia da semana" nome="dia_semana" erro={e.dia_semana}>
            {(p) => (
              <Selecao {...p} defaultValue="1">
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <option key={d} value={d}>
                    {DIAS[d]}
                  </option>
                ))}
              </Selecao>
            )}
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Abre" nome="abre" erro={e.abre}>
              {(p) => <Entrada {...p} type="time" defaultValue="11:00" />}
            </Campo>
            <Campo rotulo="Fecha" nome="fecha" erro={e.fecha}>
              {(p) => <Entrada {...p} type="time" defaultValue="15:00" />}
            </Campo>
          </div>
          <Botao type="submit" carregando={pendente} className="w-full">
            <Plus className="size-4" aria-hidden /> Adicionar
          </Botao>
        </form>
      </Cartao>
    </div>
  );
}
