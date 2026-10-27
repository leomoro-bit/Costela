/** CUPONS (painel) — códigos de desconto do cardápio. */
import type { Metadata } from "next";
import { CabecalhoPagina } from "@/components/ui/cartao";
import { createClient } from "@/lib/supabase/server";
import { GerenciarCupons } from "./gerenciar-cupons";

export const metadata: Metadata = { title: "Cupons" };

export default async function PaginaCupons() {
  const supabase = await createClient();
  const [cupons, usos] = await Promise.all([
    supabase.from("cupons").select("*").order("codigo"),
    supabase.from("pedidos").select("cupom").not("cupom", "is", null).neq("status", "cancelado"),
  ]);
  const contagem: Record<string, number> = {};
  for (const u of usos.data ?? []) if (u.cupom) contagem[u.cupom] = (contagem[u.cupom] ?? 0) + 1;
  return (
    <>
      <CabecalhoPagina titulo="Cupons" descricao="Divulgue no Instagram/WhatsApp. O cliente digita o código na sacola e o desconto é conferido no banco." />
      <GerenciarCupons cupons={cupons.data ?? []} usos={contagem} />
    </>
  );
}
