-- =====================================================================
-- CARDÁPIO DIGITAL — SCHEMA DO BANCO
-- Cole TUDO no Supabase ▸ SQL Editor ▸ New query ▸ Run
--
-- Pode rodar quantas vezes quiser (é idempotente): não apaga dados.
--
-- Segurança (RLS ligado em TODAS as tabelas):
--  * Equipe LOGADA (authenticated) lê e grava tudo ("a equipe compartilha tudo").
--  * Visitante ANÔNIMO (o cliente que abre o cardápio) só consegue:
--      - LER categorias, produtos, grupos de opcionais e opcionais ATIVOS,
--        bairros de entrega ativos e os horários;
--      - ler os dados PÚBLICOS do negócio pela função configuracao_publica()
--        e a MARCA (nome exibido, logo, cores, fonte) pela função marca_publica()
--        (a tabela configuracoes inteira NÃO é exposta);
--      - ler a logo na pasta pública "marca" do Storage (só a equipe logada envia);
--      - validar um cupom pela função validar_cupom() (cupons não são listados);
--      - criar um pedido pela função criar_pedido(), que RECALCULA preços,
--        taxa, desconto e total no banco (o preço enviado pelo navegador é ignorado).
--  * Pedidos só são lidos pela equipe logada.
-- =====================================================================

-- Extensões ------------------------------------------------------------
create extension if not exists pgcrypto; -- gen_random_uuid()

