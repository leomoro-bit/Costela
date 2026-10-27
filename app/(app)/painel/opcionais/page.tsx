/** OPCIONAIS (painel) — grupos de adicionais reutilizáveis e suas opções. */
import type { Metadata } from "next";
import { CabecalhoPagina } from "@/components/ui/cartao";
import { createClient } from "@/lib/supabase/server";
import { GerenciarOpcionais } from "./gerenciar-opcionais";

export const metadata: Metadata = { title: "Opcionais" };

export default async function PaginaOpcionais() {
  const supabase = await createClient();
  const [grupos, opcionais, links, produtos] = await Promise.all([
    supabase.from("grupos_opcionais").select("*").order("ordem").order("titulo"),
    supabase.from("opcionais").select("*").order("ordem").order("nome"),
    supabase.from("produto_grupos").select("produto_id, grupo_id"),
    supabase.from("produtos").select("id, nome"),
  ]);
  return (
    <>
      <CabecalhoPagina
        titulo="Opcionais"
        descricao="Tamanhos, bordas, adicionais, sabores... Crie o grupo uma vez e use em vários produtos (menu Cardápio)."
      />
      <GerenciarOpcionais grupos={grupos.data ?? []} opcionais={opcionais.data ?? []} links={links.data ?? []} produtos={produtos.data ?? []} />
    </>
  );
}
