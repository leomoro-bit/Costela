import type { Metadata } from "next";
import { TelaAuth } from "@/components/tela-auth";
import { destinoSeguro } from "@/lib/rotas";
import { FormLogin } from "./form-login";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaLogin({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams; // no Next 16, searchParams é uma Promise
  return (
    <TelaAuth>
      <FormLogin next={destinoSeguro(next)} />
    </TelaAuth>
  );
}
