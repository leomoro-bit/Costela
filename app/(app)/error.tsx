"use client";

/** Mostrado se uma página logada der erro inesperado (em vez da tela branca). */
import { AlertTriangle } from "lucide-react";
import { Botao } from "@/components/ui/botao";

export default function ErroPagina({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-borda bg-superficie px-6 py-12 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-perigo-suave text-perigo">
        <AlertTriangle className="size-7" aria-hidden />
      </div>
      <h1 className="text-lg font-semibold text-texto">Algo deu errado</h1>
      <p className="mt-1 max-w-sm text-sm text-texto-2">
        Verifique sua conexão com a internet e tente de novo. Se continuar, confira se o schema.sql foi executado no
        Supabase.
      </p>
      <Botao className="mt-5" onClick={() => reset()}>
        Tentar de novo
      </Botao>
    </div>
  );
}
