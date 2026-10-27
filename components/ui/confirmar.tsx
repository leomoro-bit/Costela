"use client";

/**
 * Janela de confirmação (ex.: antes de excluir). Usa o <dialog> nativo:
 * foco preso dentro da janela, Esc cancela, acessível por teclado.
 *
 *   const confirmar = useConfirmar();
 *   if (await confirmar({ titulo: "Excluir cliente?", mensagem: "Não dá para desfazer.", perigo: true })) {
 *     await excluirCliente(id);
 *   }
 */
import { AlertTriangle } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Botao } from "./botao";

type Opcoes = {
  titulo: string;
  mensagem?: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  /** Botão vermelho (ações destrutivas). */
  perigo?: boolean;
};

type FuncaoConfirmar = (opcoes: Opcoes) => Promise<boolean>;

const Contexto = createContext<FuncaoConfirmar | null>(null);

export function useConfirmar() {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useConfirmar precisa estar dentro de <ProvedorConfirmacao>");
  return ctx;
}

export function ProvedorConfirmacao({ children }: { children: React.ReactNode }) {
  const [opcoes, setOpcoes] = useState<Opcoes | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const dialogo = useRef<HTMLDialogElement>(null);

  const confirmar = useCallback<FuncaoConfirmar>((novas) => {
    setOpcoes(novas);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (opcoes && !d.open) d.showModal();
    if (!opcoes && d.open) d.close();
  }, [opcoes]);

  const responder = (valor: boolean) => {
    resolver.current?.(valor);
    resolver.current = null;
    setOpcoes(null);
  };

  return (
    <Contexto.Provider value={confirmar}>
      {children}
      <dialog
        ref={dialogo}
        onCancel={(e) => {
          e.preventDefault();
          responder(false);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) responder(false); // clique fora
        }}
        aria-labelledby="confirmar-titulo"
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-borda bg-superficie p-0 text-texto shadow-xl backdrop:bg-black/50"
      >
        {opcoes && (
          <div className="p-5">
            <div className="flex items-start gap-3">
              {opcoes.perigo && (
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-perigo-suave text-perigo">
                  <AlertTriangle className="size-5" aria-hidden />
                </div>
              )}
              <div>
                <h2 id="confirmar-titulo" className="text-lg font-semibold">
                  {opcoes.titulo}
                </h2>
                {opcoes.mensagem && <p className="mt-1 text-sm text-texto-2">{opcoes.mensagem}</p>}
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Botao variante="secundario" onClick={() => responder(false)} autoFocus>
                {opcoes.textoCancelar ?? "Cancelar"}
              </Botao>
              <Botao variante={opcoes.perigo ? "perigo" : "primario"} onClick={() => responder(true)}>
                {opcoes.textoConfirmar ?? (opcoes.perigo ? "Excluir" : "Confirmar")}
              </Botao>
            </div>
          </div>
        )}
      </dialog>
    </Contexto.Provider>
  );
}
