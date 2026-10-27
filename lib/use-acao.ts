"use client";

/**
 * Hook padrão para formulários que chamam uma Server Action.
 *
 *   const { onSubmit, erros, pendente } = useAcao(salvarCliente);
 *   <form onSubmit={onSubmit} noValidate>
 *     <Campo ... erro={erros.nome}>...</Campo>
 *     <Botao type="submit" carregando={pendente}>Salvar</Botao>
 *   </form>
 *
 * - Mostra toast de sucesso/erro automaticamente (desligue com { toast: false }).
 * - NÃO apaga o que o usuário digitou quando a validação falha
 *   (o <form action={...}> do React 19 limpa o formulário sozinho — por isso usamos onSubmit).
 * - `aoSucesso` roda depois de salvar (ex.: fechar um modal, limpar o form, router.push).
 */
import { startTransition, useActionState, type FormEvent } from "react";
import { useToast } from "@/components/ui/toast";
import { type EstadoAcao, estadoInicial } from "@/lib/acoes";

type AcaoServidor = (anterior: EstadoAcao, formData: FormData) => Promise<EstadoAcao>;

export function useAcao(
  acao: AcaoServidor,
  opcoes: { toast?: boolean; aoSucesso?: (estado: EstadoAcao, form: HTMLFormElement | null) => void } = {},
) {
  const toast = useToast();
  const { toast: mostrarToast = true, aoSucesso } = opcoes;

  const [estado, despachar, pendente] = useActionState(
    async (anterior: EstadoAcao, entrada: { formData: FormData; form: HTMLFormElement | null }) => {
      const resultado = await acao(anterior, entrada.formData);
      if (mostrarToast && resultado.mensagem) {
        if (resultado.ok) toast.sucesso(resultado.mensagem);
        else toast.erro(resultado.mensagem);
      }
      if (resultado.ok) aoSucesso?.(resultado, entrada.form);
      return resultado;
    },
    estadoInicial,
  );

  function onSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = evento.currentTarget;
    const formData = new FormData(form, (evento.nativeEvent as SubmitEvent).submitter);
    startTransition(() => despachar({ formData, form }));
  }

  return { estado, erros: estado.erros ?? {}, pendente, onSubmit };
}
