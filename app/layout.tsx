import type { Metadata, Viewport } from "next";
import "./globals.css";
import { classesFontes } from "./fontes";
import { ConfigurarAmbiente } from "@/components/configurar-ambiente";
import { ProvedorConfirmacao } from "@/components/ui/confirmar";
import { ProvedorToast } from "@/components/ui/toast";
import { cssMarca, scriptTema, SUBTITULO_PADRAO_LOGIN } from "@/lib/marca";
import { obterMarca } from "@/lib/marca-servidor";
import { supabaseConfigurado } from "@/lib/supabase/env";

/**
 * LAYOUT RAIZ — vale para TODAS as páginas (logadas e públicas).
 * Aplica a marca escolhida na tela Personalização: cores (CSS), fonte (data-fonte),
 * arredondamento (data-raio), tema padrão, nome no título da aba e favicon (logo ou iniciais).
 * obterMarca() é cacheado por requisição e tem fallback seguro (lib/marca-servidor.ts).
 */
export async function generateMetadata(): Promise<Metadata> {
  const marca = await obterMarca();
  // Sem logo: /icone desenha as iniciais na cor da marca (o ?v= muda quando a marca muda).
  const icone = marca.logoUrl ?? `/icone?v=${encodeURIComponent(`${marca.corPrimaria}-${marca.nome}`)}`;
  return {
    title: { default: marca.nome, template: `%s · ${marca.nome}` },
    description: marca.subtitulo ?? SUBTITULO_PADRAO_LOGIN,
    icons: { icon: [{ url: icone }], apple: [{ url: icone }] },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf6ee" },
    { media: "(prefers-color-scheme: dark)", color: "#080808" },
  ],
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const marca = await obterMarca();
  return (
    <html
      lang="pt-BR"
      className={`${classesFontes} h-full antialiased`}
      data-fonte={marca.fonte}
      data-raio={marca.raio}
      suppressHydrationWarning
    >
      <head>
        {/* Aplica o tema (escolha do usuário > tema padrão da marca) ANTES da página aparecer. */}
        <script dangerouslySetInnerHTML={{ __html: scriptTema(marca.temaPadrao) }} />
        {/* Cores da marca (validadas como #RRGGBB em lib/marca.ts). */}
        <style id="marca-css" dangerouslySetInnerHTML={{ __html: cssMarca(marca) }} />
      </head>
      <body className="min-h-full">
        {supabaseConfigurado ? (
          <ProvedorToast>
            <ProvedorConfirmacao>{children}</ProvedorConfirmacao>
          </ProvedorToast>
        ) : (
          <ConfigurarAmbiente />
        )}
      </body>
    </html>
  );
}
