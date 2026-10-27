"use client";

/** Menu lateral (computador, a partir de 768px). Itens vêm de lib/navegacao.ts. */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { sair } from "@/lib/auth/acoes";
import { LogoNegocio } from "@/components/logo-negocio";
import { NAVEGACAO, itemAtivo } from "@/lib/navegacao";
import { cn } from "@/lib/utils";

/** Nome, subtítulo e logo da marca (lidos no layout de app/(app)/). */
export type DadosMarcaShell = { nome: string; subtitulo: string; logoUrl: string | null };

export function Sidebar({ marca }: { marca: DadosMarcaShell }) {
  const caminho = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-borda bg-superficie md:flex nao-imprimir">
      <div className="flex h-16 items-center gap-3 border-b border-borda px-5">
        <LogoNegocio nome={marca.nome} logoUrl={marca.logoUrl} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-texto" title={marca.nome}>
            {marca.nome}
          </p>
          <p className="truncate text-xs text-texto-2">{marca.subtitulo}</p>
        </div>
      </div>
      <nav aria-label="Menu principal" className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAVEGACAO.map((item) => {
          const ativo = itemAtivo(caminho, item.href);
          const Icone = item.icone;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={ativo ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                ativo ? "bg-marca-suave text-marca-forte" : "text-texto-2 hover:bg-superficie-2 hover:text-texto",
              )}
            >
              <Icone className="size-5 shrink-0" aria-hidden />
              {item.titulo}
            </Link>
          );
        })}
      </nav>
      <form action={sair} className="border-t border-borda p-3">
        <button
          type="submit"
          className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-texto-2 hover:bg-superficie-2 hover:text-texto"
        >
          <LogOut className="size-5" aria-hidden /> Sair
        </button>
      </form>
    </aside>
  );
}
