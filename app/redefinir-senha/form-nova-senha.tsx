"use client";

import { Botao } from "@/components/ui/botao";
import { Campo, Entrada } from "@/components/ui/campo";
import { redefinirSenha } from "@/lib/auth/acoes";
import { useAcao } from "@/lib/use-acao";

export function FormNovaSenha() {
  const { estado, onSubmit, pendente } = useAcao(redefinirSenha, { toast: false });
  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
      <Campo rotulo="Nova senha" nome="senha" erro={estado.erros?.senha} ajuda="Mínimo de 8 caracteres.">
        {(p) => <Entrada {...p} type="password" autoComplete="new-password" required minLength={8} />}
      </Campo>
      <Campo rotulo="Repita a nova senha" nome="confirmacao" erro={estado.erros?.confirmacao}>
        {(p) => <Entrada {...p} type="password" autoComplete="new-password" required />}
      </Campo>
      {estado.mensagem && !estado.erros && (
        <p role="alert" className="rounded-xl bg-perigo-suave p-3 text-sm text-perigo">
          {estado.mensagem}
        </p>
      )}
      <Botao type="submit" carregando={pendente} className="w-full">
        Salvar nova senha
      </Botao>
    </form>
  );
}
