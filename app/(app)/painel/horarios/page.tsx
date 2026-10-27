/** HORÁRIOS (painel) — quando a loja abre. O cardápio mostra "Aberto agora / Fechado" sozinho. */
import type { Metadata } from "next";
import { CabecalhoPagina, Selo } from "@/components/ui/cartao";
import { createClient } from "@/lib/supabase/server";
import { GerenciarHorarios } from "./gerenciar-horarios";

export const metadata: Metadata = { title: "Horários" };

export default async function PaginaHorarios() {
  const supabase = await createClient();
  const [{ data }, aberta] = await Promise.all([
    supabase.from("horarios").select("*").order("dia_semana").order("abre"),
    supabase.rpc("loja_aberta"),
  ]);
  return (
    <>
      <CabecalhoPagina
        titulo="Horários"
        descricao="Várias faixas por dia (ex.: almoço e jantar). Se fechar depois da meia-noite, use o horário normalmente (18:00 → 00:30)."
        acoes={aberta.data ? <Selo cor="ok">Aberto agora</Selo> : <Selo cor="perigo">Fechado agora</Selo>}
      />
      <GerenciarHorarios horarios={data ?? []} />
    </>
  );
}
