/** CARDÁPIO (painel) — categorias e produtos. Leitura no servidor; edição em ./gerenciar-cardapio.tsx. */
import type { Metadata } from "next";
import { CabecalhoPagina } from "@/components/ui/cartao";
import { createClient } from "@/lib/supabase/server";
import { GerenciarCardapio } from "./gerenciar-cardapio";

export const metadata: Metadata = { title: "Cardápio" };

export default async function PaginaCardapioPainel() {
  const supabase = await createClient();
  const [cats, prods, grupos, links] = await Promise.all([
    supabase.from("categorias").select("*").order("ordem").order("nome"),
    supabase.from("produtos").select("*").order("ordem").order("nome"),
    supabase.from("grupos_opcionais").select("id, titulo, ativo, obrigatorio, tipo").order("ordem").order("titulo"),
    supabase.from("produto_grupos").select("produto_id, grupo_id, ordem").order("ordem"),
  ]);

  return (
    <>
      <CabecalhoPagina
        titulo="Cardápio"
        descricao="Categorias e produtos que aparecem para o cliente. Marque “esgotado” com 1 toque."
        acoes={
          <a href="/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-xl border border-borda bg-superficie px-4 text-sm font-semibold">
            Ver cardápio do cliente
          </a>
        }
      />
      <GerenciarCardapio
        categorias={cats.data ?? []}
        produtos={prods.data ?? []}
        grupos={grupos.data ?? []}
        links={links.data ?? []}
      />
    </>
  );
}
