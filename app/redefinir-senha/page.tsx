import type { Metadata } from "next";
import Link from "next/link";
import { TelaAuth } from "@/components/tela-auth";
import { classesBotao } from "@/components/ui/botao";
import { createClient } from "@/lib/supabase/server";
import { FormNovaSenha } from "./form-nova-senha";

export const metadata: Metadata = { title: "Nova senha" };

/**
 * Chega-se aqui pelo link do e-mail (via /auth/confirmar, que cria a sessão).
 * Sem sessão válida → mostra aviso de link expirado.
 */
export default async function PaginaRedefinirSenha({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  return (
    <TelaAuth>
      {data.user && !erro ? (
        <>
          <h1 className="text-lg font-semibold text-texto">Criar nova senha</h1>
          <p className="mt-1 text-sm text-texto-2">
            Conta: <strong className="text-texto">{data.user.email}</strong>
          </p>
          <FormNovaSenha />
        </>
      ) : (
        <>
          <h1 className="text-lg font-semibold text-texto">Link inválido ou expirado</h1>
          <p className="mt-2 text-sm text-texto-2">
            Os links de recuperação valem por pouco tempo e só podem ser usados uma vez, no mesmo navegador em que
            você pediu. Peça um novo na tela de login em &quot;Esqueci minha senha&quot;.
          </p>
          <Link href="/login" className={classesBotao("primario", "mt-5 w-full")}>
            Ir para o login
          </Link>
        </>
      )}
    </TelaAuth>
  );
}
