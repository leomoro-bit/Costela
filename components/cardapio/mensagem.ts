/**
 * Monta o texto do pedido que chega ORGANIZADO no WhatsApp do restaurante.
 * Usa os valores devolvidos pelo banco (criar_pedido), não os calculados no navegador.
 */
import type { MarcaCardapio, PedidoCriado } from "@/lib/cardapio";
import { formatarMoeda, formatarTelefone, somenteDigitos } from "@/lib/formatar";
import type { EstadoCliente } from "./estado-cliente";

export function montarMensagemPedido(pedido: PedidoCriado, e: EstadoCliente, marca: MarcaCardapio, cupomAplicado: string) {
  const m = formatarMoeda;
  const L: string[] = [];
  const quando = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date());

  L.push(`*NOVO PEDIDO — ${marca.nome.toUpperCase()}*`);
  L.push(`Pedido #${pedido.numero} · ${quando}`);
  if (pedido.fora_do_horario) L.push("_(enviado fora do horário de funcionamento)_");
  L.push("");
  L.push("*ITENS*");
  for (const it of pedido.itens) {
    L.push(`${it.quantidade}x ${it.nome} — ${m(it.total)}`);
    for (const g of it.opcoes) {
      L.push(`   • ${g.grupo}: ${g.itens.map((o) => o.nome + (o.preco ? ` (+${m(o.preco)})` : "")).join(", ")}`);
    }
    if (it.observacao) L.push(`   _Obs.: ${it.observacao}_`);
  }
  L.push("");
  L.push(`Subtotal: ${m(pedido.subtotal)}`);
  if (pedido.desconto > 0) L.push(`Desconto (${cupomAplicado}): -${m(pedido.desconto)}`);
  else if (cupomAplicado) L.push(`Cupom: ${cupomAplicado}`);
  L.push(`*TOTAL: ${m(pedido.total)}*`);
  L.push("");
  L.push("*RETIRADA NO LOCAL*");
  L.push("");
  L.push("*CLIENTE*");
  const tel = somenteDigitos(e.cliente.telefone);
  L.push(e.cliente.nome.trim() + (tel ? ` · ${formatarTelefone(tel)}` : ""));
  L.push("");
  const formas = { pix: "Pix", cartao: "Cartão na retirada", dinheiro: "Dinheiro" };
  let pag = `*PAGAMENTO:* ${formas[e.pagamento.forma]}`;
  if (e.pagamento.forma === "dinheiro") {
    const troco = lerValor(e.pagamento.troco);
    if (e.pagamento.semTroco || !troco) pag += " (sem troco)";
    else pag += ` — troco para ${m(troco)} (levar ${m(troco - pedido.total)})`;
  }
  L.push(pag);
  if (e.obs.trim()) {
    L.push("");
    L.push(`*OBSERVAÇÕES:* ${e.obs.trim()}`);
  }
  return L.join("\n");
}

/** "100", "100,50", "R$ 1.000,00" → número */
export function lerValor(txt: string) {
  const limpo = String(txt).replace(/[^\d,.-]/g, "");
  const normal = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  const n = Number(normal);
  return Number.isFinite(n) ? n : 0;
}
