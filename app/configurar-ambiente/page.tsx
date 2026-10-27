/**
 * Quando faltam as variáveis do Supabase, o proxy.ts manda TODAS as rotas para cá.
 * (O layout raiz também mostra a mesma tela como segunda proteção.)
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ConfigurarAmbiente } from "@/components/configurar-ambiente";
import { supabaseConfigurado } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Configure as variáveis de ambiente" };

export default function PaginaConfigurarAmbiente() {
  if (supabaseConfigurado) redirect("/");
  return <ConfigurarAmbiente />;
}
