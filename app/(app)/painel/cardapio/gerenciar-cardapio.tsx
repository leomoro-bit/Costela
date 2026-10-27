"use client";

/**
 * Tela do painel para cuidar do cardápio:
 *  - categorias (criar, renomear, ordenar, esconder, excluir);
 *  - produtos (criar/editar em janela, foto por link OU enviada do celular/computador
 *    para o Supabase Storage, selo, preço "de/por", opcionais, esgotado/oculto, excluir).
 */
import { Eye, EyeOff, ImagePlus, Pencil, Plus, Tags, Trash2, UtensilsCrossed } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { Botao } from "@/components/ui/botao";
import { AreaTexto, Campo, Entrada, Selecao } from "@/components/ui/campo";
import { Cartao, Selo } from "@/components/ui/cartao";
import { useConfirmar } from "@/components/ui/confirmar";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { Marcador, Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { FotoProduto } from "@/components/cardapio/foto-produto";
import type { EstadoAcao } from "@/lib/acoes";
import { formatarMoeda } from "@/lib/formatar";
import { createClient } from "@/lib/supabase/client";
import type { Categoria, GrupoOpcional, Produto, ProdutoGrupo } from "@/lib/tipos";
import { useAcao } from "@/lib/use-acao";
import { cn } from "@/lib/utils";
import { alternarProduto, excluirCategoria, excluirProduto, salvarCategoria, salvarProduto } from "./actions";

type GrupoResumo = Pick<GrupoOpcional, "id" | "titulo" | "ativo" | "obrigatorio" | "tipo">;
type Links = Pick<ProdutoGrupo, "produto_id" | "grupo_id" | "ordem">[];

const reais = (v: number | null) => (v === null ? "" : v.toFixed(2).replace(".", ","));

export function GerenciarCardapio({
  categorias,
  produtos,
  grupos,
  links,
}: {
  categorias: Categoria[];
  produtos: Produto[];
  grupos: GrupoResumo[];
  links: Links;
}) {
  const [categoriaAberta, setCategoriaAberta] = useState<Categoria | "nova" | null>(null);
  const [produtoAberto, setProdutoAberto] = useState<{ produto: Produto | null; categoriaId?: string } | null>(null);

  return (
    <div className="space-y-6">
      <Cartao>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Tags className="size-5 text-marca-forte" aria-hidden /> Categorias
          </h2>
          <Botao variante="secundario" onClick={() => setCategoriaAberta("nova")}>
            <Plus className="size-4" aria-hidden /> Nova categoria
          </Botao>
        </div>
        {categorias.length === 0 ? (
          <p className="text-sm text-texto-2">Crie as categorias do cardápio (ex.: Lanches, Pizzas, Bebidas) antes dos produtos.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {categorias.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setCategoriaAberta(c)}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-2 rounded-full border border-borda bg-superficie px-4 text-sm font-semibold hover:bg-superficie-2",
                    !c.ativo && "opacity-60",
                  )}
                  aria-label={`Editar categoria ${c.nome}`}
                >
                  {c.nome}
                  <span className="text-xs text-texto-2">{produtos.filter((p) => p.categoria_id === c.id).length}</span>
                  {!c.ativo && <EyeOff className="size-4" aria-label="oculta" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Cartao>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Produtos ({produtos.length})</h2>
        <Botao onClick={() => setProdutoAberto({ produto: null })} disabled={!categorias.length}>
          <Plus className="size-4" aria-hidden /> Novo produto
        </Botao>
      </div>

      {produtos.length === 0 ? (
        <EstadoVazio
          icone={UtensilsCrossed}
          titulo="Nenhum produto ainda"
          descricao={categorias.length ? "Cadastre o primeiro prato do cardápio." : "Crie uma categoria primeiro."}
        />
      ) : (
        categorias.map((c) => {
          const lista = produtos.filter((p) => p.categoria_id === c.id);
          if (!lista.length) return null;
          return (
            <section key={c.id} aria-labelledby={`cat-${c.id}`}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 id={`cat-${c.id}`} className="font-titulo text-xl font-bold">
                  {c.nome} {!c.ativo && <Selo>oculta</Selo>}
                </h3>
                <button
                  type="button"
                  onClick={() => setProdutoAberto({ produto: null, categoriaId: c.id })}
                  className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-marca-forte hover:bg-superficie-2"
                >
                  <Plus className="size-4" aria-hidden /> Adicionar
                </button>
              </div>
              <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-2">
                {lista.map((p) => (
                  <LinhaProduto key={p.id} produto={p} grupos={grupos} links={links} aoEditar={() => setProdutoAberto({ produto: p })} />
                ))}
              </ul>
            </section>
          );
        })
      )}

      <Modal
        aberto={categoriaAberta !== null}
        aoFechar={() => setCategoriaAberta(null)}
        titulo={categoriaAberta === "nova" ? "Nova categoria" : "Editar categoria"}
      >
        {categoriaAberta !== null && (
          <FormCategoria
            key={categoriaAberta === "nova" ? "nova" : categoriaAberta.id}
            categoria={categoriaAberta === "nova" ? null : categoriaAberta}
            aoTerminar={() => setCategoriaAberta(null)}
          />
        )}
      </Modal>

      <Modal
        aberto={produtoAberto !== null}
        aoFechar={() => setProdutoAberto(null)}
        titulo={produtoAberto?.produto ? "Editar produto" : "Novo produto"}
        className="sm:max-w-2xl"
      >
        {produtoAberto && (
          <FormProduto
            key={produtoAberto.produto?.id ?? "novo"}
            produto={produtoAberto.produto}
            categoriaInicial={produtoAberto.categoriaId}
            categorias={categorias}
            grupos={grupos}
            links={links}
            aoTerminar={() => setProdutoAberto(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function LinhaProduto({ produto: p, grupos, links, aoEditar }: { produto: Produto; grupos: GrupoResumo[]; links: Links; aoEditar: () => void }) {
  const toast = useToast();
  const confirmar = useConfirmar();
  const [pendente, iniciar] = useTransition();
  // Mostra a caixinha marcada/desmarcada na hora, enquanto o servidor salva.
  const [disponivel, setDisponivel] = useOptimistic(p.disponivel);
  const nomesGrupos = links
    .filter((l) => l.produto_id === p.id)
    .map((l) => grupos.find((g) => g.id === l.grupo_id)?.titulo)
    .filter(Boolean);

  function executar(acao: () => Promise<EstadoAcao>) {
    iniciar(async () => {
      const r = await acao();
      if (r.ok) toast.sucesso(r.mensagem ?? "Pronto.");
      else toast.erro(r.mensagem ?? "Não foi possível salvar.");
    });
  }

  async function excluir() {
    const ok = await confirmar({
      titulo: `Excluir "${p.nome}"?`,
      mensagem: "O produto sai do cardápio. Pedidos antigos continuam com o nome e o preço registrados. Não dá para desfazer.",
      perigo: true,
    });
    if (ok) executar(() => excluirProduto(p.id));
  }

  return (
    <li className={cn("flex min-w-0 gap-3 rounded-2xl border border-borda bg-superficie p-3 shadow-sm", !p.ativo && "opacity-70")}>
      <FotoProduto key={p.foto_url} src={p.foto_url} alt={p.nome} className="size-20 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="font-semibold">{p.nome}</p>
          {!p.disponivel && <Selo cor="perigo">Esgotado</Selo>}
          {!p.ativo && <Selo>Oculto</Selo>}
          {p.selo === "mais-pedido" && <Selo cor="alerta">Mais pedido</Selo>}
          {p.selo === "novo" && <Selo cor="marca">Novo</Selo>}
        </div>
        <p className="text-sm font-semibold text-marca-forte">
          {formatarMoeda(p.preco)}
          {p.preco_antigo !== null && <span className="ml-2 text-xs font-normal text-texto-2 line-through">{formatarMoeda(p.preco_antigo)}</span>}
        </p>
        {nomesGrupos.length > 0 && <p className="truncate text-xs text-texto-2">Opcionais: {nomesGrupos.join(", ")}</p>}
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl pr-2 text-sm">
            <input
              type="checkbox"
              checked={disponivel}
              disabled={pendente}
              onChange={(e) => {
                const valor = e.target.checked;
                executar(() => {
                  setDisponivel(valor);
                  return alternarProduto(p.id, "disponivel", valor);
                });
              }}
              className="size-5 accent-[var(--marca)]"
            />
            Disponível
          </label>
          <button
            type="button"
            onClick={() => executar(() => alternarProduto(p.id, "ativo", !p.ativo))}
            disabled={pendente}
            aria-label={p.ativo ? `Esconder ${p.nome} do cardápio` : `Mostrar ${p.nome} no cardápio`}
            title={p.ativo ? "Esconder do cardápio" : "Mostrar no cardápio"}
            className="grid size-11 place-items-center rounded-xl text-texto-2 hover:bg-superficie-2"
          >
            {p.ativo ? <Eye className="size-4" aria-hidden /> : <EyeOff className="size-4" aria-hidden />}
          </button>
          <button type="button" onClick={aoEditar} aria-label={`Editar ${p.nome}`} className="grid size-11 place-items-center rounded-xl text-texto-2 hover:bg-superficie-2">
            <Pencil className="size-4" aria-hidden />
          </button>
          <button type="button" onClick={excluir} aria-label={`Excluir ${p.nome}`} className="grid size-11 place-items-center rounded-xl text-perigo hover:bg-perigo-suave">
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </li>
  );
}

function FormCategoria({ categoria, aoTerminar }: { categoria: Categoria | null; aoTerminar: () => void }) {
  const toast = useToast();
  const confirmar = useConfirmar();
  const [excluindo, iniciar] = useTransition();
  const { onSubmit, erros: e, pendente } = useAcao(salvarCategoria, { aoSucesso: aoTerminar });

  async function excluir() {
    if (!categoria) return;
    const ok = await confirmar({ titulo: `Excluir a categoria "${categoria.nome}"?`, mensagem: "Só é possível excluir categorias sem produtos.", perigo: true });
    if (!ok) return;
    iniciar(async () => {
      const r = await excluirCategoria(categoria.id);
      if (r.ok) {
        toast.sucesso(r.mensagem ?? "Excluída.");
        aoTerminar();
      } else toast.erro(r.mensagem ?? "Não foi possível excluir.");
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <input type="hidden" name="id" value={categoria?.id ?? ""} />
      <Campo rotulo="Nome" nome="nome" erro={e.nome}>
        {(p) => <Entrada {...p} defaultValue={categoria?.nome ?? ""} maxLength={60} placeholder="Ex.: Lanches" autoFocus />}
      </Campo>
      <Campo rotulo="Ordem" nome="ordem" erro={e.ordem} ajuda="Menor aparece primeiro no cardápio.">
        {(p) => <Entrada {...p} inputMode="numeric" defaultValue={String(categoria?.ordem ?? 0)} />}
      </Campo>
      <Marcador nome="ativo" rotulo="Mostrar no cardápio" defaultChecked={categoria?.ativo ?? true} />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        {categoria ? (
          <Botao variante="fantasma" onClick={excluir} carregando={excluindo} className="text-perigo">
            <Trash2 className="size-4" aria-hidden /> Excluir
          </Botao>
        ) : (
          <span />
        )}
        <Botao type="submit" carregando={pendente}>
          Salvar categoria
        </Botao>
      </div>
    </form>
  );
}

function FormProduto({
  produto,
  categoriaInicial,
  categorias,
  grupos,
  links,
  aoTerminar,
}: {
  produto: Produto | null;
  categoriaInicial?: string;
  categorias: Categoria[];
  grupos: GrupoResumo[];
  links: Links;
  aoTerminar: () => void;
}) {
  const toast = useToast();
  const { onSubmit, erros: e, pendente } = useAcao(salvarProduto, { aoSucesso: aoTerminar });
  const [foto, setFoto] = useState(produto?.foto_url ?? "");
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const marcados = new Set(links.filter((l) => l.produto_id === produto?.id).map((l) => l.grupo_id));

  async function enviarFoto(arquivo: File | undefined) {
    if (!arquivo) return;
    if (!/^image\/(jpeg|png|webp)$/.test(arquivo.type)) {
      toast.erro("Use uma foto JPG, PNG ou WEBP.");
      return;
    }
    if (arquivo.size > 5 * 1024 * 1024) {
      toast.erro("A foto pode ter no máximo 5 MB.");
      return;
    }
    setEnviandoFoto(true);
    try {
      const supabase = createClient();
      const ext = arquivo.type === "image/png" ? "png" : arquivo.type === "image/webp" ? "webp" : "jpg";
      const caminho = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("produtos").upload(caminho, arquivo, { contentType: arquivo.type, cacheControl: "31536000" });
      if (error) throw error;
      setFoto(supabase.storage.from("produtos").getPublicUrl(caminho).data.publicUrl);
      toast.sucesso("Foto enviada. Clique em Salvar produto.");
    } catch (erro) {
      console.error("[enviarFoto]", erro);
      toast.erro("Não foi possível enviar a foto. Confira se o schema.sql criou o bucket “produtos”.");
    } finally {
      setEnviandoFoto(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <input type="hidden" name="id" value={produto?.id ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Nome" nome="nome" erro={e.nome}>
          {(p) => <Entrada {...p} defaultValue={produto?.nome ?? ""} maxLength={80} placeholder="Ex.: X-Salada" />}
        </Campo>
        <Campo rotulo="Categoria" nome="categoria_id" erro={e.categoria_id}>
          {(p) => (
            <Selecao {...p} defaultValue={produto?.categoria_id ?? categoriaInicial ?? categorias[0]?.id ?? ""}>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Selecao>
          )}
        </Campo>
      </div>
      <Campo rotulo="Descrição" nome="descricao" erro={e.descricao}>
        {(p) => <AreaTexto {...p} defaultValue={produto?.descricao ?? ""} maxLength={400} rows={2} placeholder="Ingredientes, tamanho, serve quantas pessoas..." />}
      </Campo>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Campo rotulo="Preço (R$)" nome="preco" erro={e.preco}>
          {(p) => <Entrada {...p} inputMode="decimal" defaultValue={reais(produto?.preco ?? null)} placeholder="0,00" />}
        </Campo>
        <Campo rotulo="Preço “de” (R$)" nome="preco_antigo" erro={e.preco_antigo} ajuda="Opcional (promoção).">
          {(p) => <Entrada {...p} inputMode="decimal" defaultValue={reais(produto?.preco_antigo ?? null)} />}
        </Campo>
        <Campo rotulo="Ordem" nome="ordem" erro={e.ordem}>
          {(p) => <Entrada {...p} inputMode="numeric" defaultValue={String(produto?.ordem ?? 0)} />}
        </Campo>
      </div>

      <div className="grid gap-3 sm:grid-cols-[96px_1fr] sm:items-start">
        <FotoProduto key={foto} src={foto || null} alt="Prévia da foto" className="size-24 rounded-xl" />
        <div className="space-y-2">
          <Campo rotulo="Foto (link)" nome="foto_url" erro={e.foto_url} ajuda="Cole o link de uma imagem ou envie uma foto.">
            {(p) => <Entrada {...p} type="url" inputMode="url" value={foto} onChange={(ev) => setFoto(ev.target.value)} placeholder="https://..." />}
          </Campo>
          <label className={cn("inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-borda px-4 text-sm font-semibold hover:bg-superficie-2", enviandoFoto && "opacity-60")}>
            <ImagePlus className="size-4" aria-hidden />
            {enviandoFoto ? "Enviando..." : "Enviar foto"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={enviandoFoto}
              onChange={(ev) => {
                void enviarFoto(ev.target.files?.[0]);
                ev.target.value = "";
              }}
            />
          </label>
        </div>
      </div>

      <Campo rotulo="Selo" nome="selo" erro={e.selo}>
        {(p) => (
          <Selecao {...p} defaultValue={produto?.selo ?? ""}>
            <option value="">Nenhum</option>
            <option value="mais-pedido">Mais pedido</option>
            <option value="novo">Novo</option>
          </Selecao>
        )}
      </Campo>

      <fieldset className="rounded-xl border border-borda p-3">
        <legend className="px-1 text-sm font-medium">Opcionais oferecidos</legend>
        {grupos.length === 0 ? (
          <p className="text-sm text-texto-2">Nenhum grupo de opcionais cadastrado (menu Opcionais).</p>
        ) : (
          <div className="grid sm:grid-cols-2">
            {grupos.map((g) => (
              <label key={g.id} className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm">
                <input type="checkbox" name="grupos" value={g.id} defaultChecked={marcados.has(g.id)} className="size-5 accent-[var(--marca)]" />
                <span>
                  {g.titulo}
                  <span className="text-xs text-texto-2">
                    {" "}
                    · {g.tipo === "unico" ? "escolha 1" : "vários"}
                    {g.obrigatorio && " · obrigatório"}
                    {!g.ativo && " · inativo"}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <div className="grid sm:grid-cols-2">
        <Marcador nome="disponivel" rotulo="Disponível" ajuda="Desmarque quando acabar (aparece como “Esgotado”)." defaultChecked={produto?.disponivel ?? true} />
        <Marcador nome="ativo" rotulo="Mostrar no cardápio" ajuda="Desmarque para esconder sem excluir." defaultChecked={produto?.ativo ?? true} />
      </div>

      <div className="flex justify-end">
        <Botao type="submit" carregando={pendente} disabled={enviandoFoto} className="w-full sm:w-auto">
          Salvar produto
        </Botao>
      </div>
    </form>
  );
}
