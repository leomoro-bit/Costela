/**
 * Tipos e regras do CARDÁPIO PÚBLICO (usados no servidor e no navegador).
 *
 * Os cálculos aqui servem para MOSTRAR valores ao cliente enquanto ele monta a
 * sacola. O valor que vale de verdade é recalculado no banco pela função
 * criar_pedido() com os preços do banco (supabase/schema.sql).
 */
import { FUSO } from "./formatar";

// ---------------------------------------------------------------------------
// Tipos do cardápio público
// ---------------------------------------------------------------------------
/**
 * Dados públicos do negócio (função configuracao_publica()). Nome, frase de
 * apresentação, logo e cores são da MARCA (função marca_publica() → MarcaCardapio).
 */
export type ConfigPublica = {
  whatsapp: string | null;
  cidade: string | null;
  endereco: string | null;
  instagram: string | null;
  capa_url: string | null;
  avaliacao: string | null;
  tempo_entrega: string;
  tempo_retirada: string;
  pedido_minimo: number;
  entrega_gratis_acima: number;
  aceitar_pedidos_fechado: boolean;
  aceita_pix: boolean;
  aceita_cartao: boolean;
  aceita_dinheiro: boolean;
};

export type OpcaoPub = { id: string; nome: string; preco: number };
export type GrupoPub = {
  id: string;
  titulo: string;
  tipo: "unico" | "multiplo";
  obrigatorio: boolean;
  max_escolhas: number | null;
  opcoes: OpcaoPub[];
};
export type CategoriaPub = { id: string; nome: string };
export type ProdutoPub = {
  id: string;
  categoria_id: string;
  nome: string;
  descricao: string;
  preco: number;
  preco_antigo: number | null;
  foto_url: string | null;
  selo: "mais-pedido" | "novo" | null;
  disponivel: boolean;
  /** ids dos grupos de opcionais, na ordem */
  grupos: string[];
};
export type BairroPub = { id: string; nome: string; taxa: number };
export type HorarioPub = { dia_semana: number; abre: string; fecha: string };

/** Marca do restaurante (painel ▸ Personalização), lida por obterMarca(). */
export type MarcaCardapio = {
  /** Nome exibido (ou o nome do negócio). */
  nome: string;
  /** Frase de apresentação abaixo do nome. */
  subtitulo: string | null;
  logoUrl: string | null;
};

export type DadosCardapio = {
  marca: MarcaCardapio;
  config: ConfigPublica;
  categorias: CategoriaPub[];
  produtos: ProdutoPub[];
  grupos: Record<string, GrupoPub>;
  bairros: BairroPub[];
  horarios: HorarioPub[];
};

/** Resposta da função criar_pedido(). */
export type PedidoCriado = {
  id: string;
  numero: number;
  subtotal: number;
  taxa_entrega: number;
  frete_gratis: boolean;
  desconto: number;
  total: number;
  fora_do_horario: boolean;
  bairro: string | null;
  itens: {
    produto_id: string;
    nome: string;
    quantidade: number;
    preco_unitario: number;
    opcoes: { grupo: string; itens: { nome: string; preco: number }[] }[];
    observacao: string | null;
    total: number;
  }[];
};

export type CupomValidado = {
  valido: boolean;
  codigo?: string;
  tipo?: "percentual" | "valor" | "frete";
  valor?: number;
  minimo?: number;
  descricao?: string;
  mensagem: string;
};

// ---------------------------------------------------------------------------
// Horário de funcionamento (sempre no fuso de São Paulo)
// ---------------------------------------------------------------------------
export const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

/** "18:00:00" → "18:00" */
export function hhmm(hora: string) {
  return hora.slice(0, 5);
}

function minutos(hora: string) {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

/** Dia da semana (0 = domingo) e minutos do dia no fuso de São Paulo. */
export function agoraEmSaoPaulo(agora: Date = new Date()) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: FUSO,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(agora);
  const pega = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "0";
  const dia = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(pega("weekday"));
  return { dia, min: Number(pega("hour")) * 60 + Number(pega("minute")) };
}

export type StatusLoja = { aberto: true; fechaAs: string } | { aberto: false; abre: string };

