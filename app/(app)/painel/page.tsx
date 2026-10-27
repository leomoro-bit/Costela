/**
 * PEDIDOS RECEBIDOS — tela principal do painel ("/painel").
 * Lê no servidor; a parte interativa (mudar status, WhatsApp, impressão e o
 * aviso em TEMPO REAL de pedido novo) fica em ./painel-pedidos.tsx.
 */
import type { Metadata } from "next";
import { CabecalhoPagina } from "@/components/ui/cartao";
import { obterConfiguracoes } from "@/lib/configuracoes";
import { formatarDataExtenso, hojeISO } from "@/lib/formatar";
import { obterMarca } from "@/lib/marca-servidor";
import { createClient } from "@/lib/supabase/server";
import type { StatusPedido } from "@/lib/tipos";
import { PainelPedidos, type FiltroPedidos } from "./painel-pedidos";

export const metadata: Metadata = { title: "Pedidos" };

const FILTROS: FiltroPedidos[] = ["abertos", "novo", "preparando", "saiu", "entregue", "cancelado", "todos"];

export default async function PaginaPedidos({ searchParams }: { searchParams: Promise<{ status?: string; senha?: string }> }) {
  const { status, senha } = await searchParams;
  const filtro: FiltroPedidos = FILTROS.includes(status as FiltroPedidos) ? (status as FiltroPedidos) : "abertos";
  const supabase = await createClient();

  let consulta = supabase.from("pedidos").select("*").order("created_at", { ascending: false }).limit(80);
  if (filtro === "abertos") consulta = consulta.in("status", ["novo", "preparando", "saiu"]);
  else if (filtro !== "todos") consulta = consulta.eq("status", filtro as StatusPedido);

  const inicioHoje = `${hojeISO()}T00:00:00-03:00`;
  const [pedidosRes, hojeRes, abertosRes, config, marca] = await Promise.all([
    consulta,
    supabase.from("pedidos").select("status, total").gte("created_at", inicioHoje),
    supabase.from("pedidos").select("status").in("status", ["novo", "preparando", "saiu"]),
    obterConfiguracoes(),
    obterMarca(),
  ]);
  const pedidos = pedidosRes.data ?? [];
  const ids = pedidos.map((p) => p.id);
  const itensRes = ids.length
    ? await supabase.from("pedido_itens").select("*").in("pedido_id", ids).order("created_at")
    : { data: [], error: null };

  const hoje = (hojeRes.data ?? []).filter((p) => p.status !== "cancelado");
  const faturamento = hoje.reduce((s, p) => s + Number(p.total), 0);
  const contagem: Partial<Record<StatusPedido, number>> = {};
  for (const p of abertosRes.data ?? []) contagem[p.status] = (contagem[p.status] ?? 0) + 1;

  return (
    <>
      <CabecalhoPagina titulo="Pedidos" descricao={`Hoje é ${formatarDataExtenso(new Date())}. Pedidos novos chegam sozinhos, com aviso sonoro.`} />
      {senha === "alterada" && (
        <p role="status" className="mb-6 rounded-xl bg-ok-suave p-3 text-sm text-ok">
          Senha alterada com sucesso.
        </p>
      )}
      {pedidosRes.error && (
        <p role="alert" className="mb-6 rounded-xl bg-alerta-suave p-3 text-sm text-alerta">
          Não foi possível ler os pedidos. Confira se o supabase/schema.sql foi executado.
        </p>
      )}
      <PainelPedidos
        filtro={filtro}
        pedidos={pedidos}
        itens={itensRes.data ?? []}
        contagem={contagem}
        kpis={{ hoje: hoje.length, faturamento, ticket: hoje.length ? faturamento / hoje.length : 0 }}
        negocio={{ nome: marca.nome, logoUrl: marca.logoUrl, chavePix: config.chave_pix, som: config.som_novo_pedido }}
      />
    </>
  );
}
