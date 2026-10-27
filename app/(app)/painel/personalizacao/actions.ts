"use server";

/**
 * MUTATIONS da Personalização (marca do cliente). Mesmo padrão de Configurações:
 * zod → grava com o cliente do servidor (RLS) → revalidatePath → EstadoAcao.
 *
 * A logo vai para o Supabase Storage (pasta pública "marca", criada no schema.sql).
 * O arquivo é conferido aqui no servidor: tamanho, tipo REAL (pelos primeiros bytes)
 * e, no caso de SVG, se não tem scripts.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type EstadoAcao, errosDoZod, falha, lerFormulario, mensagemErroBanco, sucesso } from "@/lib/acoes";
import {
  FONTES,
  type Fonte,
  LOGO_BUCKET,
  MARCA_PADRAO,
  RAIOS,
  type Raio,
  TEMAS,
  type TemaPadrao,
  erroArquivoLogo,
} from "@/lib/marca";
import { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo de ${max} caracteres.`)
    .transform((v) => (v === "" ? null : v));

const cor = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida. Use o formato #RRGGBB (ex.: #5B2A4E).")
  .transform((v) => v.toUpperCase());

const esquema = z.object({
  nome_exibicao: textoOpcional(60),
  subtitulo: textoOpcional(140), // "frase de apresentação" do cardápio
  cor_primaria: cor,
  cor_destaque: cor,
  fonte: z.enum(FONTES.map((f) => f.id) as [Fonte, ...Fonte[]], "Escolha uma fonte."),
  raio: z.enum(RAIOS.map((r) => r.id) as [Raio, ...Raio[]], "Escolha o arredondamento."),
  tema_padrao: z.enum(TEMAS.map((t) => t.id) as [TemaPadrao, ...TemaPadrao[]], "Escolha o tema."),
  remover_logo: z
    .string()
    .optional()
    .transform((v) => v === "1"),
});

export async function salvarPersonalizacao(_anterior: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const dados = esquema.safeParse(lerFormulario(formData));
  if (!dados.success) return falha("Confira os campos destacados.", errosDoZod(dados.error));
  const { remover_logo, ...campos } = dados.data;

  const supabase = await createClient();
  const { data: atual } = await supabase.from("configuracoes").select("logo_url").eq("unica", true).maybeSingle();

  // undefined = não mexe na logo; null = remove; texto = logo nova
  let logo_url: string | null | undefined;
  let caminhoNovo: string | null = null;

  const arquivo = formData.get("logo");
  if (arquivo instanceof File && arquivo.size > 0) {
    const logo = await conferirLogo(arquivo);
    if ("erro" in logo) return falha(logo.erro, { logo: logo.erro });

    caminhoNovo = `logo/logo-${Date.now()}.${logo.extensao}`;
    const { error } = await supabase.storage
      .from(LOGO_BUCKET)
      .upload(caminhoNovo, logo.bytes, { contentType: logo.tipo, cacheControl: "31536000", upsert: false });
    if (error) {
      console.error("[salvarPersonalizacao] upload", error);
      const mensagem = mensagemErroStorage(error.message);
      return falha(mensagem, { logo: mensagem });
    }
    logo_url = supabase.storage.from(LOGO_BUCKET).getPublicUrl(caminhoNovo).data.publicUrl;
  } else if (remover_logo) {
    logo_url = null;
  }

  const { error } = await supabase
    .from("configuracoes")
    .upsert({ unica: true, ...campos, ...(logo_url !== undefined ? { logo_url } : {}) }, { onConflict: "unica" });

  if (error) {
    console.error("[salvarPersonalizacao]", error);
    if (caminhoNovo) await supabase.storage.from(LOGO_BUCKET).remove([caminhoNovo]);
    return falha(mensagemErroBanco(error));
  }

  if (logo_url !== undefined) await apagarLogoAntiga(supabase, atual?.logo_url);

  // "layout": o layout raiz aplica a marca em TODAS as páginas.
  revalidatePath("/", "layout");
  return sucesso("Personalização salva! A nova marca já vale para todo o app.");
}

/** Botão "Restaurar padrão" (com confirmação): volta a marca ao original e apaga a logo. */
export async function restaurarPersonalizacao(): Promise<EstadoAcao> {
  const supabase = await createClient();
  const { data: atual } = await supabase.from("configuracoes").select("logo_url").eq("unica", true).maybeSingle();

  const { error } = await supabase
    .from("configuracoes")
    .update({
      nome_exibicao: null,
      subtitulo: null,
      logo_url: null,
      cor_primaria: MARCA_PADRAO.corPrimaria,
      cor_destaque: MARCA_PADRAO.corDestaque,
      fonte: MARCA_PADRAO.fonte,
      raio: MARCA_PADRAO.raio,
      tema_padrao: MARCA_PADRAO.temaPadrao,
    })
    .eq("unica", true);
  if (error) return falha(mensagemErroBanco(error));

  await apagarLogoAntiga(supabase, atual?.logo_url);
  revalidatePath("/", "layout");
  return sucesso("Marca restaurada para o padrão.");
}

