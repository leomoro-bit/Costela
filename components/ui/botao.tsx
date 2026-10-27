/** Botões. Sem "use client": classesBotao() pode ser usado em Server Components (ex.: em <Link>). */
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type VarianteBotao = "primario" | "secundario" | "fantasma" | "perigo";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors " +
  "disabled:cursor-not-allowed disabled:opacity-60 select-none whitespace-nowrap";

const variantes: Record<VarianteBotao, string> = {
  primario: "bg-marca text-marca-texto hover:bg-marca/90 shadow-sm",
  secundario: "border border-borda bg-superficie text-texto hover:bg-superficie-2",
  fantasma: "text-texto-2 hover:bg-superficie-2 hover:text-texto",
  perigo: "bg-perigo text-white hover:opacity-90 dark:text-black",
};

/** Classes de botão para usar em <Link> ou <a>: <Link className={classesBotao("secundario")} /> */
export function classesBotao(variante: VarianteBotao = "primario", extra?: string) {
  return cn(base, variantes[variante], extra);
}

type PropsBotao = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: VarianteBotao;
  carregando?: boolean;
};

export function Botao({ variante = "primario", carregando, className, children, disabled, type = "button", ...props }: PropsBotao) {
  return (
    <button
      type={type}
      className={classesBotao(variante, className)}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      {...props}
    >
      {carregando && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
