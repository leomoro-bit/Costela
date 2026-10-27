"use client";

import { ArrowLeft, Mail } from "lucide-react";
import { useState } from "react";
import { Botao } from "@/components/ui/botao";
import { Campo, Entrada } from "@/components/ui/campo";
import { entrar, enviarRecuperacao } from "@/lib/auth/acoes";
import { useAcao } from "@/lib/use-acao";

export function FormLogin({ next }: { next: string }) {
  const [modo, setModo] = useState<"entrar" | "recuperar">("entrar");
  const login = useAcao(entrar, { toast: false });
  const rec = useAcao(enviarRecuperacao, { toast: false });
  const estadoLogin = login.estado;
  const estadoRec = rec.estado;

  if (modo === "recuperar") {
    return (
      <div>
        <h1 className="text-lg font-semibold text-texto">Esqueci minha senha</h1>
        <p className="mt-1 text-sm text-texto-2">Enviaremos um link para você criar uma nova senha.</p>
        {estadoRec.ok ? (
          <div role="status" className="mt-5 flex gap-3 rounded-xl bg-ok-suave p-4 text-sm text-ok">
            <Mail className="mt-0.5 size-5 shrink-0" aria-hidden />
            <p>{estadoRec.mensagem}</p>
          </div>
        ) : (
          <form onSubmit={rec.onSubmit} className="mt-5 space-y-4" noValidate>
            <Campo rotulo="E-mail" nome="email" erro={estadoRec.erros?.email}>
              {(p) => <Entrada {...p} type="email" autoComplete="email" inputMode="email" required />}
            </Campo>
            {estadoRec.mensagem && !estadoRec.erros && (
              <p role="alert" className="text-sm text-perigo">
                {estadoRec.mensagem}
              </p>
            )}
            <Botao type="submit" carregando={rec.pendente} className="w-full">
              {rec.pendente ? "Enviando..." : "Enviar link"}
            </Botao>
          </form>
        )}
        <button
          type="button"
          onClick={() => setModo("entrar")}
          className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-marca-forte hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden /> Voltar para o login
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-texto">Entrar</h1>
      <p className="mt-1 text-sm text-texto-2">Use o e-mail e a senha cadastrados pelo administrador.</p>
      <form onSubmit={login.onSubmit} className="mt-5 space-y-4" noValidate>
        <input type="hidden" name="next" value={next} />
        <Campo rotulo="E-mail" nome="email" erro={estadoLogin.erros?.email}>
          {(p) => <Entrada {...p} type="email" autoComplete="email" inputMode="email" required />}
        </Campo>
        <Campo rotulo="Senha" nome="senha" erro={estadoLogin.erros?.senha}>
          {(p) => <Entrada {...p} type="password" autoComplete="current-password" required />}
        </Campo>
        {estadoLogin.mensagem && !estadoLogin.erros && (
          <p role="alert" className="rounded-xl bg-perigo-suave p-3 text-sm text-perigo">
            {estadoLogin.mensagem}
          </p>
        )}
        <Botao type="submit" carregando={login.pendente} className="w-full">
          {login.pendente ? "Entrando..." : "Entrar"}
        </Botao>
      </form>
      <button
        type="button"
        onClick={() => setModo("recuperar")}
        className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-marca-forte hover:underline"
      >
        Esqueci minha senha
      </button>
    </div>
  );
}
