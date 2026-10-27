"use client";

/**
 * Botão claro/escuro. A escolha fica salva no navegador (localStorage "tema").
 * O script em app/layout.tsx aplica o tema antes da página aparecer.
 */
import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

function assinar(callback: () => void) {
  const obs = new MutationObserver(callback);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => obs.disconnect();
}
const lerEscuro = () => document.documentElement.classList.contains("dark");
const lerEscuroServidor = () => false;

export function TemaToggle({ className }: { className?: string }) {
  const escuro = useSyncExternalStore(assinar, lerEscuro, lerEscuroServidor);

  function alternar() {
    const novo = !escuro;
    document.documentElement.classList.toggle("dark", novo);
    try {
      localStorage.setItem("tema", novo ? "escuro" : "claro");
    } catch {
      /* navegador sem localStorage: só não salva a preferência */
    }
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={escuro ? "Ativar modo claro" : "Ativar modo escuro"}
      title={escuro ? "Modo claro" : "Modo escuro"}
      className={cn("grid size-11 place-items-center rounded-xl text-texto-2 hover:bg-superficie-2 hover:text-texto", className)}
    >
      {escuro ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
    </button>
  );
}
