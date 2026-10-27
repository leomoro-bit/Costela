"use client";

/**
 * PRÉVIA AO VIVO da marca (antes de salvar). As cores/fonte/raio valem só DENTRO
 * da caixa da prévia: o CSS é gerado por cssMarca() com o seletor .previa-marca
 * e a caixa recebe data-fonte, data-raio e a classe do tema (tema-claro ou dark).
 */
import { BadgePercent, ReceiptText, UtensilsCrossed } from "lucide-react";
import { useMemo } from "react";
import { LogoNegocio } from "@/components/logo-negocio";
import { cssMarca, type Fonte, type Raio, SUBTITULO_PADRAO_LOGIN, SUBTITULO_PADRAO_MENU } from "@/lib/marca";
import { cn } from "@/lib/utils";

export type TelaPrevia = "app" | "login";

type Props = {
  nome: string;
  subtitulo: string;
  logoUrl: string | null;
  corPrimaria: string;
  corDestaque: string;
  fonte: Fonte;
  raio: Raio;
  escuro: boolean;
  aoMudarEscuro: (escuro: boolean) => void;
  tela: TelaPrevia;
  aoMudarTela: (tela: TelaPrevia) => void;
};

function Alternador<T extends string>({
  rotulo,
  valor,
  opcoes,
  aoMudar,
}: {
  rotulo: string;
  valor: T;
  opcoes: { id: T; nome: string }[];
  aoMudar: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={rotulo} className="flex rounded-xl bg-superficie-2 p-1">
      {opcoes.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={valor === o.id}
          onClick={() => aoMudar(o.id)}
          className={cn(
            "min-h-9 rounded-lg px-3 text-xs font-semibold transition-colors",
            valor === o.id ? "bg-superficie text-texto shadow-sm" : "text-texto-2 hover:text-texto",
          )}
        >
          {o.nome}
        </button>
      ))}
    </div>
  );
}

export function PreviaMarca(p: Props) {
  const css = useMemo(
    () =>
      cssMarca(
        { corPrimaria: p.corPrimaria, corDestaque: p.corDestaque },
        { claro: ".previa-marca.tema-claro", escuro: ".previa-marca.dark" },
      ),
    [p.corPrimaria, p.corDestaque],
  );

  return (
    <section aria-label="Prévia ao vivo" className="overflow-hidden rounded-2xl border border-borda bg-superficie shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-borda px-4 py-3">
        <p className="text-sm font-semibold text-texto">Prévia ao vivo</p>
        <div className="flex flex-wrap gap-2">
          <Alternador
            rotulo="Tela da prévia"
            valor={p.tela}
            aoMudar={p.aoMudarTela}
            opcoes={[
              { id: "app", nome: "App" },
              { id: "login", nome: "Login" },
            ]}
          />
          <Alternador
            rotulo="Tema da prévia"
            valor={p.escuro ? "escuro" : "claro"}
            aoMudar={(v) => p.aoMudarEscuro(v === "escuro")}
            opcoes={[
              { id: "claro", nome: "Claro" },
              { id: "escuro", nome: "Escuro" },
            ]}
          />
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div
        className={cn("previa-marca bg-fundo p-4 font-sans text-texto", p.escuro ? "dark" : "tema-claro")}
        data-fonte={p.fonte}
        data-raio={p.raio}
        data-testid="previa-marca"
        aria-label={`Prévia da ${p.tela === "app" ? "tela do app" : "tela de login"}`}
        role="img"
      >
        {p.tela === "app" ? <PreviaApp {...p} /> : <PreviaLogin {...p} />}
      </div>
    </section>
  );
}

function PreviaApp({ nome, subtitulo, logoUrl }: Props) {
  const itens = [
    { nome: "Pedidos", icone: ReceiptText, ativo: true },
    { nome: "Cardápio", icone: UtensilsCrossed, ativo: false },
    { nome: "Cupons", icone: BadgePercent, ativo: false },
  ];
  return (
    <div className="overflow-hidden rounded-2xl border border-borda bg-superficie shadow-sm">
      <div className="flex items-center gap-3 border-b border-borda px-3 py-2.5">
        <LogoNegocio nome={nome} logoUrl={logoUrl} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{nome}</p>
          <p className="truncate text-xs text-texto-2">{subtitulo || SUBTITULO_PADRAO_MENU}</p>
        </div>
      </div>
      <div className="flex">
        <div className="hidden w-32 shrink-0 space-y-1 border-r border-borda p-2 sm:block">
          {itens.map(({ nome: n, icone: Icone, ativo }) => (
            <div
              key={n}
              className={cn(
                "flex min-h-9 items-center gap-2 rounded-xl px-2 text-xs font-medium",
                ativo ? "bg-marca-suave text-marca-forte" : "text-texto-2",
              )}
            >
              <Icone className="size-4 shrink-0" aria-hidden /> {n}
            </div>
          ))}
        </div>
        <div className="min-w-0 flex-1 space-y-3 p-3">
          <h3 className="text-lg leading-tight font-bold">Olá, {nome}!</h3>
          <p className="text-sm text-texto-2">Assim ficam os títulos, textos e botões do seu app.</p>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex min-h-9 items-center rounded-xl bg-marca px-3 text-xs font-semibold text-marca-texto shadow-sm">
              Começar preparo
            </span>
            <span className="inline-flex min-h-9 items-center rounded-xl border border-borda bg-superficie px-3 text-xs font-semibold">
              Ver cardápio
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-destaque-suave p-2.5">
            <span className="shrink-0 rounded-full bg-destaque px-2 py-0.5 text-[11px] font-bold text-destaque-texto">
              Hoje
            </span>
            <p className="min-w-0 truncate text-xs font-semibold text-destaque-forte">3 pedidos novos esperando</p>
          </div>
          <p className="text-xs text-texto-2">
            Link de exemplo: <span className="font-semibold text-marca-forte underline">ver pedidos de hoje</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function PreviaLogin({ nome, subtitulo, logoUrl }: Props) {
  return (
    <div className="mx-auto max-w-xs py-2">
      <div className="mb-4 flex flex-col items-center text-center">
        <LogoNegocio nome={nome} logoUrl={logoUrl} tamanho="lg" className="mb-2 shadow-sm" />
        <p className="font-titulo text-lg font-bold">{nome}</p>
        <p className="text-xs text-texto-2">{subtitulo || SUBTITULO_PADRAO_LOGIN}</p>
      </div>
      <div className="space-y-3 rounded-2xl border border-borda bg-superficie p-4 shadow-sm">
        <p className="font-titulo text-base font-semibold">Entrar</p>
        <div className="space-y-1">
          <p className="text-xs font-medium">E-mail</p>
          <div className="h-9 rounded-xl border border-borda bg-superficie" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium">Senha</p>
          <div className="h-9 rounded-xl border border-borda bg-superficie" />
        </div>
        <div className="grid h-9 place-items-center rounded-xl bg-marca text-xs font-semibold text-marca-texto">Entrar</div>
        <p className="text-xs font-medium text-marca-forte">Esqueci minha senha</p>
      </div>
    </div>
  );
}
