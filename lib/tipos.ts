/**
 * Tipos TypeScript das tabelas do banco (espelham supabase/schema.sql).
 *
 * O formato é compatível com o gerado por `npx supabase gen types typescript`
 * (Row / Insert / Update / Relationships), então dá para trocar este arquivo
 * pelo gerado automaticamente se quiser.
 *
 * Para adicionar uma tabela: crie o tipo da linha (Row), o que é obrigatório
 * ao inserir (Insert) e registre em Database["public"]["Tables"].
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/** Monta Row/Insert/Update no formato do Supabase. */
type Tabela<Row, Insert> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Insert>;
  Relationships: [];
};

/** Colunas automáticas (o banco preenche). */
type Auto = { id?: string; created_at?: string; updated_at?: string };

type ConfiguracoesRow = {
  id: string;
  unica: boolean;
  nome_negocio: string;
  whatsapp: string | null;
  cidade: string | null;
  endereco: string | null;
  instagram: string | null;
  cor_primaria: string;
  mensagem_whatsapp: string | null;
  subtitulo: string | null;
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
  chave_pix: string | null;
  som_novo_pedido: boolean;
  // Marca (tela Personalização). "subtitulo" (frase de apresentação) também é da marca.
  nome_exibicao: string | null;
  logo_url: string | null;
  cor_destaque: string;
  fonte: string;
  raio: string;
  tema_padrao: string;
  created_at: string;
  updated_at: string;
};

type CategoriaRow = { id: string; nome: string; ordem: number; ativo: boolean; created_at: string; updated_at: string };

type ProdutoRow = {
  id: string;
  categoria_id: string;
  nome: string;
  descricao: string;
  preco: number;
  preco_antigo: number | null;
  foto_url: string | null;
  selo: "mais-pedido" | "novo" | null;
  disponivel: boolean;
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
};

type GrupoOpcionalRow = {
  id: string;
  titulo: string;
  tipo: "unico" | "multiplo";
  obrigatorio: boolean;
  max_escolhas: number | null;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

type OpcionalRow = {
  id: string;
  grupo_id: string;
  nome: string;
  preco: number;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

type ProdutoGrupoRow = { produto_id: string; grupo_id: string; ordem: number; created_at: string; updated_at: string };

type BairroRow = { id: string; nome: string; taxa: number; ordem: number; ativo: boolean; created_at: string; updated_at: string };

type CupomRow = {
  id: string;
  codigo: string;
  tipo: "percentual" | "valor" | "frete";
  valor: number;
  minimo: number;
  descricao: string;
  valido_ate: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

type HorarioRow = { id: string; dia_semana: number; abre: string; fecha: string; created_at: string; updated_at: string };

export type StatusPedido = "novo" | "preparando" | "saiu" | "entregue" | "cancelado";
export type FormaPagamento = "pix" | "cartao" | "dinheiro";

type PedidoRow = {
  id: string;
  numero: number;
  status: StatusPedido;
  tipo: "entrega" | "retirada";
  cliente_nome: string;
  cliente_telefone: string | null;
  bairro: string | null;
  rua: string | null;
  numero_endereco: string | null;
  complemento: string | null;
  referencia: string | null;
  pagamento: FormaPagamento;
  troco_para: number | null;
  cupom: string | null;
  subtotal: number;
  taxa_entrega: number;
  desconto: number;
  total: number;
  observacoes: string | null;
  fora_do_horario: boolean;
  created_at: string;
  updated_at: string;
};

/** Escolhas gravadas em cada item do pedido. */
export type OpcoesItem = { grupo: string; itens: { nome: string; preco: number }[] }[];

type PedidoItemRow = {
  id: string;
  pedido_id: string;
  produto_id: string | null;
  nome: string;
  quantidade: number;
  preco_unitario: number;
  opcoes: Json;
  observacao: string | null;
  total: number;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      configuracoes: Tabela<ConfiguracoesRow, Partial<ConfiguracoesRow>>;
      categorias: Tabela<CategoriaRow, Auto & { nome: string; ordem?: number; ativo?: boolean }>;
      produtos: Tabela<
        ProdutoRow,
        Auto & Pick<ProdutoRow, "categoria_id" | "nome" | "preco"> & Partial<Omit<ProdutoRow, "id" | "categoria_id" | "nome" | "preco">>
      >;
      grupos_opcionais: Tabela<GrupoOpcionalRow, Auto & { titulo: string } & Partial<Omit<GrupoOpcionalRow, "id" | "titulo">>>;
      opcionais: Tabela<OpcionalRow, Auto & { grupo_id: string; nome: string } & Partial<Omit<OpcionalRow, "id" | "grupo_id" | "nome">>>;
      produto_grupos: Tabela<ProdutoGrupoRow, { produto_id: string; grupo_id: string; ordem?: number; created_at?: string; updated_at?: string }>;
      bairros: Tabela<BairroRow, Auto & { nome: string; taxa?: number; ordem?: number; ativo?: boolean }>;
      cupons: Tabela<CupomRow, Auto & { codigo: string; tipo: CupomRow["tipo"] } & Partial<Omit<CupomRow, "id" | "codigo" | "tipo">>>;
      horarios: Tabela<HorarioRow, Auto & { dia_semana: number; abre: string; fecha: string }>;
      pedidos: Tabela<PedidoRow, Auto & Partial<Omit<PedidoRow, "id">>>;
      pedido_itens: Tabela<PedidoItemRow, Auto & Partial<Omit<PedidoItemRow, "id">>>;
    };
    Views: { [_ in never]: never };
    Functions: {
      loja_aberta: { Args: { p_quando?: string }; Returns: boolean };
      configuracao_publica: { Args: Record<PropertyKey, never>; Returns: Json };
      marca_publica: {
        Args: never;
        Returns: {
          nome_exibido: string;
          subtitulo: string | null;
          logo_url: string | null;
          cor_primaria: string;
          cor_destaque: string;
          fonte: string;
          raio: string;
          tema_padrao: string;
        }[];
      };
      validar_cupom: { Args: { p_codigo: string; p_subtotal?: number; p_tipo?: string }; Returns: Json };
      criar_pedido: { Args: { p: Json }; Returns: Json };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type Tabelas = Database["public"]["Tables"];

/** Linha de uma tabela: Linha<"produtos"> */
export type Linha<T extends keyof Tabelas> = Tabelas[T]["Row"];
/** Dados para inserir: NovaLinha<"produtos"> */
export type NovaLinha<T extends keyof Tabelas> = Tabelas[T]["Insert"];
/** Dados para atualizar: EdicaoLinha<"produtos"> */
export type EdicaoLinha<T extends keyof Tabelas> = Tabelas[T]["Update"];

// Atalhos
export type Configuracoes = Linha<"configuracoes">;
export type Categoria = Linha<"categorias">;
export type Produto = Linha<"produtos">;
export type GrupoOpcional = Linha<"grupos_opcionais">;
export type Opcional = Linha<"opcionais">;
export type ProdutoGrupo = Linha<"produto_grupos">;
export type Bairro = Linha<"bairros">;
export type Cupom = Linha<"cupons">;
export type Horario = Linha<"horarios">;
export type Pedido = Linha<"pedidos">;
export type PedidoItem = Linha<"pedido_itens">;
