/**
 * Leitura das variáveis de ambiente do Supabase.
 *
 * As ÚNICAS variáveis obrigatórias do projeto são:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY   (ou NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, nome novo do Supabase)
 *
 * IMPORTANTE: o Next.js só "embute" variáveis NEXT_PUBLIC_ no navegador quando elas
 * são escritas por extenso (process.env.NOME_COMPLETO). Por isso não use
 * process.env[variavel] aqui.
 *
 * Se as variáveis faltarem (ou a URL for inválida), o app mostra a tela
 * "Configure as variáveis de ambiente" em vez de quebrar.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const chave = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  ""
).trim();

function urlValida(valor: string) {
  try {
    const u = new URL(valor);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/** true quando as duas variáveis estão preenchidas e a URL é válida. */
export const supabaseConfigurado = urlValida(url) && chave.length > 0;

/** Retorna URL e chave pública. Lança erro claro se não estiverem configuradas. */
export function obterEnvSupabase() {
  if (!supabaseConfigurado) {
    throw new Error(
      "Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY (veja o README).",
    );
  }
  return { url, chave };
}
