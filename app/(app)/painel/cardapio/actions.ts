"use server";

/** MUTATIONS de Cardápio: categorias e produtos (com os grupos de opcionais de cada produto). */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type EstadoAcao, errosDoZod, falha, lerFormulario, marcado, mensagemErroBanco, sucesso } from "@/lib/acoes";
import { createClient } from "@/lib/supabase/server";
import { dinheiro, dinheiroOpcional, inteiro, textoOpcional, uuid } from "@/lib/validacao";

function atualizarTelas() {
  revalidatePath("/painel/cardapio");
  revalidatePath("/"); // cardápio público
}

// ---------------------------------------------------------------- categorias
const esquemaCategoria = z.object({
  id: z.union([uuid, z.literal("")]),
  nome: z.string().trim().min(1, "Informe o nome da categoria.").max(60, "Máximo de 60 caracteres."),
  ordem: inteiro(0),
});

export async function salvarCategoria(_anterior: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const dados = esquemaCategoria.safeParse(lerFormulario(formData));
  if (!dados.success) return falha("Confira os campos destacados.", errosDoZod(dados.error));
  const { id, ...campos } = dados.data;
  const registro = { ...campos, ativo: marcado(formData, "ativo") };
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("categorias").update(registro).eq("id", id)
    : await supabase.from("categorias").insert(registro);
  if (error) return falha(mensagemErroBanco(error));
  atualizarTelas();
  return sucesso(id ? "Categoria atualizada." : "Categoria criada.");
}

export async function excluirCategoria(id: string): Promise<EstadoAcao> {
  if (!uuid.safeParse(id).success) return falha("Categoria inválida.");
  const supabase = await createClient();
  const { error } = await supabase.from("categorias").delete().eq("id", id);
  if (error?.code === "23503") return falha("Esta categoria ainda tem produtos. Mova ou exclua os produtos antes.");
  if (error) return falha(mensagemErroBanco(error));
  atualizarTelas();
  return sucesso("Categoria excluída.");
}

// ---------------------------------------------------------------- produtos
const esquemaProduto = z
  .object({
    id: z.union([uuid, z.literal("")]),
    categoria_id: z.guid("Escolha a categoria."),
    nome: z.string().trim().min(1, "Informe o nome do produto.").max(80, "Máximo de 80 caracteres."),
    descricao: z.string().trim().max(400, "Máximo de 400 caracteres."),
    preco: dinheiro("Informe o preço."),
    preco_antigo: dinheiroOpcional(),
    foto_url: textoOpcional(500).refine((v) => v === null || /^https?:\/\//i.test(v), "Use um link que comece com https://"),
    selo: z.enum(["", "mais-pedido", "novo"]).transform((v) => (v === "" ? null : v)),
    ordem: inteiro(0),
  })
  .refine((d) => d.preco_antigo === null || d.preco_antigo > d.preco, {
    path: ["preco_antigo"],
    message: 'O preço "de" precisa ser maior que o preço atual.',
  });

export async function salvarProduto(_anterior: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const dados = esquemaProduto.safeParse(lerFormulario(formData));
  if (!dados.success) return falha("Confira os campos destacados.", errosDoZod(dados.error));
  const grupos = z.array(uuid).max(20).safeParse(formData.getAll("grupos").map(String));
  if (!grupos.success) return falha("Grupo de opcionais inválido.");

  const { id, ...campos } = dados.data;
  const registro = { ...campos, disponivel: marcado(formData, "disponivel"), ativo: marcado(formData, "ativo") };
  const supabase = await createClient();

  let produtoId = id;
  if (id) {
    const { error } = await supabase.from("produtos").update(registro).eq("id", id);
    if (error) return falha(mensagemErroBanco(error));
  } else {
    const { data, error } = await supabase.from("produtos").insert(registro).select("id").single();
    if (error || !data) return falha(mensagemErroBanco(error));
    produtoId = data.id;
  }

  // Opcionais do produto: grava os marcados (na ordem) e remove os desmarcados.
  const marcados = grupos.data;
  if (marcados.length) {
    const { error } = await supabase
      .from("produto_grupos")
      .upsert(marcados.map((grupo_id, i) => ({ produto_id: produtoId, grupo_id, ordem: i + 1 })), { onConflict: "produto_id,grupo_id" });
    if (error) return falha(mensagemErroBanco(error));
  }
  let limpeza = supabase.from("produto_grupos").delete().eq("produto_id", produtoId);
  if (marcados.length) limpeza = limpeza.not("grupo_id", "in", `(${marcados.join(",")})`);
  const { error: erroLimpeza } = await limpeza;
  if (erroLimpeza) return falha(mensagemErroBanco(erroLimpeza));

  atualizarTelas();
  return sucesso(id ? "Produto atualizado." : "Produto criado.");
}

export async function excluirProduto(id: string): Promise<EstadoAcao> {
  if (!uuid.safeParse(id).success) return falha("Produto inválido.");
  const supabase = await createClient();
  const { error } = await supabase.from("produtos").delete().eq("id", id);
  if (error) return falha(mensagemErroBanco(error));
  atualizarTelas();
  return sucesso("Produto excluído.");
}

/** Liga/desliga "disponível" (esgotado) ou "ativo" (aparece no cardápio) com 1 toque. */
export async function alternarProduto(id: string, campo: "disponivel" | "ativo", valor: boolean): Promise<EstadoAcao> {
  if (!uuid.safeParse(id).success || !["disponivel", "ativo"].includes(campo)) return falha("Dados inválidos.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("produtos")
    .update(campo === "disponivel" ? { disponivel: valor } : { ativo: valor })
    .eq("id", id);
  if (error) return falha(mensagemErroBanco(error));
  atualizarTelas();
  if (campo === "disponivel") return sucesso(valor ? "Produto disponível de novo." : "Produto marcado como esgotado.");
  return sucesso(valor ? "Produto visível no cardápio." : "Produto escondido do cardápio.");
}
