"use client";

/**
 * Estado do CLIENTE FINAL no navegador (localStorage, chave "tetra-cardapio-v1"):
 * sacola, dados básicos do cliente, forma de pagamento, cupom
 * e o histórico "Meus pedidos" deste aparelho.
 *
 * Usa useSyncExternalStore: o servidor renderiza com a sacola vazia e o navegador
 * carrega o que estiver salvo logo em seguida (sem erro de hidratação).
 */
import { useSyncExternalStore } from "react";
import type { CupomValidado, ItemSacola } from "@/lib/cardapio";

const CHAVE = "tetra-cardapio-v1";

export type PedidoHistorico = {
  id: string;
  numero: number;
  data: string;
  itens: ItemSacola[];
  tipo: "entrega" | "retirada";
  total: number;
};

export type EstadoCliente = {
  versao: 1;
  sacola: ItemSacola[];
  cliente: { nome: string; telefone: string };
  entrega: {
    tipo: "entrega" | "retirada";
    bairroId: string;
    rua: string;
    numero: string;
    complemento: string;
    referencia: string;
  };
  pagamento: { forma: "pix" | "cartao" | "dinheiro"; troco: string; semTroco: boolean };
  cupom: CupomValidado | null;
  obs: string;
  lembrar: boolean;
  pedidos: PedidoHistorico[];
};

export function estadoVazio(): EstadoCliente {
  return {
    versao: 1,
    sacola: [],
    cliente: { nome: "", telefone: "" },
    entrega: { tipo: "retirada", bairroId: "", rua: "", numero: "", complemento: "", referencia: "" },
    pagamento: { forma: "pix", troco: "", semTroco: false },
    cupom: null,
    obs: "",
    lembrar: true,
    pedidos: [],
  };
}

const VAZIO_SERVIDOR = estadoVazio();
let estado: EstadoCliente = VAZIO_SERVIDOR;
let carregado = false;
let armazenamentoOk = true;
const ouvintes = new Set<() => void>();

function texto(v: unknown, max = 200) {
  return typeof v === "string" ? v.slice(0, max) : "";
}

/** Aceita só o formato esperado (dados antigos/corrompidos viram estado vazio). */
function normalizar(bruto: unknown): EstadoCliente {
  const base = estadoVazio();
  if (!bruto || typeof bruto !== "object") return base;
  const b = bruto as Partial<EstadoCliente>;
  const itemValido = (it: ItemSacola) =>
    it && typeof it.uid === "string" && typeof it.produtoId === "string" && Number(it.qtd) > 0 && Array.isArray(it.escolhas);
  return {
    ...base,
    sacola: Array.isArray(b.sacola) ? b.sacola.filter(itemValido).slice(0, 40) : [],
    cliente: { nome: texto(b.cliente?.nome, 80), telefone: texto(b.cliente?.telefone, 20) },
    entrega: {
      // Este restaurante atende exclusivamente por retirada no local.
      // Também corrige sessões antigas que tenham salvo "entrega" no navegador.
      tipo: "retirada",
      bairroId: texto(b.entrega?.bairroId, 60),
      rua: texto(b.entrega?.rua, 120),
      numero: texto(b.entrega?.numero, 20),
      complemento: texto(b.entrega?.complemento, 80),
      referencia: texto(b.entrega?.referencia, 120),
    },
    pagamento: {
      forma: b.pagamento?.forma === "cartao" || b.pagamento?.forma === "dinheiro" ? b.pagamento.forma : "pix",
      troco: texto(b.pagamento?.troco, 12),
      semTroco: Boolean(b.pagamento?.semTroco),
    },
    cupom: b.cupom && typeof b.cupom === "object" && b.cupom.valido ? b.cupom : null,
    obs: texto(b.obs, 200),
    lembrar: b.lembrar !== false,
    pedidos: Array.isArray(b.pedidos)
      ? b.pedidos.filter((p) => p && typeof p.id === "string" && Array.isArray(p.itens)).slice(0, 30)
      : [],
  };
}

function carregar() {
  if (carregado || typeof window === "undefined") return;
  carregado = true;
  try {
    const bruto = localStorage.getItem(CHAVE);
    estado = bruto ? normalizar(JSON.parse(bruto)) : estadoVazio();
  } catch {
    armazenamentoOk = false;
    estado = estadoVazio();
  }
}

function salvar() {
  const copia: EstadoCliente = { ...estado };
  if (!copia.lembrar) {
    const v = estadoVazio();
    copia.cliente = v.cliente;
    copia.entrega = { ...v.entrega, tipo: "retirada" };
  }
  try {
    localStorage.setItem(CHAVE, JSON.stringify(copia));
  } catch {
    armazenamentoOk = false; // modo privativo/sem espaço: funciona, mas não salva
  }
}

/** Altera o estado (imutável), salva no navegador e avisa os componentes. */
export function atualizarCliente(fn: (atual: EstadoCliente) => EstadoCliente) {
  carregar();
  estado = fn(estado);
  salvar();
  ouvintes.forEach((o) => o());
}

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  const aoMudarEmOutraAba = (e: StorageEvent) => {
    if (e.key !== CHAVE) return;
    carregado = false;
    carregar();
    ouvinte();
  };
  window.addEventListener("storage", aoMudarEmOutraAba);
  return () => {
    ouvintes.delete(ouvinte);
    window.removeEventListener("storage", aoMudarEmOutraAba);
  };
}

function lerCliente() {
  carregar();
  return estado;
}

export function useEstadoCliente() {
  return useSyncExternalStore(assinar, lerCliente, () => VAZIO_SERVIDOR);
}

export function armazenamentoDisponivel() {
  return armazenamentoOk;
}

export function novoId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
