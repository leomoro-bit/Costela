/**
 * Campos de formulário acessíveis (rótulo ligado ao input, erro anunciado ao leitor de tela).
 *
 * <Campo rotulo="Nome" nome="nome" erro={estado.erros?.nome}>
 *   {(props) => <Entrada {...props} defaultValue="..." required />}
 * </Campo>
 */
import { cn } from "@/lib/utils";

const estiloEntrada =
  "block w-full min-h-11 rounded-xl border border-borda bg-superficie px-3 py-2 text-base text-texto " +
  "placeholder:text-texto-2/70 focus:border-marca focus:outline-none focus:ring-2 focus:ring-foco/40 " +
  "disabled:opacity-60 aria-[invalid=true]:border-perigo";

type PropsFilho = { id: string; name: string; "aria-invalid"?: boolean; "aria-describedby"?: string };

export function Campo({
  rotulo,
  nome,
  erro,
  ajuda,
  className,
  children,
}: {
  rotulo: string;
  nome: string;
  erro?: string;
  ajuda?: string;
  className?: string;
  children: (props: PropsFilho) => React.ReactNode;
}) {
  const id = `campo-${nome}`;
  const idAjuda = ajuda ? `${id}-ajuda` : undefined;
  const idErro = erro ? `${id}-erro` : undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-medium text-texto">
        {rotulo}
      </label>
      {children({
        id,
        name: nome,
        "aria-invalid": erro ? true : undefined,
        "aria-describedby": [idAjuda, idErro].filter(Boolean).join(" ") || undefined,
      })}
      {ajuda && !erro && (
        <p id={idAjuda} className="text-xs text-texto-2">
          {ajuda}
        </p>
      )}
      {erro && (
        <p id={idErro} role="alert" className="text-sm text-perigo">
          {erro}
        </p>
      )}
    </div>
  );
}

export function Entrada({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(estiloEntrada, className)} {...props} />;
}

export function AreaTexto({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(estiloEntrada, "min-h-24", className)} {...props} />;
}

export function Selecao({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(estiloEntrada, "pr-8", className)} {...props} />;
}
