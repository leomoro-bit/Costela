"use client";

/**
 * Avisos rápidos (toasts).
 *
 *   const toast = useToast();
 *   toast.sucesso("Cliente salvo!");
 *   toast.erro("Não foi possível salvar.");
 *   toast.info("Link copiado.");
 */
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Tipo = "sucesso" | "erro" | "info";
type Aviso = { id: number; tipo: Tipo; texto: string };

type ApiToast = {
  sucesso: (texto: string) => void;
  erro: (texto: string) => void;
  info: (texto: string) => void;
};

const Contexto = createContext<ApiToast | null>(null);

export function useToast() {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useToast precisa estar dentro de <ProvedorToast>");
  return ctx;
}

const icones = { sucesso: CheckCircle2, erro: XCircle, info: Info };
const cores: Record<Tipo, string> = {
  sucesso: "text-ok",
  erro: "text-perigo",
  info: "text-info",
};

export function ProvedorToast({ children }: { children: React.ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const proximoId = useRef(1);

  const fechar = useCallback((id: number) => setAvisos((lista) => lista.filter((a) => a.id !== id)), []);

  const mostrar = useCallback(
    (tipo: Tipo, texto: string) => {
      const id = proximoId.current++;
      setAvisos((lista) => [...lista.slice(-3), { id, tipo, texto }]);
      window.setTimeout(() => fechar(id), tipo === "erro" ? 6000 : 3500);
    },
    [fechar],
  );

  const api = useMemo<ApiToast>(
    () => ({
      sucesso: (t) => mostrar("sucesso", t),
      erro: (t) => mostrar("erro", t),
      info: (t) => mostrar("info", t),
    }),
    [mostrar],
  );

  return (
    <Contexto.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6 md:right-6 md:left-auto md:items-end nao-imprimir"
      >
        {avisos.map((a) => {
          const Icone = icones[a.tipo];
          return (
            <div
              key={a.id}
              role={a.tipo === "erro" ? "alert" : "status"}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-borda bg-superficie p-3 pr-2 text-sm text-texto shadow-lg"
            >
              <Icone className={cn("mt-0.5 size-5 shrink-0", cores[a.tipo])} aria-hidden />
              <p className="flex-1 pt-0.5">{a.texto}</p>
              <button
                type="button"
                onClick={() => fechar(a.id)}
                className="grid size-8 place-items-center rounded-lg text-texto-2 hover:bg-superficie-2"
                aria-label="Fechar aviso"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </Contexto.Provider>
  );
}
