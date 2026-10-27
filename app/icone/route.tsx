/**
 * Ícone da aba (favicon) quando o negócio AINDA NÃO enviou uma logo:
 * desenha as iniciais do nome sobre a cor da marca. Com logo, o layout raiz
 * usa a própria logo como ícone. Rota pública (lib/rotas.ts).
 */
import { ImageResponse } from "next/og";
import { iniciais } from "@/lib/formatar";
import { corTextoSobre } from "@/lib/marca";
import { obterMarca } from "@/lib/marca-servidor";

export async function GET() {
  const marca = await obterMarca();
  if (marca.logoUrl) return Response.redirect(marca.logoUrl, 307);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: marca.corPrimaria,
          color: corTextoSobre(marca.corPrimaria),
          borderRadius: 14,
          fontSize: 28,
          fontWeight: 700,
        }}
      >
        {iniciais(marca.nome)}
      </div>
    ),
    { width: 64, height: 64, headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
