/**
 * LOGO DO NEGÓCIO — use em qualquer lugar (menu, login, documentos impressos, recibos).
 *
 *   // Server Component:
 *   const marca = await obterMarca();            // de "@/lib/marca-servidor"
 *   <LogoNegocio nome={marca.nome} logoUrl={marca.logoUrl} tamanho="lg" />
 *
 * Sem logo enviada, mostra o brasão em SVG da Costela Santo Antônio; para outras marcas, mostra as iniciais sobre a cor da marca.
 * Funciona em Server e Client Components (não usa hooks).
 */
import { iniciais } from "@/lib/formatar";
import { cn } from "@/lib/utils";

const TAMANHOS = {
  sm: "size-8 text-xs",
  md: "size-9 text-sm",
  lg: "size-14 text-lg",
  xl: "size-20 text-2xl",
} as const;

export type TamanhoLogo = keyof typeof TAMANHOS;

export function LogoNegocio({
  nome,
  logoUrl,
  tamanho = "md",
  decorativa = true,
  className,
}: {
  nome: string;
  logoUrl?: string | null;
  tamanho?: TamanhoLogo;
  /** true (padrão) quando o nome já aparece escrito ao lado — leitores de tela ignoram a imagem. */
  decorativa?: boolean;
  className?: string;
}) {
  const classes = cn(TAMANHOS[tamanho], "shrink-0 rounded-xl", className);
  const marcaCostela = /costela/i.test(nome) && /ant[oô]nio/i.test(nome);
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- logo vem do Supabase Storage (qualquer domínio)
      <img
        src={logoUrl}
        alt={decorativa ? "" : `Logo de ${nome}`}
        className={cn(classes, "object-contain")}
        data-logo-negocio=""
      />
    );
  }
  if (marcaCostela) {
    return (
      <svg
        viewBox="0 0 100 112"
        role={decorativa ? undefined : "img"}
        aria-label={decorativa ? undefined : `Logo de ${nome}`}
        aria-hidden={decorativa || undefined}
        className={cn(TAMANHOS[tamanho], "shrink-0 drop-shadow-[0_2px_8px_rgba(213,162,58,0.15)]", className)}
        data-logo-negocio=""
      >
        <path d="M50 3 89 25 89 76 50 108 11 76 11 25Z" fill="#090909" stroke="#D5A23A" strokeWidth="2.6" />
        <path d="M50 13c-2 8-10 10-8 19 1 4 4 6 8 6 7 0 11-7 8-13-1 5-4 6-5 7 1-8-5-12-3-19Z" fill="#D5A23A" />
        <path d="M50 22c-2 4-4 6-3 9 1 2 2 3 4 3 3 0 5-3 3-6 0 2-2 3-2 3 0-4-3-6-2-9Z" fill="#FFF0C5" />
        <path d="M19 42h62" stroke="#8C6725" strokeWidth="1" />
        <text x="50" y="53" textAnchor="middle" fill="#F6E8C3" fontFamily="Georgia,serif" fontSize="10" fontWeight="700" letterSpacing=".4">COSTELA</text>
        <text x="50" y="62" textAnchor="middle" fill="#D5A23A" fontFamily="Georgia,serif" fontSize="6.2" fontWeight="700" letterSpacing=".2">SANTO ANTÔNIO</text>
        <path d="M25 67h50" stroke="#8C6725" strokeWidth=".8" />
        <text x="50" y="74" textAnchor="middle" fill="#D7C8A3" fontFamily="Arial,sans-serif" fontSize="3.8" letterSpacing=".4">CAMPOS NOVOS - SC</text>
        <path d="M25 82 50 96 75 82" fill="none" stroke="#8C6725" strokeWidth="1" />
      </svg>
    );
  }
  return (
    <span
      role={decorativa ? undefined : "img"}
      aria-label={decorativa ? undefined : `Logo de ${nome}`}
      aria-hidden={decorativa || undefined}
      className={cn(
        classes,
        "grid place-items-center bg-marca font-bold text-marca-texto [print-color-adjust:exact]",
      )}
      data-logo-negocio=""
    >
      {iniciais(nome)}
    </span>
  );
}
