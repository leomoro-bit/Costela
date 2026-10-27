/** A loja trabalha exclusivamente com retirada no local. Redireciona URLs antigas de entrega. */
import { redirect } from "next/navigation";

export const metadata = { title: "Configurar site" };

export default function PaginaEntregaDesativada(): never {
  redirect("/painel/configurar-site");
}
