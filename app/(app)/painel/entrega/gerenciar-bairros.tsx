"use client";

/** Lista de bairros com taxa; criar/editar em janela e excluir com confirmação. */
import { Bike, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Botao } from "@/components/ui/botao";
import { Campo, Entrada } from "@/components/ui/campo";
import { Cartao, Selo } from "@/components/ui/cartao";
import { useConfirmar } from "@/components/ui/confirmar";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { Marcador, Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatarMoeda } from "@/lib/formatar";
import type { Bairro } from "@/lib/tipos";
import { useAcao } from "@/lib/use-acao";
import { excluirBairro, salvarBairro } from "./actions";

export function GerenciarBairros({ bairros }: { bairros: Bairro[] }) {
  const toast = useToast();
  const confirmar = useConfirmar();
  const [, iniciar] = useTransition();
  const [aberto, setAberto] = useState<Bairro | "novo" | null>(null);
  const bairro = aberto === "novo" ? null : aberto;
  const { onSubmit, erros: e, pendente } = useAcao(salvarBairro, { aoSucesso: () => setAberto(null) });

  async function excluir(b: Bairro) {
    if (!(await confirmar({ titulo: `Excluir o bairro "${b.nome}"?`, mensagem: "Ele deixa de aparecer na sacola do cliente.", perigo: true }))) return;
    iniciar(async () => {
      const r = await excluirBairro(b.id);
      if (r.ok) toast.sucesso(r.mensagem ?? "Excluído.");
      else toast.erro(r.mensagem ?? "Não foi possível excluir.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Botao onClick={() => setAberto("novo")}>
          <Plus className="size-4" aria-hidden /> Novo bairro
        </Botao>
      </div>
      {bairros.length === 0 ? (
        <EstadoVazio icone={Bike} titulo="Nenhum bairro cadastrado" descricao="Sem bairros, o cliente só consegue pedir para retirar no local." />
      ) : (
        <Cartao className="p-0 sm:p-0">
          <ul className="divide-y divide-borda">
            {bairros.map((b) => (
              <li key={b.id} className="flex items-center gap-2 px-4 py-2">
                <span className="min-w-0 flex-1 truncate font-medium">
                  {b.nome} {!b.ativo && <Selo>inativo</Selo>}
                </span>
                <span className="font-semibold">{b.taxa > 0 ? formatarMoeda(b.taxa) : "Grátis"}</span>
                <button type="button" onClick={() => setAberto(b)} aria-label={`Editar ${b.nome}`} className="grid size-11 place-items-center rounded-xl text-texto-2 hover:bg-superficie-2">
                  <Pencil className="size-4" aria-hidden />
                </button>
                <button type="button" onClick={() => excluir(b)} aria-label={`Excluir ${b.nome}`} className="grid size-11 place-items-center rounded-xl text-perigo hover:bg-perigo-suave">
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </Cartao>
      )}
      <Modal aberto={aberto !== null} aoFechar={() => setAberto(null)} titulo={bairro ? "Editar bairro" : "Novo bairro"}>
        {aberto !== null && (
          <form key={bairro?.id ?? "novo"} onSubmit={onSubmit} noValidate className="space-y-4">
            <input type="hidden" name="id" value={bairro?.id ?? ""} />
            <Campo rotulo="Bairro" nome="nome" erro={e.nome}>
              {(p) => <Entrada {...p} defaultValue={bairro?.nome ?? ""} maxLength={60} autoFocus />}
            </Campo>
            <div className="grid grid-cols-2 gap-4">
              <Campo rotulo="Taxa de entrega (R$)" nome="taxa" erro={e.taxa}>
                {(p) => <Entrada {...p} inputMode="decimal" defaultValue={(bairro?.taxa ?? 0).toFixed(2).replace(".", ",")} />}
              </Campo>
              <Campo rotulo="Ordem" nome="ordem" erro={e.ordem}>
                {(p) => <Entrada {...p} inputMode="numeric" defaultValue={String(bairro?.ordem ?? 0)} />}
              </Campo>
            </div>
            <Marcador nome="ativo" rotulo="Atendemos este bairro" defaultChecked={bairro?.ativo ?? true} />
            <div className="flex justify-end">
              <Botao type="submit" carregando={pendente}>
                Salvar bairro
              </Botao>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
