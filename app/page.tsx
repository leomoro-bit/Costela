/**
 * CARDÁPIO DIGITAL — página PÚBLICA (sem login) em "/".
 *
 * Lê no servidor só o que está ATIVO (as políticas RLS "to anon" também garantem isso),
 * os dados públicos do negócio pela função configuracao_publica() e a MARCA (nome exibido,
 * frase de apresentação, logo; cores e fonte já vêm aplicadas pelo app/layout.tsx) pela
 * função marca_publica() → obterMarca(). Nenhuma das duas abre a tabela configuracoes para anon.
 * Toda a interação (sacola, modal, checkout) fica em components/cardapio/cardapio.tsx.
 */
import type { Metadata } from "next";
import { Cardapio } from "@/components/cardapio/cardapio";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import type { ConfigPublica, DadosCardapio, GrupoPub } from "@/lib/cardapio";
import { obterMarca } from "@/lib/marca-servidor";
import { createClient } from "@/lib/supabase/server";

const CONFIG_PADRAO_PUBLICA: ConfigPublica = {
  whatsapp: null,
  cidade: null,
  endereco: null,
  instagram: null,
  capa_url: null,
  avaliacao: null,
  tempo_entrega: "Somente retirada",
  tempo_retirada: "30–45 min",
  pedido_minimo: 0,
  entrega_gratis_acima: 0,
  aceitar_pedidos_fechado: true,
  aceita_pix: true,
  aceita_cartao: true,
  aceita_dinheiro: true,
};

async function carregarCardapio(): Promise<{ dados: DadosCardapio; erro: boolean }> {
  const supabase = await createClient();
  // Filtros "ativo = true" explícitos: se o DONO estiver logado neste navegador,
  // o RLS dele deixa ver itens ocultos — o cardápio público nunca deve mostrá-los.
  const [marca, cfg, cats, prods, grupos, opcs, links, horarios] = await Promise.all([
    obterMarca(),
    supabase.rpc("configuracao_publica"),
    supabase.from("categorias").select("id, nome, ordem").eq("ativo", true).order("ordem").order("nome"),
    supabase
      .from("produtos")
      .select("id, categoria_id, nome, descricao, preco, preco_antigo, foto_url, selo, disponivel, ordem")
      .eq("ativo", true)
      .order("ordem")
      .order("nome"),
    supabase.from("grupos_opcionais").select("id, titulo, tipo, obrigatorio, max_escolhas, ordem").eq("ativo", true),
    supabase.from("opcionais").select("id, grupo_id, nome, preco, ordem").eq("ativo", true).order("ordem").order("nome"),
    supabase.from("produto_grupos").select("produto_id, grupo_id, ordem").order("ordem"),
    supabase.from("horarios").select("dia_semana, abre, fecha").order("dia_semana").order("abre"),
  ]);

  const erro = [cfg, cats, prods, grupos, opcs, links, horarios].some((r) => r.error);
  if (erro) console.error("[cardapio]", cfg.error ?? cats.error ?? prods.error ?? grupos.error ?? opcs.error ?? links.error);

  const mapaGrupos: Record<string, GrupoPub> = {};
  for (const g of grupos.data ?? []) {
    mapaGrupos[g.id] = { id: g.id, titulo: g.titulo, tipo: g.tipo, obrigatorio: g.obrigatorio, max_escolhas: g.max_escolhas, opcoes: [] };
  }
  for (const o of opcs.data ?? []) mapaGrupos[o.grupo_id]?.opcoes.push({ id: o.id, nome: o.nome, preco: Number(o.preco) });
  // grupo sem nenhuma opção ativa não aparece
  for (const id of Object.keys(mapaGrupos)) if (!mapaGrupos[id].opcoes.length) delete mapaGrupos[id];

  const idsCategorias = new Set((cats.data ?? []).map((c) => c.id));
  const produtos = (prods.data ?? [])
    .filter((p) => idsCategorias.has(p.categoria_id))
    .map((p) => ({
      id: p.id,
      categoria_id: p.categoria_id,
      nome: p.nome,
      descricao: p.descricao,
      preco: Number(p.preco),
      preco_antigo: p.preco_antigo === null ? null : Number(p.preco_antigo),
      foto_url: p.foto_url,
      selo: p.selo,
      disponivel: p.disponivel,
      grupos: (links.data ?? []).filter((l) => l.produto_id === p.id && mapaGrupos[l.grupo_id]).map((l) => l.grupo_id),
    }));

  const cfgBanco = (cfg.data ?? {}) as Partial<ConfigPublica>;
  const config: ConfigPublica = {
    ...CONFIG_PADRAO_PUBLICA,
    ...Object.fromEntries(Object.entries(cfgBanco).filter(([, v]) => v !== null && v !== undefined)),
    pedido_minimo: Number(cfgBanco.pedido_minimo ?? 0),
    entrega_gratis_acima: Number(cfgBanco.entrega_gratis_acima ?? 0),
  } as ConfigPublica;
  // Campo que pode ser vazio de propósito:
  config.capa_url = cfgBanco.capa_url ?? null;

  return {
    erro,
    dados: {
      marca: { nome: marca.nome, subtitulo: marca.subtitulo, logoUrl: marca.logoUrl },
      config,
      categorias: (cats.data ?? []).map((c) => ({ id: c.id, nome: c.nome })),
      produtos,
      grupos: mapaGrupos,
      bairros: [],
      horarios: horarios.data ?? [],
    },
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const { nome } = await obterMarca();
  return {
    title: { absolute: `${nome} — Cardápio Digital` },
    description: `Cardápio digital do ${nome}. Monte seu pedido e envie pelo WhatsApp.`,
  };
}

export default async function PaginaCardapio() {
  const { dados, erro } = await carregarCardapio();

  if (erro && !dados.produtos.length) {
    return (
      <main className="mx-auto grid min-h-dvh max-w-lg place-items-center px-4">
        <EstadoVazio
          titulo="Cardápio indisponível no momento"
          descricao="Não conseguimos carregar o cardápio. Tente de novo em instantes. (Dono: confira se o supabase/schema.sql foi executado.)"
        />
      </main>
    );
  }

  return <Cardapio dados={dados} />;
}
