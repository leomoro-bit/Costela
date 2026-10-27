-- =====================================================================
-- MIGRAÇÃO VISUAL/DEMO — COSTELA SANTO ANTÔNIO
-- Rode no SQL Editor do Supabase atual, depois de fazer backup dos dados.
--
-- ATENÇÃO: script de demonstração. Atualiza a linha de marca e converte
-- os IDs fixos do cardápio de exemplo (Sabor da Vila) para os seis itens
-- da Costela Santo Antônio. Faça backup e não rode em um restaurante que
-- já tenha produtos reais cadastrados.
-- Não apaga o histórico de pedidos e preserva um WhatsApp real já salvo.
-- =====================================================================

begin;

-- Marca e configurações -------------------------------------------------
update public.configuracoes
set nome_negocio = 'Costela Santo Antônio',
    nome_exibicao = 'Costela Santo Antônio',
    subtitulo = 'O melhor antídoto para a “fobia de segunda-feira” é uma boa costela no domingo.',
    cidade = 'Campos Novos - SC',
    endereco = 'Santo Antônio, Campos Novos - SC',
    whatsapp = case when whatsapp = '5511900000000' then null else whatsapp end,
    instagram = case when lower(coalesce(instagram, '')) = 'sabordavila' then null else instagram end,
    cor_primaria = '#D5A23A',
    cor_destaque = '#D5A23A',
    fonte = 'elegante',
    raio = 'medio',
    tema_padrao = 'escuro',
    logo_url = null,
    capa_url = 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=85&auto=format&fit=crop',
    avaliacao = null,
    tempo_retirada = '10h30 às 14h30',
    pedido_minimo = 0,
    entrega_gratis_acima = 0,
    chave_pix = case when chave_pix = 'pix@sabordavila.exemplo' then null else chave_pix end
where unica = true;

-- Categorias com IDs estáveis para permitir reexecutar sem duplicação --
insert into public.categorias (id, nome, ordem, ativo)
values
  (md5('seed:categoria:lanches')::uuid, 'Costela Assada', 1, true),
  (md5('seed:categoria:pratos')::uuid, 'Acompanhamentos', 2, true),
  (md5('seed:categoria:bebidas')::uuid, 'Bebidas', 3, true)
on conflict (id) do update set nome = excluded.nome, ordem = excluded.ordem, ativo = true;

-- Oculta categorias do cardápio anterior, mas preserva seus registros.
update public.categorias set ativo = false
where id in (
  md5('seed:categoria:pizzas')::uuid,
  md5('seed:categoria:porcoes')::uuid,
  md5('seed:categoria:sobremesas')::uuid
);

-- Produtos não usados no cardápio novo ficam ocultos, não são apagados.
update public.produtos set ativo = false
where id in (
  md5('seed:produto:frango-requeijao')::uuid,
  md5('seed:produto:quatro-queijos')::uuid,
  md5('seed:produto:penne-sugo')::uuid,
  md5('seed:produto:espetinhos')::uuid,
  md5('seed:produto:bowl-salmao')::uuid,
  md5('seed:produto:salada-vila')::uuid,
  md5('seed:produto:fritas')::uuid,
  md5('seed:produto:rustica')::uuid,
  md5('seed:produto:brownie')::uuid,
  md5('seed:produto:bolo-trufado')::uuid,
  md5('seed:produto:torta-frutas')::uuid,
  md5('seed:produto:pote-morango')::uuid,
  md5('seed:produto:suco')::uuid,
  md5('seed:produto:cha-gelado')::uuid,
  md5('seed:produto:refri-lata')::uuid,
  md5('seed:produto:caipirinha')::uuid
);

-- Limpa os opcionais ligados aos seis IDs de demonstração reaproveitados.
delete from public.produto_grupos
where produto_id in (
  md5('seed:produto:vila-smash')::uuid,
  md5('seed:produto:x-classico')::uuid,
  md5('seed:produto:bacon-fritas')::uuid,
  md5('seed:produto:combo-casal')::uuid,
  md5('seed:produto:margherita')::uuid,
  md5('seed:produto:pepperoni')::uuid
);

