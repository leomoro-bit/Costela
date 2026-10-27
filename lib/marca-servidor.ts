/**
 * Leitura da MARCA no servidor (layout raiz, login, favicon, documentos).
 *
 * Usa a função `marca_publica()` do banco, que devolve SÓ os campos de marca
 * (nome exibido, subtítulo, logo, cores, fonte, raio, tema). Ela funciona com e sem
 * login — por isso a tela de login e as rotas públicas também mostram a marca,
 * sem abrir a tabela `configuracoes` para visitantes.
 *
 * - `cache()`: uma única consulta por requisição (layout + metadata + página).
 * - Fallback seguro: sem variáveis, Supabase fora do ar ou schema antigo → MARCA_PADRAO.
 */
import "server-only";
import { cache } from "react";
import { MARCA_PADRAO, type Marca, normalizarMarca } from "@/lib/marca";
import { supabaseConfigurado } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const obterMarca = cache(async (): Promise<Marca> => {
  if (!supabaseConfigurado) return MARCA_PADRAO;
  // Fora do try: cookies() avisa o Next que a página é dinâmica (esse aviso não pode ser "engolido").
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .rpc("marca_publica")
      .abortSignal(AbortSignal.timeout(4000)) // não trava a página se o Supabase estiver lento
      .maybeSingle();
    if (error) {
      console.error("[marca]", error.message);
      return MARCA_PADRAO;
    }
    return normalizarMarca(data);
  } catch (erro) {
    console.error("[marca]", erro instanceof Error ? erro.message : erro);
    return MARCA_PADRAO;
  }
});
