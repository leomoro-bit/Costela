import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

/**
 * Mensagem para listas vazias, com ícone e ação opcional.
 * <EstadoVazio titulo="Nenhum cliente ainda" descricao="..." acao={<Botao>Novo cliente</Botao>} />
 */
export function EstadoVazio({
  titulo,
  descricao,
  icone: Icone = Inbox,
  acao,
}: {
  titulo: string;
  descricao?: string;
  icone?: LucideIcon;
  acao?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-borda bg-superficie px-6 py-12 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-marca-suave text-marca-forte">
        <Icone className="size-7" aria-hidden />
      </div>
      <h2 className="text-base font-semibold text-texto">{titulo}</h2>
      {descricao && <p className="mt-1 max-w-sm text-sm text-texto-2">{descricao}</p>}
      {acao && <div className="mt-5">{acao}</div>}
    </div>
  );
}