-- Função que atualiza a coluna updated_at em todo UPDATE ----------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =====================================================================
-- CONFIGURACOES — linha única com os dados do negócio
-- =====================================================================
create table if not exists public.configuracoes (
  id                uuid primary key default gen_random_uuid(),
  unica             boolean not null default true unique check (unica),
  nome_negocio      text not null default 'Meu Negócio' check (char_length(nome_negocio) between 1 and 80),
  whatsapp          text check (whatsapp is null or whatsapp ~ '^[0-9]{10,13}$'),
  cidade            text,
  endereco          text,
  instagram         text,
  cor_primaria      text not null default '#D5A23A' check (cor_primaria ~ '^#[0-9A-Fa-f]{6}$'),
  mensagem_whatsapp text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Campos específicos do cardápio (add column if not exists = seguro rodar de novo)
alter table public.configuracoes alter column cor_primaria set default '#D5A23A';
alter table public.configuracoes add column if not exists subtitulo               text;
alter table public.configuracoes add column if not exists capa_url                text;
alter table public.configuracoes add column if not exists avaliacao               text;
alter table public.configuracoes add column if not exists tempo_entrega           text not null default '35–50 min';
alter table public.configuracoes add column if not exists tempo_retirada          text not null default '15–25 min';
alter table public.configuracoes add column if not exists pedido_minimo           numeric(12,2) not null default 0;
alter table public.configuracoes add column if not exists entrega_gratis_acima    numeric(12,2) not null default 0;
alter table public.configuracoes add column if not exists aceitar_pedidos_fechado boolean not null default true;
alter table public.configuracoes add column if not exists aceita_pix              boolean not null default true;
alter table public.configuracoes add column if not exists aceita_cartao           boolean not null default true;
alter table public.configuracoes add column if not exists aceita_dinheiro         boolean not null default true;
alter table public.configuracoes add column if not exists chave_pix               text;
alter table public.configuracoes add column if not exists som_novo_pedido         boolean not null default true;

alter table public.configuracoes drop constraint if exists configuracoes_pedido_minimo_check;
alter table public.configuracoes add constraint configuracoes_pedido_minimo_check check (pedido_minimo >= 0);
alter table public.configuracoes drop constraint if exists configuracoes_entrega_gratis_check;
alter table public.configuracoes add constraint configuracoes_entrega_gratis_check check (entrega_gratis_acima >= 0);
alter table public.configuracoes drop constraint if exists configuracoes_pagamento_check;
alter table public.configuracoes add constraint configuracoes_pagamento_check check (aceita_pix or aceita_cartao or aceita_dinheiro);

drop trigger if exists trg_configuracoes_updated_at on public.configuracoes;
create trigger trg_configuracoes_updated_at
  before update on public.configuracoes
  for each row execute function public.set_updated_at();

alter table public.configuracoes enable row level security;

drop policy if exists "configuracoes_select_autenticado" on public.configuracoes;
create policy "configuracoes_select_autenticado" on public.configuracoes
  for select to authenticated using (true);
drop policy if exists "configuracoes_insert_autenticado" on public.configuracoes;
create policy "configuracoes_insert_autenticado" on public.configuracoes
  for insert to authenticated with check (true);
drop policy if exists "configuracoes_update_autenticado" on public.configuracoes;
create policy "configuracoes_update_autenticado" on public.configuracoes
  for update to authenticated using (true) with check (true);
drop policy if exists "configuracoes_delete_autenticado" on public.configuracoes;
create policy "configuracoes_delete_autenticado" on public.configuracoes
  for delete to authenticated using (true);

insert into public.configuracoes (unica) values (true)
on conflict (unica) do nothing;

-- =====================================================================
-- PERSONALIZAÇÃO DA MARCA (tela /painel/personalizacao)
-- Logo, cores, fonte, nome exibido, subtítulo, tema padrão e arredondamento.
-- Valem no cardápio público (/), no painel, no login e na comanda impressa.
-- "subtitulo" já existia neste app: é a FRASE DE APRESENTAÇÃO do cardápio (até 140 caracteres).
-- Padrão visual Brasa: dourado #D5A23A, fundo preto e tema escuro.
-- Colunas novas em "configuracoes" (add column if not exists = seguro rodar de novo).
-- =====================================================================
alter table public.configuracoes add column if not exists nome_exibicao text;
alter table public.configuracoes add column if not exists subtitulo     text;
alter table public.configuracoes add column if not exists logo_url      text;
alter table public.configuracoes add column if not exists cor_destaque  text not null default '#D5A23A';
alter table public.configuracoes add column if not exists fonte         text not null default 'app';
alter table public.configuracoes add column if not exists raio          text not null default 'medio';
alter table public.configuracoes add column if not exists tema_padrao   text not null default 'escuro';

-- Frase de apresentação vazia vira "sem frase" (a regra abaixo não aceita texto vazio).
update public.configuracoes set subtitulo = null where subtitulo is not null and btrim(subtitulo) = '';

-- Regras (drop + add = pode rodar de novo)
alter table public.configuracoes drop constraint if exists configuracoes_nome_exibicao_ck;
alter table public.configuracoes add constraint configuracoes_nome_exibicao_ck
  check (nome_exibicao is null or char_length(nome_exibicao) between 1 and 60);
alter table public.configuracoes drop constraint if exists configuracoes_subtitulo_ck;
alter table public.configuracoes add constraint configuracoes_subtitulo_ck
  check (subtitulo is null or char_length(subtitulo) between 1 and 140);
alter table public.configuracoes drop constraint if exists configuracoes_logo_url_ck;
alter table public.configuracoes add constraint configuracoes_logo_url_ck
  check (logo_url is null or (char_length(logo_url) <= 500 and logo_url ~ '^https?://'));
alter table public.configuracoes drop constraint if exists configuracoes_cor_destaque_ck;
alter table public.configuracoes add constraint configuracoes_cor_destaque_ck
  check (cor_destaque ~ '^#[0-9A-Fa-f]{6}$');
alter table public.configuracoes drop constraint if exists configuracoes_fonte_ck;
alter table public.configuracoes add constraint configuracoes_fonte_ck
  check (fonte in ('app', 'moderna', 'elegante', 'amigavel', 'classica', 'tecnica', 'divertida'));
alter table public.configuracoes drop constraint if exists configuracoes_raio_ck;
alter table public.configuracoes add constraint configuracoes_raio_ck
  check (raio in ('reto', 'medio', 'redondo'));
alter table public.configuracoes drop constraint if exists configuracoes_tema_padrao_ck;
alter table public.configuracoes add constraint configuracoes_tema_padrao_ck
  check (tema_padrao in ('claro', 'escuro', 'sistema'));

-- Leitura PÚBLICA só dos campos de marca (cardápio, login, redefinir senha e favicon).
-- "security definer" = roda com permissão do dono da função, então o visitante
-- anônimo vê a marca SEM ter acesso à tabela configuracoes (WhatsApp, endereço...).
drop function if exists public.marca_publica();
create function public.marca_publica()
returns table (
  nome_exibido text,
  subtitulo    text,
  logo_url     text,
  cor_primaria text,
  cor_destaque text,
  fonte        text,
  raio         text,
  tema_padrao  text
)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(nullif(trim(c.nome_exibicao), ''), c.nome_negocio),
         c.subtitulo, c.logo_url, c.cor_primaria, c.cor_destaque, c.fonte, c.raio, c.tema_padrao
  from public.configuracoes c
  where c.unica
  limit 1;
$$;
revoke all on function public.marca_publica() from public;
grant execute on function public.marca_publica() to anon, authenticated;

-- Pasta de arquivos (Storage) "marca" para a logo: pública para LEITURA
-- (a logo aparece no cardápio, no login e no ícone da aba); só usuários logados enviam/trocam/removem.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('marca', 'marca', true, 1048576, array['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'])
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "marca_leitura_publica" on storage.objects;
create policy "marca_leitura_publica" on storage.objects
  for select to anon, authenticated using (bucket_id = 'marca');

drop policy if exists "marca_envio_autenticado" on storage.objects;
create policy "marca_envio_autenticado" on storage.objects
  for insert to authenticated with check (bucket_id = 'marca');

drop policy if exists "marca_atualizacao_autenticado" on storage.objects;
create policy "marca_atualizacao_autenticado" on storage.objects
  for update to authenticated using (bucket_id = 'marca') with check (bucket_id = 'marca');

drop policy if exists "marca_remocao_autenticado" on storage.objects;
create policy "marca_remocao_autenticado" on storage.objects
  for delete to authenticated using (bucket_id = 'marca');

-- =====================================================================
-- CATEGORIAS do cardápio (Lanches, Pizzas, Bebidas...)
-- =====================================================================
create table if not exists public.categorias (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null check (char_length(nome) between 1 and 60),
  ordem      integer not null default 0,
  ativo      boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists categorias_ordem_idx on public.categorias (ordem, nome);

-- =====================================================================
-- PRODUTOS
-- disponivel = false → aparece como "Esgotado" (não dá para pedir)
-- ativo = false      → some do cardápio público
-- =====================================================================
create table if not exists public.produtos (
  id           uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references public.categorias(id) on delete restrict,
  nome         text not null check (char_length(nome) between 1 and 80),
  descricao    text not null default '' check (char_length(descricao) <= 400),
  preco        numeric(12,2) not null check (preco >= 0),
  preco_antigo numeric(12,2) check (preco_antigo is null or preco_antigo > preco),
  foto_url     text check (foto_url is null or foto_url ~* '^https?://'),
  selo         text check (selo is null or selo in ('mais-pedido', 'novo')),
  disponivel   boolean not null default true,
  ativo        boolean not null default true,
  ordem        integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists produtos_categoria_idx on public.produtos (categoria_id, ordem, nome);

-- =====================================================================
-- GRUPOS DE OPCIONAIS (reutilizáveis: "Tamanho", "Borda", "Turbine seu lanche"...)
-- tipo 'unico' = escolhe 1 · 'multiplo' = marca vários (até max_escolhas)
-- =====================================================================
create table if not exists public.grupos_opcionais (
  id           uuid primary key default gen_random_uuid(),
  titulo       text not null check (char_length(titulo) between 1 and 60),
  tipo         text not null default 'unico' check (tipo in ('unico', 'multiplo')),
  obrigatorio  boolean not null default false,
  max_escolhas integer check (max_escolhas is null or max_escolhas between 1 and 20),
  ordem        integer not null default 0,
  ativo        boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.opcionais (
  id         uuid primary key default gen_random_uuid(),
  grupo_id   uuid not null references public.grupos_opcionais(id) on delete cascade,
  nome       text not null check (char_length(nome) between 1 and 60),
  preco      numeric(12,2) not null default 0 check (preco >= 0),
  ordem      integer not null default 0,
  ativo      boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists opcionais_grupo_idx on public.opcionais (grupo_id, ordem);

-- Quais grupos de opcionais cada produto oferece (muitos-para-muitos)
create table if not exists public.produto_grupos (
  produto_id uuid not null references public.produtos(id) on delete cascade,
  grupo_id   uuid not null references public.grupos_opcionais(id) on delete cascade,
  ordem      integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (produto_id, grupo_id)
);
create index if not exists produto_grupos_grupo_idx on public.produto_grupos (grupo_id);

-- =====================================================================
-- BAIRROS atendidos e taxa de entrega
-- =====================================================================
create table if not exists public.bairros (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null check (char_length(nome) between 1 and 60),
  taxa       numeric(12,2) not null default 0 check (taxa >= 0),
  ordem      integer not null default 0,
  ativo      boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists bairros_nome_unico on public.bairros (lower(nome));

-- =====================================================================
-- CUPONS de desconto
-- tipo 'percentual' (valor = %), 'valor' (R$ fixo) ou 'frete' (entrega grátis)
-- =====================================================================
create table if not exists public.cupons (
  id         uuid primary key default gen_random_uuid(),
  codigo     text not null unique check (codigo ~ '^[A-Z0-9_-]{3,20}$'),
  tipo       text not null check (tipo in ('percentual', 'valor', 'frete')),
  valor      numeric(12,2) not null default 0 check (valor >= 0),
  minimo     numeric(12,2) not null default 0 check (minimo >= 0),
  descricao  text not null default '' check (char_length(descricao) <= 120),
  valido_ate date,
  ativo      boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cupons_percentual_faixa_check check (tipo <> 'percentual' or (valor > 0 and valor <= 100)),
  constraint cupons_valor_fixo_check check (tipo <> 'valor' or valor > 0)
);

-- =====================================================================
-- HORÁRIOS de funcionamento (várias faixas por dia)
-- dia_semana: 0 = domingo ... 6 = sábado.
-- Se "fecha" for menor ou igual a "abre" (ex.: 18:00 → 00:30), passa da meia-noite.
-- =====================================================================
create table if not exists public.horarios (
  id         uuid primary key default gen_random_uuid(),
  dia_semana smallint not null check (dia_semana between 0 and 6),
  abre       time not null,
  fecha      time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint horarios_faixa_check check (abre <> fecha)
);
create index if not exists horarios_dia_idx on public.horarios (dia_semana, abre);

-- =====================================================================
-- PEDIDOS recebidos pelo cardápio (criados SÓ pela função criar_pedido)
-- numero: sequencial automático (1001, 1002...) — o banco garante que não repete.
-- =====================================================================
create table if not exists public.pedidos (
  id                uuid primary key default gen_random_uuid(),
  numero            bigint generated by default as identity (start with 1001) unique,
  status            text not null default 'novo'
                    check (status in ('novo', 'preparando', 'saiu', 'entregue', 'cancelado')),
  tipo              text not null check (tipo in ('entrega', 'retirada')),
  cliente_nome      text not null check (char_length(cliente_nome) between 2 and 80),
  cliente_telefone  text check (cliente_telefone is null or cliente_telefone ~ '^[0-9]{10,13}$'),
  bairro            text,
  rua               text,
  numero_endereco   text,
  complemento       text,
  referencia        text,
  pagamento         text not null check (pagamento in ('pix', 'cartao', 'dinheiro')),
  troco_para        numeric(12,2) check (troco_para is null or troco_para >= 0),
  cupom             text,
  subtotal          numeric(12,2) not null check (subtotal >= 0),
  taxa_entrega      numeric(12,2) not null default 0 check (taxa_entrega >= 0),
  desconto          numeric(12,2) not null default 0 check (desconto >= 0),
  total             numeric(12,2) not null check (total >= 0),
  observacoes       text,
  fora_do_horario   boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint pedidos_entrega_check check (tipo <> 'entrega' or (bairro is not null and rua is not null and numero_endereco is not null))
);
create index if not exists pedidos_created_idx on public.pedidos (created_at desc);
create index if not exists pedidos_status_idx on public.pedidos (status, created_at desc);

create table if not exists public.pedido_itens (
  id             uuid primary key default gen_random_uuid(),
  pedido_id      uuid not null references public.pedidos(id) on delete cascade,
  produto_id     uuid references public.produtos(id) on delete set null,
  nome           text not null,
  quantidade     integer not null check (quantidade between 1 and 50),
  preco_unitario numeric(12,2) not null check (preco_unitario >= 0),
  opcoes         jsonb not null default '[]'::jsonb,  -- [{ "grupo": "Tamanho", "itens": [{ "nome": "Grande", "preco": 12 }] }]
  observacao     text,
  total          numeric(12,2) not null check (total >= 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists pedido_itens_pedido_idx on public.pedido_itens (pedido_id);
create index if not exists pedido_itens_produto_idx on public.pedido_itens (produto_id);

-- =====================================================================
-- TRIGGERS updated_at + RLS + POLÍTICAS "equipe compartilha tudo"
-- (um laço só para não repetir o mesmo bloco 9 vezes)
-- =====================================================================
do $$
declare
  t text;
begin
  foreach t in array array['categorias', 'produtos', 'grupos_opcionais', 'opcionais', 'produto_grupos',
                           'bairros', 'cupons', 'horarios', 'pedidos', 'pedido_itens']
  loop
    execute format('drop trigger if exists trg_%1$s_updated_at on public.%1$I', t);
    execute format('create trigger trg_%1$s_updated_at before update on public.%1$I
                    for each row execute function public.set_updated_at()', t);
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "%1$s_select_autenticado" on public.%1$I', t);
    execute format('create policy "%1$s_select_autenticado" on public.%1$I for select to authenticated using (true)', t);
    execute format('drop policy if exists "%1$s_insert_autenticado" on public.%1$I', t);
    execute format('create policy "%1$s_insert_autenticado" on public.%1$I for insert to authenticated with check (true)', t);
    execute format('drop policy if exists "%1$s_update_autenticado" on public.%1$I', t);
    execute format('create policy "%1$s_update_autenticado" on public.%1$I for update to authenticated using (true) with check (true)', t);
    execute format('drop policy if exists "%1$s_delete_autenticado" on public.%1$I', t);
    execute format('create policy "%1$s_delete_autenticado" on public.%1$I for delete to authenticated using (true)', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- LEITURA PÚBLICA (anon) — só o necessário para o cardápio funcionar
-- ---------------------------------------------------------------------
drop policy if exists "categorias_select_publico" on public.categorias;
create policy "categorias_select_publico" on public.categorias
  for select to anon using (ativo = true);

drop policy if exists "produtos_select_publico" on public.produtos;
create policy "produtos_select_publico" on public.produtos
  for select to anon using (ativo = true);

drop policy if exists "grupos_opcionais_select_publico" on public.grupos_opcionais;
create policy "grupos_opcionais_select_publico" on public.grupos_opcionais
  for select to anon using (ativo = true);

drop policy if exists "opcionais_select_publico" on public.opcionais;
create policy "opcionais_select_publico" on public.opcionais
  for select to anon using (ativo = true);

drop policy if exists "produto_grupos_select_publico" on public.produto_grupos;
create policy "produto_grupos_select_publico" on public.produto_grupos
  for select to anon using (
    exists (select 1 from public.produtos p where p.id = produto_id and p.ativo = true)
  );

drop policy if exists "bairros_select_publico" on public.bairros;
create policy "bairros_select_publico" on public.bairros
  for select to anon using (ativo = true);

drop policy if exists "horarios_select_publico" on public.horarios;
create policy "horarios_select_publico" on public.horarios
  for select to anon using (true);

-- Anônimo não grava direto em nenhuma tabela (pedido entra só pela função criar_pedido).
revoke insert, update, delete, truncate on all tables in schema public from anon;

-- =====================================================================
-- FUNÇÕES
-- =====================================================================

-- A loja está aberta agora? (horário de Brasília; faixas que passam da meia-noite)
create or replace function public.loja_aberta(p_quando timestamptz default now())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with agora as (
    select extract(dow from (p_quando at time zone 'America/Sao_Paulo'))::int as dia,
           (p_quando at time zone 'America/Sao_Paulo')::time as hora
  )
  select exists (
    select 1 from public.horarios h, agora a
    where h.dia_semana = a.dia
      and ((h.fecha > h.abre and a.hora >= h.abre and a.hora < h.fecha)
        or (h.fecha <= h.abre and a.hora >= h.abre))
  ) or exists (
    select 1 from public.horarios h, agora a
    where h.dia_semana = (a.dia + 6) % 7
      and h.fecha <= h.abre and a.hora < h.fecha
  );
$$;

-- Dados PÚBLICOS do negócio para o cardápio (nada de campos internos).
-- Nome, frase de apresentação, logo e cores NÃO estão aqui: vêm de marca_publica().
create or replace function public.configuracao_publica()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select jsonb_build_object(
      'whatsapp', c.whatsapp,
      'cidade', c.cidade,
      'endereco', c.endereco,
      'instagram', c.instagram,
      'capa_url', c.capa_url,
      'avaliacao', c.avaliacao,
      'tempo_entrega', c.tempo_entrega,
      'tempo_retirada', c.tempo_retirada,
      'pedido_minimo', c.pedido_minimo,
      'entrega_gratis_acima', c.entrega_gratis_acima,
      'aceitar_pedidos_fechado', c.aceitar_pedidos_fechado,
      'aceita_pix', c.aceita_pix,
      'aceita_cartao', c.aceita_cartao,
      'aceita_dinheiro', c.aceita_dinheiro
    )
    from public.configuracoes c
    where c.unica
    limit 1
  ), '{}'::jsonb);
$$;

-- Valida um cupom SEM listar os cupons existentes.
-- Devolve { valido, codigo, tipo, valor, minimo, descricao, mensagem }.
create or replace function public.validar_cupom(p_codigo text, p_subtotal numeric default 0, p_tipo text default 'retirada')
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_codigo text := upper(btrim(coalesce(p_codigo, '')));
  c public.cupons%rowtype;
begin
  if v_codigo = '' then
    return jsonb_build_object('valido', false, 'mensagem', 'Digite o código do cupom.');
  end if;
  select * into c from public.cupons
   where codigo = v_codigo and ativo
     and (valido_ate is null or valido_ate >= (now() at time zone 'America/Sao_Paulo')::date);
  if not found then
    return jsonb_build_object('valido', false, 'mensagem', 'Cupom não encontrado. Confira o código.');
  end if;
  if coalesce(p_subtotal, 0) < c.minimo then
    return jsonb_build_object('valido', false, 'mensagem',
      'Este cupom vale para pedidos a partir de R$ ' || replace(to_char(c.minimo, 'FM999999990.00'), '.', ',') || '.');
  end if;
  if c.tipo = 'frete' and coalesce(p_tipo, 'entrega') <> 'entrega' then
    return jsonb_build_object('valido', false, 'mensagem', 'Este cupom é de entrega grátis — vale só para delivery.');
  end if;
  return jsonb_build_object('valido', true, 'codigo', c.codigo, 'tipo', c.tipo, 'valor', c.valor,
                            'minimo', c.minimo, 'descricao', c.descricao, 'mensagem', 'Cupom aplicado!');
end;
$$;

-- Cria o pedido de forma ATÔMICA, recalculando TUDO com os preços do banco.
-- Entrada (jsonb):
-- { "tipo": "retirada", "cliente_nome": "...", "cliente_telefone": "11900000000",
--   "bairro_id": "uuid", "rua": "...", "numero": "...", "complemento": "...", "referencia": "...",
--   "pagamento": "pix"|"cartao"|"dinheiro", "troco_para": 100, "cupom": "VILA10", "observacoes": "...",
--   "itens": [ { "produto_id": "uuid", "quantidade": 2, "opcionais": ["uuid", ...], "observacao": "..." } ] }
-- Saída: { id, numero, subtotal, taxa_entrega, frete_gratis, desconto, total, fora_do_horario, bairro, itens: [...] }
create or replace function public.criar_pedido(p jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  cfg           public.configuracoes%rowtype;
  v_tipo        text := coalesce(p->>'tipo', '');
  v_nome        text := btrim(coalesce(p->>'cliente_nome', ''));
  v_tel         text := regexp_replace(coalesce(p->>'cliente_telefone', ''), '\D', '', 'g');
  v_pag         text := coalesce(p->>'pagamento', '');
  v_rua         text := nullif(btrim(coalesce(p->>'rua', '')), '');
  v_num_end     text := nullif(btrim(coalesce(p->>'numero', '')), '');
  v_codigo      text := upper(btrim(coalesce(p->>'cupom', '')));
  v_troco       numeric(12,2);
  v_bairro_nome text;
  v_taxa        numeric(12,2) := 0;
  v_sub         numeric(12,2) := 0;
  v_desc        numeric(12,2) := 0;
  v_total       numeric(12,2);
  v_frete_gratis boolean := false;
  v_aberto      boolean;
  v_cupom       public.cupons%rowtype;
  v_item        jsonb;
  v_prod        public.produtos%rowtype;
  v_grupo       record;
  v_ids         uuid[];
  v_qtd         integer;
  v_unit        numeric(12,2);
  v_opcoes      jsonb;
  v_n           integer;
  v_itens       jsonb := '[]'::jsonb;
  v_pedido_id   uuid;
  v_numero      bigint;
begin
  select * into cfg from public.configuracoes where unica limit 1;

  -- Dados básicos -----------------------------------------------------
  if v_tipo <> 'retirada' then
    raise exception 'Este estabelecimento trabalha somente com retirada no local.';
  end if;
  if char_length(v_nome) < 2 or char_length(v_nome) > 80 then
    raise exception 'Informe seu nome.';
  end if;
  if v_tel <> '' and (length(v_tel) < 10 or length(v_tel) > 13) then
    raise exception 'Telefone incompleto. Use DDD + número.';
  end if;
  if v_pag not in ('pix', 'cartao', 'dinheiro')
     or (v_pag = 'pix' and not coalesce(cfg.aceita_pix, true))
     or (v_pag = 'cartao' and not coalesce(cfg.aceita_cartao, true))
     or (v_pag = 'dinheiro' and not coalesce(cfg.aceita_dinheiro, true)) then
    raise exception 'Forma de pagamento indisponível.';
  end if;
  if jsonb_typeof(p->'itens') is distinct from 'array' or jsonb_array_length(p->'itens') = 0 then
    raise exception 'Sua sacola está vazia.';
  end if;
  if jsonb_array_length(p->'itens') > 40 then
    raise exception 'Pedido com itens demais. Divida em dois pedidos.';
  end if;

  -- Itens: preço SEMPRE do banco ---------------------------------------
  for v_item in select value from jsonb_array_elements(p->'itens')
  loop
    v_qtd := coalesce((v_item->>'quantidade')::integer, 0);
    if v_qtd < 1 or v_qtd > 50 then
      raise exception 'Quantidade inválida na sacola.';
    end if;

    select pr.* into v_prod
      from public.produtos pr
      join public.categorias ca on ca.id = pr.categoria_id
     where pr.id = (v_item->>'produto_id')::uuid and pr.ativo and ca.ativo;
    if not found then
      raise exception 'Um item da sacola não está mais no cardápio. Atualize a página.';
    end if;
    if not v_prod.disponivel then
      raise exception '% está esgotado no momento. Tire da sacola para continuar.', v_prod.nome;
    end if;

    select coalesce(array_agg(distinct x::uuid), '{}')
      into v_ids
      from jsonb_array_elements_text(coalesce(v_item->'opcionais', '[]'::jsonb)) as x;

    -- toda opção precisa ser ativa e pertencer a um grupo ativo ligado ao produto
    select count(*) into v_n
      from public.opcionais o
      join public.grupos_opcionais g on g.id = o.grupo_id and g.ativo
      join public.produto_grupos pg on pg.grupo_id = g.id and pg.produto_id = v_prod.id
     where o.id = any(v_ids) and o.ativo;
    if v_n <> coalesce(array_length(v_ids, 1), 0) then
      raise exception 'Uma opção de % mudou. Edite o item na sacola.', v_prod.nome;
    end if;

    -- regras de cada grupo (obrigatório / escolha única / limite)
    for v_grupo in
      select g.titulo, g.tipo, g.obrigatorio, g.max_escolhas,
             (select count(*) from public.opcionais o where o.grupo_id = g.id and o.id = any(v_ids)) as marcados,
             exists (select 1 from public.opcionais o where o.grupo_id = g.id and o.ativo) as tem_opcoes
        from public.grupos_opcionais g
        join public.produto_grupos pg on pg.grupo_id = g.id
       where pg.produto_id = v_prod.id and g.ativo
    loop
      if v_grupo.obrigatorio and v_grupo.tem_opcoes and v_grupo.marcados = 0 then
        raise exception 'Escolha "%" em %.', v_grupo.titulo, v_prod.nome;
      end if;
      if v_grupo.tipo = 'unico' and v_grupo.marcados > 1 then
        raise exception 'Escolha só 1 opção de "%" em %.', v_grupo.titulo, v_prod.nome;
      end if;
      if v_grupo.tipo = 'multiplo' and v_grupo.max_escolhas is not null and v_grupo.marcados > v_grupo.max_escolhas then
        raise exception 'Escolha até % opções de "%" em %.', v_grupo.max_escolhas, v_grupo.titulo, v_prod.nome;
      end if;
    end loop;

    -- foto das escolhas (nome e preço no momento do pedido)
    select coalesce(jsonb_agg(jsonb_build_object('grupo', gr.titulo, 'itens', gr.itens) order by gr.ordem_pg, gr.ordem_g), '[]'::jsonb)
      into v_opcoes
      from (
        select g.titulo, pg.ordem as ordem_pg, g.ordem as ordem_g,
               jsonb_agg(jsonb_build_object('nome', o.nome, 'preco', o.preco) order by o.ordem, o.nome) as itens
          from public.opcionais o
          join public.grupos_opcionais g on g.id = o.grupo_id
          join public.produto_grupos pg on pg.grupo_id = g.id and pg.produto_id = v_prod.id
         where o.id = any(v_ids)
         group by g.id, g.titulo, pg.ordem, g.ordem
      ) gr;

    v_unit := v_prod.preco + coalesce((select sum(o.preco) from public.opcionais o where o.id = any(v_ids)), 0);
    v_sub  := v_sub + v_unit * v_qtd;
    v_itens := v_itens || jsonb_build_array(jsonb_build_object(
      'produto_id', v_prod.id,
      'nome', v_prod.nome,
      'quantidade', v_qtd,
      'preco_unitario', v_unit,
      'opcoes', v_opcoes,
      'observacao', nullif(left(btrim(coalesce(v_item->>'observacao', '')), 140), ''),
      'total', v_unit * v_qtd
    ));
  end loop;

  -- Entrega -------------------------------------------------------------
  if v_tipo = 'entrega' then
    select b.nome, b.taxa into v_bairro_nome, v_taxa
      from public.bairros b
     where b.id = nullif(p->>'bairro_id', '')::uuid and b.ativo;
    if v_bairro_nome is null then
      raise exception 'Escolha um bairro de entrega.';
    end if;
    if v_rua is null then raise exception 'Informe a rua.'; end if;
    if v_num_end is null then raise exception 'Informe o número (ou "s/n").'; end if;
    if coalesce(cfg.pedido_minimo, 0) > 0 and v_sub < cfg.pedido_minimo then
      raise exception 'Pedido mínimo para entrega: R$ %.', replace(to_char(cfg.pedido_minimo, 'FM999999990.00'), '.', ',');
    end if;
    if coalesce(cfg.entrega_gratis_acima, 0) > 0 and v_sub >= cfg.entrega_gratis_acima then
      v_frete_gratis := true;
    end if;
  end if;

  -- Cupom (validado de novo aqui) ---------------------------------------
  if v_codigo <> '' then
    select * into v_cupom from public.cupons
     where codigo = v_codigo and ativo
       and (valido_ate is null or valido_ate >= (now() at time zone 'America/Sao_Paulo')::date);
    if not found then
      raise exception 'O cupom % não é mais válido. Remova-o e tente de novo.', v_codigo;
    end if;
    if v_sub < v_cupom.minimo then
      raise exception 'O cupom % vale a partir de R$ %.', v_codigo, replace(to_char(v_cupom.minimo, 'FM999999990.00'), '.', ',');
    end if;
    if v_cupom.tipo = 'frete' and v_tipo <> 'entrega' then
      raise exception 'O cupom % é de entrega grátis — vale só para delivery.', v_codigo;
    end if;
    if v_cupom.tipo = 'percentual' then
      v_desc := round(v_sub * v_cupom.valor / 100, 2);
    elsif v_cupom.tipo = 'valor' then
      v_desc := least(v_cupom.valor, v_sub);
    else
      v_frete_gratis := true;
    end if;
  end if;

  if v_frete_gratis then v_taxa := 0; end if;
  v_total := greatest(0, v_sub - v_desc + v_taxa);

  -- Horário de funcionamento ---------------------------------------------
  v_aberto := public.loja_aberta();
  if not v_aberto and not coalesce(cfg.aceitar_pedidos_fechado, true) then
    raise exception 'Estamos fechados agora. Confira o horário de funcionamento.';
  end if;

  -- Troco ------------------------------------------------------------------
  if v_pag = 'dinheiro' and nullif(p->>'troco_para', '') is not null then
    v_troco := (p->>'troco_para')::numeric;
    if v_troco < v_total then
      raise exception 'O troco precisa ser para um valor maior que o total (R$ %).', replace(to_char(v_total, 'FM999999990.00'), '.', ',');
    end if;
  end if;

  -- Grava ---------------------------------------------------------------------
  insert into public.pedidos (tipo, cliente_nome, cliente_telefone, bairro, rua, numero_endereco, complemento, referencia,
                              pagamento, troco_para, cupom, subtotal, taxa_entrega, desconto, total, observacoes, fora_do_horario)
  values (v_tipo, v_nome, nullif(v_tel, ''),
          case when v_tipo = 'entrega' then v_bairro_nome end,
          case when v_tipo = 'entrega' then left(v_rua, 120) end,
          case when v_tipo = 'entrega' then left(v_num_end, 20) end,
          case when v_tipo = 'entrega' then nullif(left(btrim(coalesce(p->>'complemento', '')), 80), '') end,
          case when v_tipo = 'entrega' then nullif(left(btrim(coalesce(p->>'referencia', '')), 120), '') end,
          v_pag, v_troco, nullif(v_codigo, ''), v_sub, v_taxa, v_desc, v_total,
          nullif(left(btrim(coalesce(p->>'observacoes', '')), 200), ''), not v_aberto)
  returning id, numero into v_pedido_id, v_numero;

  insert into public.pedido_itens (pedido_id, produto_id, nome, quantidade, preco_unitario, opcoes, observacao, total)
  select v_pedido_id, (e->>'produto_id')::uuid, e->>'nome', (e->>'quantidade')::integer, (e->>'preco_unitario')::numeric,
         e->'opcoes', e->>'observacao', (e->>'total')::numeric
    from jsonb_array_elements(v_itens) as e;

  return jsonb_build_object(
    'id', v_pedido_id, 'numero', v_numero, 'subtotal', v_sub, 'taxa_entrega', v_taxa, 'frete_gratis', v_frete_gratis,
    'desconto', v_desc, 'total', v_total, 'fora_do_horario', not v_aberto, 'bairro', v_bairro_nome, 'itens', v_itens
  );
end;
$$;

-- Permissões das funções: o visitante (anon) só executa as 4 funções públicas.
revoke execute on function public.loja_aberta(timestamptz) from public;
revoke execute on function public.configuracao_publica() from public;
revoke execute on function public.validar_cupom(text, numeric, text) from public;
revoke execute on function public.criar_pedido(jsonb) from public;
grant execute on function public.loja_aberta(timestamptz) to anon, authenticated;
grant execute on function public.configuracao_publica() to anon, authenticated;
grant execute on function public.validar_cupom(text, numeric, text) to anon, authenticated;
grant execute on function public.criar_pedido(jsonb) to anon, authenticated;

-- =====================================================================
-- REALTIME: o painel recebe os pedidos novos na hora (com aviso sonoro)
-- =====================================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pedidos') then
    alter publication supabase_realtime add table public.pedidos;
  end if;
end $$;

-- =====================================================================
-- STORAGE: bucket "produtos" para as fotos enviadas pelo painel
-- Leitura pública (as fotos aparecem no cardápio); só a equipe logada envia/apaga.
-- (Se o schema "storage" não existir — ex.: validação local — este bloco é ignorado.)
-- =====================================================================
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('produtos', 'produtos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
    on conflict (id) do update set public = true,
                                   file_size_limit = excluded.file_size_limit,
                                   allowed_mime_types = excluded.allowed_mime_types;

    execute 'drop policy if exists "produtos_fotos_select_equipe" on storage.objects';
    execute 'create policy "produtos_fotos_select_equipe" on storage.objects for select to authenticated using (bucket_id = ''produtos'')';
    execute 'drop policy if exists "produtos_fotos_insert_equipe" on storage.objects';
    execute 'create policy "produtos_fotos_insert_equipe" on storage.objects for insert to authenticated with check (bucket_id = ''produtos'')';
    execute 'drop policy if exists "produtos_fotos_update_equipe" on storage.objects';
    execute 'create policy "produtos_fotos_update_equipe" on storage.objects for update to authenticated using (bucket_id = ''produtos'') with check (bucket_id = ''produtos'')';
    execute 'drop policy if exists "produtos_fotos_delete_equipe" on storage.objects';
    execute 'create policy "produtos_fotos_delete_equipe" on storage.objects for delete to authenticated using (bucket_id = ''produtos'')';
  end if;
end $$;
