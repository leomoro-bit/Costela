/**
 * Moldura das telas públicas de autenticação (login, redefinir senha).
 * Mostra a logo, o nome e o subtítulo da marca (tela Personalização) — lidos pela
 * função pública marca_publica(), então funciona sem login.
 */
import { LogoNegocio } from "@/components/logo-negocio";
import { TemaToggle } from "@/components/ui/tema-toggle";
import { SUBTITULO_PADRAO_LOGIN } from "@/lib/marca";
import { obterMarca } from "@/lib/marca-servidor";

export async function TelaAuth({ children }: { children: React.ReactNode }) {
  const marca = await obterMarca();
  return (
    <main className="relative flex min-h-dvh items-center justify-center bg-fundo px-4 py-10">
      <TemaToggle className="absolute top-3 right-3" />
      <div className="w-full min-w-0 max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoNegocio nome={marca.nome} logoUrl={marca.logoUrl} tamanho="lg" className="mb-3 shadow-sm" />
          <p className="font-titulo text-xl font-bold text-texto">{marca.nome}</p>
          <p className="text-sm text-texto-2">{marca.subtitulo ?? SUBTITULO_PADRAO_LOGIN}</p>
        </div>
        <div className="rounded-2xl border border-borda bg-superficie p-6 shadow-sm">{children}</div>
      </div>
    </main>
  );
}
