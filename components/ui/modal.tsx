"use client";

/**
 * Janela modal genérica (formulários de cadastro/edição do painel).
 * Usa o <dialog> nativo: foco preso, Esc fecha, clique fora fecha.
 *
 *   const [aberto, setAberto] = useState(false);
 *   <Modal aberto={aberto} aoFechar={() => setAberto(false)} titulo="Novo produto">...</Modal>
 */
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function Modal({
  aberto,
  aoFechar,
  titulo,
  descricao,
  children,
  className,
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-titulo"
      onCancel={(e) => {
        e.preventDefault();
        aoFechar();
      }}
      onClick={(e) => e.target === e.currentTarget && aoFechar()}
      className={cn(
        "mx-auto mt-auto mb-0 max-h-[94dvh] w-full max-w-lg rounded-t-2xl border border-borda bg-superficie p-0 text-texto shadow-xl backdrop:bg-black/50 sm:my-auto sm:w-[calc(100%-2rem)] sm:rounded-2xl",
        className,
      )}
    >
      {aberto && (
        <div className="pb-seguro p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 id="modal-titulo" className="text-lg font-semibold">
                {titulo}
              </h2>
              {descricao && <p className="mt-1 text-sm text-texto-2">{descricao}</p>}
            </div>
            <button
              type="button"
              onClick={aoFechar}
              aria-label="Fechar"
              className="-mt-1 -mr-2 grid size-11 shrink-0 place-items-center rounded-xl text-texto-2 hover:bg-superficie-2"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

/** Caixa de marcar com rótulo (alvo de 44px). No FormData chega "on" quando marcada. */
export function Marcador({
  nome,
  rotulo,
  ajuda,
  defaultChecked,
  className,
}: {
  nome: string;
  rotulo: string;
  ajuda?: string;
  defaultChecked?: boolean;
  className?: string;
}) {
  return (
    <label className={cn("flex min-h-11 cursor-pointer items-start gap-3 py-2", className)}>
      <input type="checkbox" name={nome} defaultChecked={defaultChecked} className="mt-0.5 size-5 shrink-0 accent-[var(--marca)]" />
      <span className="text-sm">
        <span className="font-medium text-texto">{rotulo}</span>
        {ajuda && <span className="block text-xs text-texto-2">{ajuda}</span>}
      </span>
    </label>
  );
}
