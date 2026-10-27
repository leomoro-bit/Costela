/** Centraliza os atalhos para editar aparência, textos, fotos, WhatsApp e preços do cardápio. */
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Clock, ImagePlus, Palette, Settings, UtensilsCrossed } from "lucide-react";
import { CabecalhoPagina } from "@/components/ui/cartao";

export const metadata: Metadata = { title: "Configurar site" };

const atalhos = [
  {
    href: "/painel/personalizacao",
    titulo: "Cores, escrita e logotipo",
    descricao: "Altere o nome exibido, frase de apresentação, cores, fonte, arredondamento e logotipo do site.",
    detalhe: "Aparência e textos",
    Icone: Palette,
  },
  {
    href: "/painel/configuracoes",
    titulo: "WhatsApp e informações",
    descricao: "Troque o WhatsApp que recebe os pedidos, envie ou troque a foto de capa, edite o endereço de retirada, cidade e formas de pagamento.",
    detalhe: "Dados do negócio",
    Icone: Settings,
  },
  {
    href: "/painel/cardapio",
    titulo: "Fotos, nomes e preços dos itens",
    descricao: "Cadastre ou edite produtos, troque fotos, descrição e preço, organize categorias e marque itens como disponíveis ou esgotados.",
    detalhe: "Cardápio de produtos",
    Icone: ImagePlus,
  },
  {
    href: "/painel/horarios",
    titulo: "Horários de funcionamento",
    descricao: "Defina os dias e horários em que o cardápio aceita pedidos.",
    detalhe: "Funcionamento",
    Icone: Clock,
  },
] as const;

export default function PaginaConfigurarSite() {
  return (
    <>
      <CabecalhoPagina
        titulo="Configurar site"
        descricao="Edite o visual, as informações e os produtos do seu cardápio sem mexer no código."
      />
      <div className="mb-5 rounded-2xl border border-marca/30 bg-marca-suave p-4 text-sm text-texto">
        <strong className="block text-base">As alterações ficam salvas no Supabase</strong>
        <p className="mt-1 text-texto-2">
          Depois de salvar, confira o cardápio público pelo botão “Ver cardápio”. As fotos dos produtos podem ser enviadas pelo próprio painel do cardápio.
        </p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {atalhos.map(({ href, titulo, descricao, detalhe, Icone }) => (
          <Link
            key={href}
            href={href}
            className="group flex min-h-36 items-start gap-4 rounded-2xl border border-borda bg-superficie p-4 shadow-sm transition-colors hover:border-marca/60 hover:bg-superficie-2 sm:p-5"
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-marca-suave text-marca-forte">
              <Icone className="size-6" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold uppercase tracking-wide text-marca-forte">{detalhe}</span>
              <span className="mt-1 block text-base font-bold text-texto">{titulo}</span>
              <span className="mt-1.5 block text-sm leading-6 text-texto-2">{descricao}</span>
            </span>
            <ArrowUpRight className="mt-1 size-5 shrink-0 text-texto-2 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
          </Link>
        ))}
      </div>
      <p className="mt-5 flex items-start gap-2 text-sm text-texto-2">
        <UtensilsCrossed className="mt-0.5 size-4 shrink-0" aria-hidden />
        Este estabelecimento aceita somente retirada no local; a opção de entrega foi desativada no checkout.
      </p>
    </>
  );
}
