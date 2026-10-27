import { cn } from "@/lib/utils";

/** Caixa branca com borda e cantos arredondados — bloco básico das telas. */
export function Cartao({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-borda bg-superficie p-4 shadow-sm sm:p-5", className)} {...props} />;
}

/** Título + descrição + ações no topo de cada página. */
export function CabecalhoPagina({
  titulo,
  descricao,
  acoes,
}: {
  titulo: string;
  descricao?: string;
  acoes?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-texto sm:text-3xl">{titulo}</h1>
        {descricao && <p className="mt-1 text-sm text-texto-2">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2 nao-imprimir">{acoes}</div>}
    </div>
  );
}

type CorSelo = "neutro" | "marca" | "ok" | "alerta" | "perigo" | "info";
const coresSelo: Record<CorSelo, string> = {
  neutro: "bg-superficie-2 text-texto-2",
  marca: "bg-marca-suave text-marca-forte",
  ok: "bg-ok-suave text-ok",
  alerta: "bg-alerta-suave text-alerta",
  perigo: "bg-perigo-suave text-perigo",
  info: "bg-info-suave text-info",
};

/** Etiqueta de status: <Selo cor="ok">Pago</Selo> */
export function Selo({ cor = "neutro", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { cor?: CorSelo }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", coresSelo[cor], className)}
      {...props}
    />
  );
}
