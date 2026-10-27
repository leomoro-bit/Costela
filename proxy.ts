/**
 * Proxy do Next.js 16 (o antigo middleware.ts foi renomeado para proxy.ts).
 * Roda antes de cada página: renova a sessão do Supabase e protege as rotas.
 * A lógica está em lib/supabase/middleware.ts e as rotas públicas em lib/rotas.ts.
 */
import type { NextRequest } from "next/server";
import { atualizarSessao } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return atualizarSessao(request);
}

export const config = {
  // Roda em tudo, exceto arquivos estáticos e imagens.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)",
  ],
};
