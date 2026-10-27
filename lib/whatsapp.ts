/**
 * Links do WhatsApp (wa.me) com mensagem pronta.
 * Não usa API paga: abre o WhatsApp do celular/computador com o texto preenchido.
 *
 * Exemplo:
 *   linkWhatsApp("(11) 90000-0000", "Olá! Seu horário está confirmado.")
 *   → "https://wa.me/5511900000000?text=Ol%C3%A1!%20Seu%20hor%C3%A1rio..."
 */
import { somenteDigitos } from "./formatar";

/** Normaliza para o formato internacional só com dígitos (acrescenta 55 se faltar). */
export function numeroWhatsApp(telefone: string | null | undefined) {
  const d = somenteDigitos(telefone);
  if (!d) return "";
  if (d.length === 10 || d.length === 11) return "55" + d; // DDD + número
  return d;
}

/**
 * Monta o link. Sem número → abre o WhatsApp para a pessoa escolher o contato.
 * Use em <a href={...} target="_blank" rel="noopener noreferrer">.
 */
export function linkWhatsApp(telefone: string | null | undefined, mensagem = "") {
  const numero = numeroWhatsApp(telefone);
  const texto = mensagem ? `?text=${encodeURIComponent(mensagem)}` : "";
  return `https://wa.me/${numero}${texto}`;
}

/**
 * Troca {chaves} por valores: preencherModelo("Oi {nome}!", { nome: "Ana" }) → "Oi Ana!"
 * Útil para mensagens editáveis salvas em `configuracoes`.
 */
export function preencherModelo(modelo: string, valores: Record<string, string | number | null | undefined>) {
  return modelo.replace(/\{(\w+)\}/g, (_, chave: string) => {
    const v = valores[chave];
    return v === null || v === undefined ? "" : String(v);
  });
}