// ---------------------------------------------------------------------------

type LogoConferida = { bytes: Uint8Array; tipo: string; extensao: string } | { erro: string };

/** Confere tamanho e o tipo REAL do arquivo (não confia só na extensão/tipo enviado). */
async function conferirLogo(arquivo: File): Promise<LogoConferida> {
  const erroBasico = erroArquivoLogo(arquivo);
  if (erroBasico) return { erro: erroBasico };

  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  const comeca = (...b: number[]) => b.every((v, i) => bytes[i] === v);
  const ascii = (inicio: number, fim: number) => String.fromCharCode(...bytes.slice(inicio, fim));

  if (comeca(0x89, 0x50, 0x4e, 0x47)) return { bytes, tipo: "image/png", extensao: "png" };
  if (comeca(0xff, 0xd8, 0xff)) return { bytes, tipo: "image/jpeg", extensao: "jpg" };
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { bytes, tipo: "image/webp", extensao: "webp" };

  const texto = new TextDecoder().decode(bytes);
  if (/<svg[\s>]/i.test(texto)) {
    // SVG pode conter código: recusa scripts, eventos (onload=...), links javascript: e HTML embutido.
    if (/<script|\son[a-z]+\s*=|javascript:|<foreignObject|<iframe|<embed|<object/i.test(texto)) {
      return { erro: "Este SVG tem código embutido e não é aceito por segurança. Exporte de novo ou envie em PNG." };
    }
    return { bytes, tipo: "image/svg+xml", extensao: "svg" };
  }
  return { erro: "O arquivo não parece ser uma imagem válida. Envie PNG, JPG, SVG ou WebP." };
}

/** Apaga do Storage a logo anterior (só se ela estiver na pasta "marca" deste projeto). */
async function apagarLogoAntiga(supabase: Supabase, urlAntiga: string | null | undefined) {
  const marcador = `/storage/v1/object/public/${LOGO_BUCKET}/`;
  if (!urlAntiga || !urlAntiga.includes(marcador)) return;
  const caminho = decodeURIComponent(urlAntiga.split(marcador)[1] ?? "");
  if (!caminho) return;
  const { error } = await supabase.storage.from(LOGO_BUCKET).remove([caminho]);
  if (error) console.error("[apagarLogoAntiga]", error.message); // não impede o salvamento
}

function mensagemErroStorage(mensagem: string) {
  const m = mensagem.toLowerCase();
  if (m.includes("bucket not found")) {
    return 'A pasta de arquivos "marca" não existe no Supabase. Rode o arquivo supabase/schema.sql de novo no SQL Editor.';
  }
  if (m.includes("row-level security") || m.includes("unauthorized") || m.includes("403")) {
    return "Sem permissão para enviar a logo. Faça login de novo (ou rode o supabase/schema.sql para criar as permissões).";
  }
  if (m.includes("size") || m.includes("too large")) return "A imagem passa de 1 MB. Diminua o arquivo e tente de novo.";
  if (m.includes("mime") || m.includes("type")) return "Formato não aceito. Envie PNG, JPG, SVG ou WebP.";
  return "Não foi possível enviar a logo. Verifique sua conexão e tente novamente.";
}
