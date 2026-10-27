/**
 * Cliente Supabase para o SERVIDOR: Server Components, Server Actions e Route Handlers.
 *
 * Crie um cliente novo a cada requisição (não guarde em variável global).
 * Ele lê/grava os cookies de sessão do usuário logado, então todas as
 * consultas respeitam as políticas RLS do banco como "authenticated".
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/tipos";
import { obterEnvSupabase } from "./env";

export async function createClient() {
  // cookies() primeiro: marca a rota como dinâmica (renderizada a cada acesso). No Next 16 é assíncrono.
  const cookieStore = await cookies();
  const { url, chave } = obterEnvSupabase();

  return createServerClient<Database>(url, chave, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesParaGravar) {
        try {
          cookiesParaGravar.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Chamado dentro de um Server Component (onde não dá para gravar cookies).
          // Tudo bem: o proxy.ts já renova a sessão a cada requisição.
        }
      },
    },
  });
}
