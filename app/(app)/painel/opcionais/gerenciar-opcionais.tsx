"use client";

/** Grupos de opcionais (criar/editar/excluir) e as opções de cada grupo (preço extra, ativo). */
import { ListPlus, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Botao } from "@/components/ui/botao";
import { Campo, Entrada, Selecao } from "@/components/ui/campo";
import { Cartao, Selo } from "@/components/ui/cartao";
import { useConfirmar } from "@/components/ui/confirmar";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { Marcador, Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import type { EstadoAcao } from "@/lib/acoes";
import { formatarMoeda } from "@/lib/formatar";
import type { GrupoOpcional, Opcional, ProdutoGrupo } from "@/lib/tipos";
import { useAcao } from "@/lib/use-acao";
import { cn } from "@/lib/utils";
import { excluirGrupo, excluirOpcional, salvarGrupo, salvarOpcional } from "./actions";

const reais = (v: number) => v.toFixed(2).replace(".", ",");

export function GerenciarOpcionais({
  grupos,
  opcionais,
  links,
  produtos,
}: {
  grupos: GrupoOpcional[];
  opcionais: Opcional[];
  links: Pick<ProdutoGrupo, "produto_id" | "grupo_id">[];
  produtos: { id: string; nome: string }[];
}) {
  const toast = useToast();
  const confirmar = useConfirmar();
  const [, iniciar] = useTransition();
  const [grupoAberto, setGrupoAberto] = useState<GrupoOpcional | "novo" | null>(null);
  const [opcaoAberta, setOpcaoAberta] = useState<{ grupo: GrupoOpcional; opcao: Opcional | null } | null>(null);

  function executar(acao: () => Promise<EstadoAcao>) {
    iniciar(async () => {
      const r = await acao();
      if (r.ok) toast.sucesso(r.mensagem ?? "Pronto.");
      else toast.erro(r.mensagem ?? "Não foi possível salvar.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Botao onClick={() => setGrupoAberto("novo")}>
          <Plus className="size-4" aria-hidden /> Novo grupo
        </Botao>
      </div>

      {grupos.length === 0 ? (
        <EstadoVazio icone={ListPlus} titulo="Nenhum grupo de opcionais" descricao="Ex.: “Tamanho” (escolha 1, obrigatório) ou “Adicionais” (vários, até 3)." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {grupos.map((g) => {
            const itens = opcionais.filter((o) => o.grupo_id === g.id);
            const usadoEm = links.filter((l) => l.grupo_id === g.id).map((l) => produtos.find((p) => p.id === l.produto_id)?.nome).filter(Boolean);
            return (
              <Cartao key={g.id} className={cn(!g.ativo && "opacity-70")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-semibold">{g.titulo}</h2>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Selo cor="marca">{g.tipo === "unico" ? "Escolha 1" : `Vários${g.max_escolhas ? ` (até ${g.max_escolhas})` : ""}`}</Selo>
                      {g.obrigatorio && <Selo cor="alerta">Obrigatório</Selo>}
                      {!g.ativo && <Selo>Inativo</Selo>}
                    </div>
                  </div>
                  <button type="button" onClick={() => setGrupoAberto(g)} aria-label={`Editar grupo ${g.titulo}`} className="grid size-11 shrink-0 place-items-center rounded-xl text-texto-2 hover:bg-superficie-2">
                    <Pencil className="size-4" aria-hidden />
                  </button>
                </div>
                <p className="mt-2 text-xs text-texto-2">{usadoEm.length ? `Usado em: ${usadoEm.join(", ")}` : "Ainda não usado em nenhum produto."}</p>
                <ul className="mt-3 divide-y divide-borda">
                  {itens.map((o) => (
                    <li key={o.id} className={cn("flex items-center gap-2 py-1", !o.ativo && "opacity-60")}>
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {o.nome} {!o.ativo && <span className="text-xs text-texto-2">(inativa)</span>}
                      </span>
                      <span className="text-sm text-texto-2">{o.preco > 0 ? `+ ${formatarMoeda(o.preco)}` : "grátis"}</span>
                      <button type="button" onClick={() => setOpcaoAberta({ grupo: g, opcao: o })} aria-label={`Editar ${o.nome}`} className="grid size-11 place-items-center rounded-xl text-texto-2 hover:bg-superficie-2">
                        <Pencil className="size-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        aria-label={`Excluir ${o.nome}`}
                        onClick={async () => {
                          if (await confirmar({ titulo: `Excluir a opção "${o.nome}"?`, mensagem: "Ela some de todos os produtos que usam este grupo.", perigo: true })) {
                            executar(() => excluirOpcional(o.id));
                          }
                        }}
                        className="grid size-11 place-items-center rounded-xl text-perigo hover:bg-perigo-suave"
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setOpcaoAberta({ grupo: g, opcao: null })}
                  className="mt-2 inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-semibold text-marca-forte hover:bg-superficie-2"
                >
                  <Plus className="size-4" aria-hidden /> Adicionar opção
                </button>
              </Cartao>
            );
          })}
        </div>
      )}

      <Modal aberto={grupoAberto !== null} aoFechar={() => setGrupoAberto(null)} titulo={grupoAberto === "novo" ? "Novo grupo de opcionais" : "Editar grupo"}>
        {grupoAberto !== null && (
          <FormGrupo
            key={grupoAberto === "novo" ? "novo" : grupoAberto.id}
            grupo={grupoAberto === "novo" ? null : grupoAberto}
            aoTerminar={() => setGrupoAberto(null)}
            aoExcluir={(g) => {
              setGrupoAberto(null);
              void (async () => {
                if (await confirmar({ titulo: `Excluir o grupo "${g.titulo}"?`, mensagem: "As opções dele também serão excluídas e o grupo sai dos produtos.", perigo: true })) {
                  executar(() => excluirGrupo(g.id));
                }
              })();
            }}
          />
        )}
      </Modal>

      <Modal aberto={opcaoAberta !== null} aoFechar={() => setOpcaoAberta(null)} titulo={opcaoAberta?.opcao ? "Editar opção" : `Nova opção em “${opcaoAberta?.grupo.titulo ?? ""}”`}>
        {opcaoAberta && <FormOpcao key={opcaoAberta.opcao?.id ?? "nova"} grupo={opcaoAberta.grupo} opcao={opcaoAberta.opcao} aoTerminar={() => setOpcaoAberta(null)} />}
      </Modal>
    </div>
  );
}

function FormGrupo({ grupo, aoTerminar, aoExcluir }: { grupo: GrupoOpcional | null; aoTerminar: () => void; aoExcluir: (g: GrupoOpcional) => void }) {
  const { onSubmit, erros: e, pendente } = useAcao(salvarGrupo, { aoSucesso: aoTerminar });
  const [tipo, setTipo] = useState(grupo?.tipo ?? "unico");
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <input type="hidden" name="id" value={grupo?.id ?? ""} />
      <Campo rotulo="Título (o cliente vê)" nome="titulo" erro={e.titulo}>
        {(p) => <Entrada {...p} defaultValue={grupo?.titulo ?? ""} maxLength={60} placeholder="Ex.: Tamanho" autoFocus />}
      </Campo>
      <div className="grid grid-cols-2 gap-4">
        <Campo rotulo="Tipo" nome="tipo" erro={e.tipo}>
          {(p) => (
            <Selecao {...p} value={tipo} onChange={(ev) => setTipo(ev.target.value as GrupoOpcional["tipo"])}>
              <option value="unico">Escolhe 1</option>
              <option value="multiplo">Escolhe vários</option>
            </Selecao>
          )}
        </Campo>
        {tipo === "multiplo" ? (
          <Campo rotulo="Máximo de escolhas" nome="max_escolhas" erro={e.max_escolhas} ajuda="Vazio = sem limite.">
            {(p) => <Entrada {...p} inputMode="numeric" defaultValue={grupo?.max_escolhas ? String(grupo.max_escolhas) : ""} />}
          </Campo>
        ) : (
          <input type="hidden" name="max_escolhas" value="" />
        )}
      </div>
      <Campo rotulo="Ordem" nome="ordem" erro={e.ordem}>
        {(p) => <Entrada {...p} inputMode="numeric" defaultValue={String(grupo?.ordem ?? 0)} />}
      </Campo>
      <Marcador nome="obrigatorio" rotulo="Obrigatório" ajuda="O cliente precisa escolher antes de adicionar à sacola." defaultChecked={grupo?.obrigatorio ?? false} />
      <Marcador nome="ativo" rotulo="Ativo" defaultChecked={grupo?.ativo ?? true} />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        {grupo ? (
          <Botao variante="fantasma" onClick={() => aoExcluir(grupo)} className="text-perigo">
            <Trash2 className="size-4" aria-hidden /> Excluir grupo
          </Botao>
        ) : (
          <span />
        )}
        <Botao type="submit" carregando={pendente}>
          Salvar grupo
        </Botao>
      </div>
    </form>
  );
}

function FormOpcao({ grupo, opcao, aoTerminar }: { grupo: GrupoOpcional; opcao: Opcional | null; aoTerminar: () => void }) {
  const { onSubmit, erros: e, pendente } = useAcao(salvarOpcional, { aoSucesso: aoTerminar });
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <input type="hidden" name="id" value={opcao?.id ?? ""} />
      <input type="hidden" name="grupo_id" value={grupo.id} />
      <Campo rotulo="Nome" nome="nome" erro={e.nome}>
        {(p) => <Entrada {...p} defaultValue={opcao?.nome ?? ""} maxLength={60} placeholder="Ex.: Bacon crocante" autoFocus />}
      </Campo>
      <div className="grid grid-cols-2 gap-4">
        <Campo rotulo="Preço extra (R$)" nome="preco" erro={e.preco} ajuda="0 = sem custo.">
          {(p) => <Entrada {...p} inputMode="decimal" defaultValue={reais(opcao?.preco ?? 0)} />}
        </Campo>
        <Campo rotulo="Ordem" nome="ordem" erro={e.ordem}>
          {(p) => <Entrada {...p} inputMode="numeric" defaultValue={String(opcao?.ordem ?? 0)} />}
        </Campo>
      </div>
      <Marcador nome="ativo" rotulo="Ativa" ajuda="Desmarque quando acabar." defaultChecked={opcao?.ativo ?? true} />
      <div className="flex justify-end">
        <Botao type="submit" carregando={pendente}>
          Salvar opção
        </Botao>
      </div>
    </form>
  );
}
