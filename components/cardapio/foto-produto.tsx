"use client";

/**
 * Foto do produto. Se a imagem não carregar (link quebrado) ou não existir,
 * mostra uma ilustração neutra de prato/talheres no lugar.
 * Usa <img> comum de propósito: as fotos podem vir de qualquer site (URL colada no painel).
 */
import { UtensilsCrossed } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function FotoProduto({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
  const [falhou, setFalhou] = useState(false);
  if (!src || falhou) {
    return (
      <div role="img" aria-label="Sem foto" className={cn("grid place-items-center bg-superficie-2 text-borda", className)}>
        <UtensilsCrossed className="size-1/3 min-h-8 min-w-8 text-texto-2/40" aria-hidden />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading="lazy" onError={() => setFalhou(true)} className={cn("object-cover", className)} />
  );
}
