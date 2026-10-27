-- =====================================================================
-- COSTELA SANTO ANTÔNIO — retirada exclusiva e configurações editáveis
-- Execute este arquivo no SQL Editor do Supabase DEPOIS do schema.sql.
-- É seguro executar novamente. Não apaga produtos, categorias nem pedidos antigos.
-- =====================================================================

-- A tabela configuracoes já é a fonte oficial para cores, textos, capa, logo,
-- endereço e WhatsApp. Os preços, descrições e fotos de cada produto ficam em produtos.
create table if not exists public.configuracoes (
  id uuid primary key default gen_random_uuid(),
  unica boolean not null default true unique check (unica),
  nome_negocio text not null default 'Costela Santo Antônio',
  whatsapp text,
  cidade text,
  endereco text,
  instagram text,
  cor_primaria text not null default '#D5A23A',
  mensagem_whatsapp text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.configuracoes add column if not exists nome_exibicao text;
alter table public.configuracoes add column if not exists subtitulo text;
alter table public.configuracoes add column if not exists logo_url text;
alter table public.configuracoes add column if not exists capa_url text;
alter table public.configuracoes add column if not exists cor_destaque text not null default '#D5A23A';
alter table public.configuracoes add column if not exists fonte text not null default 'elegante';
alter table public.configuracoes add column if not exists raio text not null default 'medio';
alter table public.configuracoes add column if not exists tema_padrao text not null default 'escuro';
alter table public.configuracoes add column if not exists avaliacao text;
alter table public.configuracoes add column if not exists tempo_entrega text not null default 'Somente retirada';
alter table public.configuracoes add column if not exists tempo_retirada text not null default '30–45 min';
alter table public.configuracoes add column if not exists pedido_minimo numeric(12,2) not null default 0;
alter table public.configuracoes add column if not exists entrega_gratis_acima numeric(12,2) not null default 0;
alter table public.configuracoes add column if not exists aceitar_pedidos_fechado boolean not null default true;
alter table public.configuracoes add column if not exists aceita_pix boolean not null default true;
alter table public.configuracoes add column if not exists aceita_cartao boolean not null default true;
alter table public.configuracoes add column if not exists aceita_dinheiro boolean not null default true;
alter table public.configuracoes add column if not exists chave_pix text;
alter table public.configuracoes add column if not exists som_novo_pedido boolean not null default true;

insert into public.configuracoes (unica, nome_negocio, cor_primaria, cor_destaque, tema_padrao, tempo_entrega, pedido_minimo, entrega_gratis_acima)
values (true, 'Costela Santo Antônio', '#D5A23A', '#D5A23A', 'escuro', 'Somente retirada', 0, 0)
on conflict (unica) do update set
  tempo_entrega = 'Somente retirada',
  pedido_minimo = 0,
  entrega_gratis_acima = 0;

-- Proteção adicional no banco: impede inserir ou alterar um pedido para entrega.
-- Pedidos antigos permanecem no histórico; atualização de status não é bloqueada.
create or replace function public.impedir_entrega_somente_retirada()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if lower(coalesce(new.tipo::text, '')) = 'entrega' then
    raise exception 'Este estabelecimento trabalha somente com retirada no local.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_pedidos_somente_retirada on public.pedidos;
create trigger trg_pedidos_somente_retirada
before insert or update of tipo on public.pedidos
for each row execute function public.impedir_entrega_somente_retirada();

-- Desliga regras antigas de entrega sem remover bairros/histórico do banco.
update public.configuracoes
set tempo_entrega = 'Somente retirada', pedido_minimo = 0, entrega_gratis_acima = 0
where unica = true;

update public.configuracoes
set tempo_retirada = '30–45 min'
where unica = true and tempo_retirada = '10h30 às 14h30';
