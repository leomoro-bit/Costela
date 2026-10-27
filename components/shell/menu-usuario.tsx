"use client";

/** Botão com as iniciais do usuário → mostra o e-mail e o botão "Sair". */
import { LogOut, Palette, Settings } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { sair } from "@/lib/auth/acoes";
import { iniciais } from "@/lib/formatar";

export function MenuUsuario({ email }: { email: string }) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fecharFora = (e: MouseEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false);
    };
    const fecharEsc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fecharFora);
    document.addEventListener("keydown", fecharEsc);
    return () => {
      document.removeEventListener("mousedown", fecharFora);
      document.removeEventListener("keydown", fecharEsc);
    };
  }, [aberto]);

  return (
    <div ref={caixa} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-haspopup="menu"
        aria-label="Menu da conta"
        className="grid size-11 place-items-center rounded-xl hover:bg-superficie-2"
      >
        <span className="grid size-8 place-items-center rounded-full bg-marca-suave text-xs font-bold text-marca-forte">
          {iniciais(email.split("@")[0].replace(/[._-]+/g, " "))}
        </span>
      </button>
      {aberto && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-64 rounded-xl border border-borda bg-superficie p-2 shadow-lg">
          <p className="truncate px-3 py-2 text-xs text-texto-2" title={email}>
            {email}
          </p>
          <Link
            role="menuitem"
            href="/painel/configuracoes"
            onClick={() => setAberto(false)}
            className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm hover:bg-superficie-2"
          >
            <Settings className="size-4" aria-hidden /> Configurações
          </Link>
          <Link
            role="menuitem"
            href="/painel/personalizacao"
            onClick={() => setAberto(false)}
            className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm hover:bg-superficie-2"
          >
            <Palette className="size-4" aria-hidden /> Personalização
          </Link>
          <form action={sair}>
            <button
              role="menuitem"
              type="submit"
              className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-sm text-perigo hover:bg-superficie-2"
            >
              <LogOut className="size-4" aria-hidden /> Sair
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
