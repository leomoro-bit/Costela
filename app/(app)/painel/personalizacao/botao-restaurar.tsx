"use client";

/**
 * Padrão para ações de UM clique (excluir, mudar status, restaurar...):
 *   useConfirmar() → useTransition() → chama a Server Action → toast.
 */
import { RotateCcw } from "lucide-react";
import { useTransition } from "react";
import { Botao } from "@/components/ui/botao";
import { useConfirmar } from "@/components/ui/confirmar";
import { useToast } from "@/components/ui/toast";
import { restaurarPersonalizacao } from "./actions";

export function BotaoRestaurar() {
  const confirmar = useConfirmar();
  const toast = useToast();
  const [pendente, iniciar] = useTransition();

  async function aoClicar() {
    const ok = await confirmar({
      titulo: "Restaurar a marca padrão?",
      mensagem: "Cores, fonte, nome exibido, subtítulo, tema e arredondamento voltam ao original e a logo é removida.",
      textoConfirmar: "Restaurar padrão",
      perigo: true,
    });
    if (!ok) return;
    iniciar(async () => {
      const r = await restaurarPersonalizacao();
      // revalidatePath() na action já atualiza a tela com os dados novos.
      if (r.ok) toast.sucesso(r.mensagem ?? "Pronto.");
      else toast.erro(r.mensagem ?? "Não foi possível restaurar.");
    });
  }

  return (
    <Botao variante="secundario" onClick={aoClicar} carregando={pendente}>
      <RotateCcw className="size-4" aria-hidden /> Restaurar padrão
    </Botao>
  );
}