/** Mesma regra da função SQL loja_aberta(): faixas que passam da meia-noite contam. */
export function statusFuncionamento(horarios: HorarioPub[], agora: Date = new Date()): StatusLoja {
  const { dia, min } = agoraEmSaoPaulo(agora);
  const doDia = (d: number) =>
    horarios.filter((h) => h.dia_semana === d).sort((a, b) => minutos(a.abre) - minutos(b.abre));

  for (const h of doDia(dia)) {
    const a = minutos(h.abre);
    const b = minutos(h.fecha);
    if (b > a ? min >= a && min < b : min >= a) return { aberto: true, fechaAs: hhmm(h.fecha) };
  }
  for (const h of doDia((dia + 6) % 7)) {
    const a = minutos(h.abre);
    const b = minutos(h.fecha);
    if (b <= a && min < b) return { aberto: true, fechaAs: hhmm(h.fecha) };
  }
  for (let i = 0; i < 8; i++) {
    const d = (dia + i) % 7;
    for (const h of doDia(d)) {
      if (i > 0 || minutos(h.abre) > min) {
        const quando = i === 0 ? "hoje" : i === 1 ? "amanhã" : DIAS[d].toLowerCase();
        return { aberto: false, abre: `${quando} às ${hhmm(h.abre)}` };
      }
    }
  }
  return { aberto: false, abre: "" };
}

// ---------------------------------------------------------------------------
// Sacola
// ---------------------------------------------------------------------------
export type EscolhaSacola = { grupoId: string; grupo: string; itens: OpcaoPub[] };
export type ItemSacola = {
  uid: string;
  produtoId: string;
  nome: string;
  /** Foto do produto na versão atual do cardápio (opcional para histórico antigo). */
  foto_url?: string | null;
  qtd: number;
  escolhas: EscolhaSacola[];
  obs: string;
  precoUnit: number;
};

export function precoUnitario(produto: Pick<ProdutoPub, "preco">, escolhas: EscolhaSacola[]) {
  return arred(produto.preco + escolhas.reduce((s, g) => s + g.itens.reduce((a, o) => a + (o.preco || 0), 0), 0));
}

/** Arredonda para centavos (evita 0,1 + 0,2 = 0,30000000000000004). */
export function arred(valor: number) {
  return Math.round(valor * 100) / 100;
}

export function descricaoEscolhas(escolhas: EscolhaSacola[] | { grupo: string; itens: { nome: string; preco: number }[] }[], moeda: (v: number) => string) {
  return escolhas
    .map((e) => e.itens.map((o) => o.nome + (o.preco ? ` (+${moeda(o.preco)})` : "")).join(", "))
    .filter(Boolean)
    .join(" · ");
}

export type Totais = {
  sub: number;
  taxa: number;
  freteGratis: boolean;
  desconto: number;
  total: number;
  entrega: boolean;
  bairro: BairroPub | null;
};

/** Prévia dos totais (o banco recalcula tudo ao criar o pedido). */
export function calcularTotais(opcoes: {
  itens: ItemSacola[];
  tipo: "entrega" | "retirada";
  bairro: BairroPub | null;
  config: Pick<ConfigPublica, "entrega_gratis_acima">;
  cupom: CupomValidado | null;
}): Totais {
  const sub = arred(opcoes.itens.reduce((s, it) => s + it.precoUnit * it.qtd, 0));
  const entrega = opcoes.tipo === "entrega";
  let taxa = entrega && opcoes.bairro ? opcoes.bairro.taxa : 0;
  let freteGratis = entrega && opcoes.config.entrega_gratis_acima > 0 && sub >= opcoes.config.entrega_gratis_acima;
  let desconto = 0;
  const c = opcoes.cupom;
  if (c?.valido && sub >= (c.minimo ?? 0) && (c.tipo !== "frete" || entrega)) {
    if (c.tipo === "percentual") desconto = arred((sub * (c.valor ?? 0)) / 100);
    if (c.tipo === "valor") desconto = Math.min(c.valor ?? 0, sub);
    if (c.tipo === "frete") freteGratis = true;
  }
  if (freteGratis) taxa = 0;
  return { sub, taxa, freteGratis, desconto, entrega, bairro: opcoes.bairro, total: Math.max(0, arred(sub - desconto + taxa)) };
}

/** Motivo para o cupom aplicado não valer mais com a sacola atual ("" = vale). */
export function erroCupom(c: CupomValidado | null, sub: number, tipo: "entrega" | "retirada", moeda: (v: number) => string) {
  if (!c?.valido) return "";
  if (sub < (c.minimo ?? 0)) return `Este cupom vale para pedidos a partir de ${moeda(c.minimo ?? 0)}.`;
  if (c.tipo === "frete") return "Este cupom é de entrega, mas o restaurante trabalha somente com retirada no local.";
  return "";
}

export const NOMES_PAGAMENTO = { pix: "Pix", cartao: "Cartão", dinheiro: "Dinheiro" } as const;
