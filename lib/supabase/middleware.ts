/**
 * Lógica de sessão executada pelo proxy.ts a cada requisição
 * (no Next.js 16 o antigo "middleware.ts" passou a se chamar "proxy.ts").
 *
 * 1. Renova o token de sessão do Supabase e grava os cookies atualizados.
 * 2. Visitante não logado em rota protegida → redireciona para /login?next=/rota.
 * 3. Usuário logado abrindo /login → redireciona para o início.
 *
 * As rotas públicas ficam em lib/rotas.ts.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ROTA_INICIAL, ehRotaPublica, ehRotaSoDeslogado } from "@/lib/rotas";
import { obterEnvSupabase, supabaseConfigurado } from "./env";

export async function atualizarSessao(request: NextRequest) {
  // Sem variáveis de ambiente: qualquer endereço mostra a tela "Configure as variáveis".
  if (!supabaseConfigurado) {
    return NextResponse.rewrite(new URL("/configurar-ambiente", request.url));
  }

  const { url, chave } = obterEnvSupabase();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, chave, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesParaGravar, headers) {
        cookiesParaGravar.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesParaGravar.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        // Cabeçalhos anti-cache enviados pelo Supabase quando a sessão muda.
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // NÃO coloque código entre createServerClient e getClaims():
  // é essa chamada que valida e renova a sessão.
  let logado = false;
  try {
    const { data } = await supabase.auth.getClaims();
    logado = Boolean(data?.claims?.sub);
  } catch {
    // Supabase fora do ar / URL errada: trata como deslogado (a tela de login mostra o erro).
    logado = false;
  }

  const caminho = request.nextUrl.pathname;

  if (!logado && !ehRotaPublica(caminho)) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    destino.search = "";
    if (caminho !== ROTA_INICIAL) destino.searchParams.set("next", caminho + request.nextUrl.search);
    return redirecionarMantendoCookies(destino, response);
  }

  if (logado && ehRotaSoDeslogado(caminho)) {
    const destino = request.nextUrl.clone();
    destino.pathname = ROTA_INICIAL;
    destino.search = "";
    return redirecionarMantendoCookies(destino, response);
  }

  // Devolva SEMPRE o objeto response (ele carrega os cookies renovados).
  return response;
}

function redirecionarMantendoCookies(destino: URL, response: NextResponse) {
  const redirect = NextResponse.redirect(destino);
  response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  return redirect;
}