-- Seis itens exibidos no exemplo visual --------------------------------
insert into public.produtos
  (id, categoria_id, nome, descricao, preco, preco_antigo, foto_url, selo, disponivel, ativo, ordem)
values
  (md5('seed:produto:vila-smash')::uuid, md5('seed:categoria:lanches')::uuid,
   'Costela Assada Inteira', 'Costela assada lentamente no fogo de chão. Inteira (3 a 4 kg).',
   149.00, null, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=85&auto=format&fit=crop', 'mais-pedido', true, true, 1),
  (md5('seed:produto:x-classico')::uuid, md5('seed:categoria:lanches')::uuid,
   'Costela Assada Meia', 'Meia costela bovina assada lentamente. Ideal para 2 pessoas.',
   79.00, null, 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800&q=85&auto=format&fit=crop', null, true, true, 2),
  (md5('seed:produto:bacon-fritas')::uuid, md5('seed:categoria:pratos')::uuid,
   'Maionese Caseira', 'Maionese caseira cremosa com legumes frescos. Pote de 500 g.',
   12.00, null, 'https://images.unsplash.com/photo-1547592180-85f173990554?w=800&q=85&auto=format&fit=crop', null, true, true, 1),
  (md5('seed:produto:combo-casal')::uuid, md5('seed:categoria:pratos')::uuid,
   'Pão de Alho', 'Pão de alho artesanal, crocante por fora e macio por dentro.',
   9.00, null, 'https://images.unsplash.com/photo-1608198093002-ad4e005484c2?w=800&q=85&auto=format&fit=crop', null, true, true, 2),
  (md5('seed:produto:margherita')::uuid, md5('seed:categoria:bebidas')::uuid,
   'Refrigerante 2L', 'Refrigerante 2 litros. Informe o sabor nas observações do pedido.',
   10.00, null, 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=800&q=85&auto=format&fit=crop', null, true, true, 1),
  (md5('seed:produto:pepperoni')::uuid, md5('seed:categoria:bebidas')::uuid,
   'Água Mineral 500ml', 'Água mineral sem gás, garrafa de 500 ml.',
   3.00, null, 'https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=800&q=85&auto=format&fit=crop', null, true, true, 2)
on conflict (id) do update set
  categoria_id = excluded.categoria_id,
  nome = excluded.nome,
  descricao = excluded.descricao,
  preco = excluded.preco,
  preco_antigo = excluded.preco_antigo,
  foto_url = excluded.foto_url,
  selo = excluded.selo,
  disponivel = excluded.disponivel,
  ativo = true,
  ordem = excluded.ordem;

-- Horário de domingo: 10h30–14h30. Mantém horários personalizados não seed.
delete from public.horarios
where id in (
  md5('seed:horario:0:1')::uuid, md5('seed:horario:0:2')::uuid,
  md5('seed:horario:2:1')::uuid, md5('seed:horario:2:2')::uuid,
  md5('seed:horario:3:1')::uuid, md5('seed:horario:3:2')::uuid,
  md5('seed:horario:4:1')::uuid, md5('seed:horario:4:2')::uuid,
  md5('seed:horario:5:1')::uuid, md5('seed:horario:5:2')::uuid,
  md5('seed:horario:6:1')::uuid, md5('seed:horario:6:2')::uuid
);
insert into public.horarios (id, dia_semana, abre, fecha)
values (md5('seed:horario:0:1')::uuid, 0, '11:30', '13:30')
on conflict (id) do update set dia_semana = excluded.dia_semana, abre = excluded.abre, fecha = excluded.fecha;

-- Oculta apenas os bairros fictícios do seed anterior. Quando não há áreas ativas,
-- o checkout passa a oferecer somente retirada; áreas reais podem ser cadastradas no painel.
update public.bairros set ativo = false
where id in (
  md5('seed:bairro:Vila Nova')::uuid,
  md5('seed:bairro:Centro')::uuid,
  md5('seed:bairro:Jardim das Flores')::uuid,
  md5('seed:bairro:Bela Vista')::uuid,
  md5('seed:bairro:Parque Industrial')::uuid
);

-- Desativa cupons demonstrativos que citavam o restaurante antigo.
update public.cupons set ativo = false where codigo in ('VILA10', 'BEMVINDO', 'FRETEGRATIS');

commit;
