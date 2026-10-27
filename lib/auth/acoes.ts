"use server";

/**
 * Server Actions de autenticação: entrar, sair, recuperar e redefinir senha.
 * Não existe cadastro público: o dono cria os usuários no painel do Supabase
 * (Authentication ▸ Users ▸ Add user).
 */
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { type EstadoAcao, errosDoZod, falha, sucesso } from "@/lib/acoes";
import { destinoSeguro } from "@/lib/rotas";
import { createClient } from "@/lib/supabase/server";

const esquemaLogin = z.object({
  email: z.email("Informe um e-mail válido."),
  senha: z.string().min(1, "Informe a senha."),
});

export async function entrar(_anterior: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const dados = esquemaLogin.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    senha: String(formData.get("senha") ?? ""),
  });
  if (!dados.success) return falha("Confira os campos destacados.", errosDoZod(dados.error));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: dados.data.email,
    password: dados.data.senha,
  });
  if (error) return falha(traduzirErroAuth(error.message, error.code));

  redirect(destinoSeguro(formData.get("next")));
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const esquemaEmail = z.object({ email: z.email("Informe um e-mail válido.") });

/** Envia o e-mail "Redefinir senha". O link volta para /auth/confirmar → /redefinir-senha. */
export async function enviarRecuperacao(_anterior: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const dados = esquemaEmail.safeParse({ email: String(formData.get("email") ?? "").trim() });
  if (!dados.success) return falha("Informe um e-mail válido.", errosDoZod(dados.error));

  const origem = await origemDoSite();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(dados.data.email, {
    redirectTo: `${origem}/auth/confirmar?next=/redefinir-senha`,
  });
  if (error && error.status === 429) {
    return falha("Muitas tentativas. Aguarde alguns minutos e tente de novo.");
  }
  // Por segurança, a resposta é a mesma exista ou não o e-mail.
  return sucesso("Se este e-mail estiver cadastrado, você receberá um link para criar uma nova senha.");
}

const esquemaNovaSenha = z
  .object({
    senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
    confirmacao: z.string(),
  })
  .refine((d) => d.senha === d.confirmacao, { message: "As senhas não conferem.", path: ["confirmacao"] });

export async function redefinirSenha(_anterior: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const dados = esquemaNovaSenha.safeParse({
    senha: String(formData.get("senha") ?? ""),
    confirmacao: String(formData.get("confirmacao") ?? ""),
  });
  if (!dados.success) return falha("Confira os campos destacados.", errosDoZod(dados.error));

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return falha("O link expirou. Peça um novo em \"Esqueci minha senha\".");

  const { error } = await supabase.auth.updateUser({ password: dados.data.senha });
  if (error) return falha(traduzirErroAuth(error.message, error.code));

  redirect("/painel?senha=alterada");
}

/** Descobre o endereço do site (localhost, domínio da Vercel ou domínio próprio). */
async function origemDoSite() {
  const h = await headers();
  const origem = h.get("origin");
  if (origem) return origem;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocolo = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocolo}://${host}`;
}

function traduzirErroAuth(mensagem: string, codigo?: string) {
  const m = mensagem.toLowerCase();
  if (codigo === "invalid_credentials" || m.includes("invalid login")) return "E-mail ou senha incorretos.";
  if (codigo === "email_not_confirmed" || m.includes("not confirmed")) return "E-mail ainda não confirmado. Confirme pelo link recebido ou peça ao administrador.";
  if (codigo === "same_password" || m.includes("different from the old")) return "A nova senha precisa ser diferente da atual.";
  if (codigo === "weak_password" || m.includes("weak")) return "Senha fraca. Use pelo menos 8 caracteres com letras e números.";
  if (m.includes("rate limit") || codigo === "over_request_rate_limit") return "Muitas tentativas. Aguarde alguns minutos.";
  if (m.includes("fetch failed") || m.includes("network")) return "Não foi possível conectar ao Supabase. Verifique a URL nas variáveis de ambiente.";
  return "Não foi possível entrar agora. Tente novamente.";
}
