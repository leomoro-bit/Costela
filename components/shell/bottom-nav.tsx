"use client";

/**
 * Barra inferior (celular). Mostra até 4 itens com `celular: true` de lib/navegacao.ts;
 * se houver mais itens, aparece o botão "Mais" com a lista completa.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LogoNegocio } from "@/components/logo-negocio";
import type { DadosMarcaShell } from "@/components/shell/sidebar";
import { sair } from "@/lib/auth/acoes";
import { NAVEGACAO, itemAtivo } from "@/lib/navegacao";
import { cn } from "@/lib/utils";

const MAX_ITENS = 4;

export function BottomNav({ marca }: { marca: DadosMarcaShell }) {
  const caminho = usePathname();
  const [maisAberto, setMaisAberto] = useState(false);
  const dialogo = useRef<HTMLDialogElement>(null);

  const principais = NAVEGACAO.filter((i) => i.celular).slice(0, MAX_ITENS);
  const temMais = NAVEGACAO.length > principais.length;
  const maisAtivo = temMais && !principais.some((i) => itemAtivo(caminho, i.href));

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (maisAberto && !d.open) d.showModal();
    if (!maisAberto && d.open) d.close();
  }, [maisAberto]);

  const classeItem = (ativo: boolean) =>
    cn(
      "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
      ativo ? "text-marca-forte" : "text-texto-2",
    );

  return (
    <>
      <nav
        aria-label="Menu principal"
        className="pb-seguro fixed inset-x-0 bottom-0 z-30 border-t border-borda bg-superficie/95 backdrop-blur md:hidden nao-imprimir"
      >
        <div className="mx-auto flex max-w-lg">
          {principais.map((item) => {
            const ativo = itemAtivo(caminho, item.href);
            const Icone = item.icone;
            return (
              <Link key={item.href} href={item.href} aria-current={ativo ? "page" : undefined} className={classeItem(ativo)}>
                <Icone className="size-6" aria-hidden />
                <span className="max-w-full truncate px-1">{item.titulo}</span>
              </Link>
            );
          })}
          {temMais && (
            <button type="button" onClick={() => setMaisAberto(true)} className={classeItem(maisAtivo)} aria-haspopup="dialog">
              <Menu className="size-6" aria-hidden />
              <span>Mais</span>
            </button>
          )}
        </div>
      </nav>

      {temMais && (
        <dialog
          ref={dialogo}
          onClose={() => setMaisAberto(false)}
          onClick={(e) => e.target === e.currentTarget && setMaisAberto(false)}
          aria-label="Todas as páginas"
          className="mt-auto mb-0 w-full max-w-none rounded-t-2xl border border-borda bg-superficie p-0 text-texto backdrop:bg-black/50 md:hidden"
        >
          <div className="pb-seguro p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <LogoNegocio nome={marca.nome} logoUrl={marca.logoUrl} tamanho="sm" />
                <p className="truncate font-semibold">{marca.nome}</p>
              </div>
              <button
                type="button"
                onClick={() => setMaisAberto(false)}
                className="grid size-11 place-items-center rounded-xl text-texto-2 hover:bg-superficie-2"
                aria-label="Fechar menu"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <ul className="space-y-1">
              {NAVEGACAO.map((item) => {
                const ativo = itemAtivo(caminho, item.href);
                const Icone = item.icone;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMaisAberto(false)}
                      aria-current={ativo ? "page" : undefined}
                      className={cn(
                        "flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium",
                        ativo ? "bg-marca-suave text-marca-forte" : "hover:bg-superficie-2",
                      )}
                    >
                      <Icone className="size-5" aria-hidden /> {item.titulo}
                    </Link>
                  </li>
                );
              })}
              <li>
                <form action={sair}>
                  <button type="submit" className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-perigo hover:bg-superficie-2">
                    <LogOut className="size-5" aria-hidden /> Sair
                  </button>
                </form>
              </li>
            </ul>
          </div>
        </dialog>
      )}
    </>
  );
}
