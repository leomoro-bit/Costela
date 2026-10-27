/**
 * Tela exibida quando NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
 * não estão configuradas (em vez de o app quebrar com erro técnico).
 */
import { DatabaseZap } from "lucide-react";

export function ConfigurarAmbiente() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-fundo px-4 py-10">
      <div className="w-full min-w-0 max-w-xl rounded-2xl border border-borda bg-superficie p-6 shadow-sm sm:p-8">
        <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-alerta-suave text-alerta">
          <DatabaseZap className="size-6" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold text-texto">Configure as variáveis de ambiente</h1>
        <p className="mt-2 text-texto-2">
          O app ainda não sabe qual banco Supabase usar. Falta preencher duas variáveis:
        </p>
        <pre className="mt-4 overflow-x-auto rounded-xl bg-superficie-2 p-4 text-xs break-all whitespace-pre-wrap text-texto sm:text-sm">
          {`NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-ou-publishable`}
        </pre>
        <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm text-texto-2">
          <li>
            No Supabase, abra <strong className="text-texto">Project Settings ▸ API</strong> (ou{" "}
            <strong className="text-texto">Connect</strong>) e copie a <em>Project URL</em> e a chave{" "}
            <em>anon / publishable</em>.
          </li>
          <li>
            <strong className="text-texto">Na Vercel:</strong> Settings ▸ Environment Variables ▸ adicione as duas ▸
            depois vá em Deployments ▸ <em>Redeploy</em>.
          </li>
          <li>
            <strong className="text-texto">No seu computador:</strong> copie <code>.env.example</code> para{" "}
            <code>.env.local</code>, preencha e rode <code>npm run dev</code> de novo.
          </li>
        </ol>
        <p className="mt-5 text-xs text-texto-2">Nunca use a chave &quot;service_role&quot; aqui: ela é secreta.</p>
      </div>
    </main>
  );
}
