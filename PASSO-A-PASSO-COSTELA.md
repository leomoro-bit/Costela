# Passo a passo — publicar o visual Costela Santo Antônio

Este pacote mantém o projeto Next.js + Supabase que já existia. Não é um HTML independente: publique a pasta do projeto com `package.json` na raiz do deploy.

## 1. Faça uma cópia de segurança

Antes de alterar dados, exporte/guarde seu projeto atual e, no Supabase, faça um backup da base usada pelo app.

## 2. Atualize o Supabase

Abra o painel do Supabase → **SQL Editor**.

- **Banco atual com o exemplo “Sabor da Vila”**: abra `supabase/migracao-costela-santo-antonio.sql`, copie o arquivo inteiro, cole em uma query e clique em **Run**.
- **Banco novo, ainda sem tabelas**: rode primeiro `supabase/schema.sql`; depois rode `supabase/seed.sql` para criar os seis produtos de demonstração.
- **Banco com produtos/pedidos reais**: não rode os scripts de demonstração. Eles destinam-se ao catálogo fictício e alteram a marca e os produtos identificados pelos IDs de exemplo.
- Depois de aplicar o schema/migração anterior, execute também `supabase/retirada-e-configurar-site.sql`. Ela mantém os dados existentes, neutraliza as regras antigas de entrega e instala uma proteção no banco para não aceitar novos pedidos de entrega.

A migração de demonstração preserva o histórico de pedidos e preserva o telefone de WhatsApp se ele já for real; o telefone fictício do exemplo é limpo. A tabela `public.configuracoes` já é usada para as configurações do site; preços, descrições e fotos dos produtos ficam na tabela `public.produtos`, então não criamos tabelas duplicadas para a mesma finalidade.

## 3. Configure o WhatsApp real

Entre no aplicativo como administrador → **Configurar site**. O botão reúne os atalhos para:

- **Cores, escrita e logotipo:** nome exibido, subtítulo, cores, fonte e logo.
- **WhatsApp e informações:** número que recebe pedidos, foto de capa (envio de arquivo ou link), endereço de retirada, cidade e formas de pagamento.
- **Fotos, nomes e preços dos itens:** produtos, descrições, imagens e preços do cardápio.
- **Horários de funcionamento:** dias e horários de atendimento.

O sistema aceita exclusivamente **retirada no local**. A opção de entrega foi removida da sacola e há uma proteção no servidor e no banco para rejeitar pedidos de entrega.

## 4. Publique na Vercel

1. Extraia `app-cardapio-digital-costela-retirada-configuravel.zip`.
2. Abra a pasta `cardapio-digital`; é nela que ficam `package.json`, `app/`, `components/`, `lib/` e `supabase/`.
3. Envie o conteúdo atualizado usando o mesmo método de publicação que já funcionou no seu projeto. Confirme que `package.json` ficou na raiz do projeto publicado, não dentro de uma pasta duplicada.
4. Preserve as variáveis de ambiente já configuradas na Vercel: `NEXT_PUBLIC_SUPABASE_URL` e a chave pública `NEXT_PUBLIC_SUPABASE_ANON_KEY` ou `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Não coloque chaves `service_role` no navegador nem no ZIP.
5. Conclua o deploy e abra o domínio publicado.

## 5. Confira as telas

- `/` — cardápio público, produtos, carrinho e envio pelo WhatsApp.
- `/login` — entrada do dono.
- `/painel/cardapio` — cadastro e disponibilidade dos produtos.
- `/painel/configurar-site` — ponto central para todas as alterações.
- `/painel/configuracoes` — WhatsApp, capa e dados da loja.
- `/painel/personalizacao` — cores, logotipo, fonte e textos.
- `/painel/cardapio` — fotos, nomes, descrições e preços dos produtos.

Se a página abrir em tema claro porque o navegador guardou essa preferência anteriormente, use o controle de tema no canto superior para ativar o escuro. A preferência fica salva nesse navegador.

## O que foi alterado

- identidade visual preto/carvão + dourado e tema escuro padrão;
- brasão SVG de contingência para a marca Costela Santo Antônio, caso não exista logo enviada;
- capa “Véspera de Segunda”, com funcionamento, retirada e horário limite do pedido;
- cartões de produtos com foto à esquerda e ação visual de adicionar;
- fotos dos produtos no resumo da sacola;
- retirada no local como única modalidade de pedido;
- botão central “Configurar site” para cores, textos, WhatsApp, fotos e preços;
- migração SQL para impedir novos pedidos de entrega, preservando pedidos antigos;
- SQL de exemplo para os seis itens mostrados na referência.

O build completo não foi executado neste ambiente porque o acesso ao registro npm falhou por DNS; os arquivos TypeScript/TSX modificados passaram pela verificação de sintaxe disponível. A Vercel ainda precisa instalar as dependências e compilar o projeto no deploy.
