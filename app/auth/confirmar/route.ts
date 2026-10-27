/**
 * Recebe o link do e-mail do Supabase (recuperação de senha, convite, confirmação).
 * Troca o código do link por uma sessão e manda o usuário para `next`.
 *
 * Aceita os dois formatos de link:
 *  - ?code=...                      (padrão do Supabase com @supabase/ssr / PKCE)
 *  - ?token_hash=...&type=recovery  (se você personalizar o template do e-mail — ver README)
 */
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { destinoSeguro } from "@/lib/rotas";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = destinoSeguro(searchParams.get("next"), "/redefinir-senha");
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  let ok = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  }

  if (ok) return NextResponse.redirect(new URL(next, origin));
  return NextResponse.redirect(new URL("/redefinir-senha?erro=link", origin));
}
