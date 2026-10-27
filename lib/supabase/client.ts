/**
 * Cliente Supabase para o NAVEGADOR (componentes com "use client").
 *
 * Use só quando precisar de algo que roda no browser (ex.: realtime,
 * upload com barra de progresso). Para ler dados prefira Server Components
 * e para gravar use Server Actions (padrão do projeto — veja COMO-ESTENDER.md).
 */
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/tipos";
import { obterEnvSupabase } from "./env";

export function createClient() {
  const { url, chave } = obterEnvSupabase();
  return createBrowserClient<Database>(url, chave);
}
