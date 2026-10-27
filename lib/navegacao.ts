/**
 * MENU DO PAINEL — sidebar (computador) e barra inferior (celular) são geradas daqui.
 *
 * Para adicionar uma página ao menu:
 *   1. crie app/(app)/painel/minha-pagina/page.tsx
 *   2. adicione um item abaixo (ícones: https://lucide.dev/icons — importe de "lucide-react")
 *
 * No celular aparecem no máximo 4 itens com `celular: true`; o restante vai para o botão "Mais".
 * O cardápio do cliente fica em "/" (público) — o painel da equipe fica em "/painel".
 */
import {
  BadgePercent,
  Clock,
  ListPlus,
  ReceiptText,
  Settings,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

export type ItemNavegacao = {
  titulo: string;
  href: string;
  icone: LucideIcon;
  /** Mostrar direto na barra inferior do celular (máx. 4). Padrão: false. */
  celular?: boolean;
  /** Ativo só no endereço exato (ex.: "/painel" não fica ativo em "/painel/cupons"). */
  exato?: boolean;
};

export const NAVEGACAO: ItemNavegacao[] = [
  { titulo: "Pedidos", href: "/painel", icone: ReceiptText, celular: true, exato: true },
  { titulo: "Cardápio", href: "/painel/cardapio", icone: UtensilsCrossed, celular: true },
  { titulo: "Opcionais", href: "/painel/opcionais", icone: ListPlus, celular: true },
  { titulo: "Cupons", href: "/painel/cupons", icone: BadgePercent },
  { titulo: "Horários", href: "/painel/horarios", icone: Clock },
  { titulo: "Configurar site", href: "/painel/configurar-site", icone: Settings, celular: true },
];

/**
 * Nome do produto e descrição PADRÃO. Aparecem enquanto o dono não preencher
 * "Nome exibido" e "Subtítulo" no painel ▸ Personalização (e quando o banco está fora).
 * O nome do negócio (Configurações) vale por cima deste padrão.
 */
export const NOME_APP = "Costela Santo Antônio";
export const DESCRICAO_APP = "Costela assada aos domingos · Santo Antônio, Campos Novos - SC";

/** Item ativo: "/" e itens `exato` só no endereço exato; demais por prefixo. */
export function itemAtivo(caminho: string, href: string) {
  const item = NAVEGACAO.find((i) => i.href === href);
  if (href === "/" || item?.exato) return caminho === href;

  // As telas de aparência e dados do negócio são atalhos dentro de Configurar site.
  if (
    href === "/painel/configurar-site" &&
    ["/painel/personalizacao", "/painel/configuracoes"].some(
      (rota) => caminho === rota || caminho.startsWith(rota + "/"),
    )
  ) {
    return true;
  }

  return caminho === href || caminho.startsWith(href + "/");
}
