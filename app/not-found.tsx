import Link from "next/link";
import { classesBotao } from "@/components/ui/botao";

export default function NaoEncontrado() {
  return (
    <main className="grid min-h-dvh place-items-center bg-fundo px-4 text-center">
      <div>
        <p className="text-5xl font-bold text-marca-forte">404</p>
        <h1 className="mt-2 text-xl font-semibold text-texto">Página não encontrada</h1>
        <p className="mt-1 text-sm text-texto-2">O endereço pode estar errado ou a página foi removida.</p>
        <Link href="/" className={classesBotao("primario", "mt-6")}>
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
