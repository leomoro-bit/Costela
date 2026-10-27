# Cardápio Digital — Next.js + Supabase

Cardápio online com tema Brasa (preto e dourado), baseado no exemplo visual **Costela Santo Antônio**. O código continua permitindo personalizar a marca pelo painel.
O **cliente final** abre o link (ou lê um QR Code), monta o pedido e ele chega **organizado no WhatsApp** do restaurante — e também fica **registrado no painel**, com aviso sonoro em tempo real.

Duas áreas no mesmo site:

| Área | Endereço | Quem usa |
|---|---|---|
| **Cardápio público** (sem login) | `/` | O cliente final |
| **Painel** (com login) | `/painel` | O dono e a equipe |

**Cardápio público:** status "Aberto agora / Fechado" pelo horário · categorias com abas que acompanham a rolagem · busca · janela do produto com opcionais (obrigatórios, escolha única, limite de escolhas) e observação · sacola salva no aparelho do cliente · somente retirada no local · cupom de desconto · Pix/cartão/dinheiro com troco · pedido registrado no banco com número sequencial → WhatsApp com a mensagem pronta · "Meus pedidos" com "Pedir de novo" · Informações (horários, endereço para retirada e pagamentos).

**Painel:** Pedidos (tempo real + aviso sonoro, status novo → preparando → pronto para retirada → retirado/cancelado, WhatsApp para o cliente, impressão da comanda com a logo) · Cardápio (categorias e produtos, fotos por link ou upload, esgotado com 1 toque) · Opcionais · Cupons · Horários · **Configurar site** (atalhos para cores, textos, fotos, WhatsApp e preços sem mexer no código). O estabelecimento aceita somente retirada no local.

**Tabelas:** `configuracoes`, `categorias`, `produtos`, `grupos_opcionais`, `opcionais`, `produto_grupos`, `bairros`, `cupons`, `horarios`, `pedidos`, `pedido_itens` (+ buckets `produtos` — fotos dos pratos — e `marca` — logo — no Storage).

---

## Segurança (o que o visitante consegue fazer)

Tudo com RLS (Row Level Security) no banco:

- **Equipe logada** lê e edita tudo.
- **Visitante anônimo** só **lê** categorias, produtos e opcionais **ativos** e horários. Os dados públicos necessários ao cardápio (WhatsApp, endereço de retirada e pagamentos) vêm pela função `configuracao_publica()` e a marca (nome exibido, frase de apresentação, logo, cores, fonte) pela função `marca_publica()` — a tabela `configuracoes` inteira **não** fica exposta. A logo fica na pasta pública `marca` do Storage (só a equipe logada envia/troca).
- Cupons **não** são listados: o cliente só confere um código pela função `validar_cupom()`.
- O pedido entra **só** pela função `criar_pedido()`, que **recalcula preços, opcionais, descontos e total com os valores do banco** (o preço enviado pelo navegador é ignorado), aceita somente retirada e devolve o número do pedido. O visitante não consegue ler nem alterar pedidos.

Funções SQL (em `supabase/schema.sql`): `loja_aberta()`, `configuracao_publica()`, `marca_publica()`, `validar_cupom(codigo, subtotal, tipo)`, `criar_pedido(jsonb)`.

---

## Mapa de telas (URLs)

Troque `seu-app.vercel.app` pelo endereço do seu projeto na Vercel.

| Endereço | O que é | Acesso |
|---|---|---|
| `seu-app.vercel.app` | Cardápio para o cliente: sacola e pedido pelo WhatsApp (divulgue este link) | 🌐 Pública |
| `seu-app.vercel.app/painel` | Pedidos recebidos ao vivo (com aviso sonoro) e mudança de status | 🔒 Login |
| `seu-app.vercel.app/painel/cardapio` | Categorias, produtos, fotos e preços | 🔒 Login |
| `seu-app.vercel.app/painel/opcionais` | Adicionais e opcionais (tamanho, borda, extras) | 🔒 Login |
| `seu-app.vercel.app/painel/cupons` | Cupons de desconto | 🔒 Login |
| `seu-app.vercel.app/painel/horarios` | Horário de funcionamento (aberto/fechado) | 🔒 Login |
| `seu-app.vercel.app/painel/configurar-site` | Atalhos para editar site, textos, fotos, WhatsApp e preços | 🔒 Login |
| `seu-app.vercel.app/painel/configuracoes` | Dados do negócio, WhatsApp e retirada | 🔒 Login |
| `seu-app.vercel.app/painel/personalizacao` | Logo, cores, fonte e nome — sem código | 🔒 Login |
| `seu-app.vercel.app/login` | Entrar no app (e-mail e senha criados no Supabase) | 🌐 Pública |
| `seu-app.vercel.app/redefinir-senha` | Criar senha nova (aberto pelo link do e-mail "Esqueci minha senha") | 🌐 Pública |
| `seu-app.vercel.app/configurar-ambiente` | Aparece sozinha quando faltam as variáveis do Supabase na Vercel | 🌐 Pública |

`[id]` e `[código]` são preenchidos pelo próprio app — os links completos saem prontos nos botões "Copiar link" e de WhatsApp. **Pública** = abre sem login (pode mandar para o cliente final); **Login** = só a equipe, depois de entrar.


## Passo a passo (do zero ao ar)

Você vai precisar de contas gratuitas em: [supabase.com](https://supabase.com), [github.com](https://github.com) e [vercel.com](https://vercel.com).

### 1. Criar o projeto no Supabase
1. Entre no Supabase ▸ **New project**.
2. Dê um nome (ex.: `cardapio-costela-santo-antonio`), crie uma senha forte para o banco (guarde-a) e escolha a região **South America (São Paulo)**.
3. Aguarde uns 2 minutos até o projeto ficar pronto.

> Dica: crie **um projeto Supabase por cliente**. Assim os dados de cada negócio ficam separados.

### 2. Criar as tabelas (schema.sql)
1. No menu lateral, abra **SQL Editor** ▸ **New query**.
2. Abra o arquivo [`supabase/schema.sql`](supabase/schema.sql), copie **tudo** e cole no editor.
3. Clique em **Run**. Deve aparecer "Success. No rows returned".

O script também cria os buckets **`produtos`** (fotos enviadas pelo painel) e **`marca`** (logo do restaurante) e liga o **Realtime** da tabela de pedidos. Pode rodar de novo sem medo: não apaga dados.

### 3. (Opcional) Dados de exemplo (seed.sql)
Para aplicar o cardápio demonstrativo da **Costela Santo Antônio** (seis produtos, identidade preta e dourada e funcionamento aos domingos): depois do schema, rode [`supabase/seed.sql`](supabase/seed.sql) no SQL Editor do Supabase. O script é para ambiente demonstrativo e altera a marca e os produtos de exemplo; faça backup antes de usá-lo em um banco já utilizado.
Para um banco que já usava o cardápio de demonstração antigo, use `supabase/migracao-costela-santo-antonio.sql` em vez de rodar o seed. Não rode os dois em sequência. Para um restaurante com dados reais, não execute nenhum script de demonstração; personalize pelo painel.

### 4. Criar o usuário de acesso ao painel
1. **Authentication ▸ Users ▸ Add user ▸ Create new user**.
2. Informe e-mail e senha e marque **Auto Confirm User**.
3. Repita para cada pessoa da equipe. Todos os usuários logados veem e editam os mesmos dados.

### 5. Desligar o cadastro público
**Authentication ▸ Sign In / Providers** (ou *Settings*) ▸ desmarque **Allow new users to sign up** ▸ **Save**.
Assim ninguém de fora consegue criar conta no painel. (O cardápio continua público — ele não precisa de conta.)

### 6. Subir o código no GitHub
1. No GitHub, **New repository** (pode ser privado).
2. Envie os arquivos desta pasta (GitHub Desktop, VS Code ou arrastando em *uploading an existing file*).
   Não envie `node_modules` nem `.env.local` (o `.gitignore` já cuida disso).

### 7. Importar na Vercel
Vercel ▸ **Add New ▸ Project** ▸ escolha o repositório ▸ ainda **não** clique em Deploy.

### 8. Colar as 2 variáveis de ambiente
Em **Environment Variables**:

| Nome | Onde achar no Supabase |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings ▸ API (ou botão **Connect**) ▸ *Project URL* |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Mesma tela ▸ chave **anon public** (ou **publishable**, `sb_publishable_...`) |

Se o projeto só mostrar a chave *publishable*, pode usar o nome `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` no lugar da anon.
**Nunca** use a chave `service_role` / `secret`.

### 9. Deploy
Clique em **Deploy**. Em 1–2 minutos o cardápio está no ar em `https://seu-projeto.vercel.app` e o painel em `https://seu-projeto.vercel.app/painel`.
Se aparecer "Configure as variáveis de ambiente", confira os nomes/valores e faça **Redeploy**.

**Para o "Esqueci minha senha" funcionar:** Supabase ▸ **Authentication ▸ URL Configuration**:
- **Site URL:** o endereço da Vercel
- **Redirect URLs:** `https://seu-projeto.vercel.app/**` (e `http://localhost:3000/**` para testes locais)

**Divulgar:** gere um QR Code do link principal (sites gratuitos fazem isso) para mesas, balcão e panfletos, e coloque o link no Instagram e no Google.

### 10. Rodar no seu computador (opcional)
Precisa do [Node.js](https://nodejs.org) 20 ou mais novo.
```bash
npm install
cp .env.example .env.local   # no Windows: copy .env.example .env.local
# edite .env.local com a URL e a chave do Supabase
npm run dev
```
Cardápio: http://localhost:3000 · Painel: http://localhost:3000/painel

---

## Como o dono usa no dia a dia
1. Deixe a tela **Pedidos** aberta no computador/tablet do balcão. Toque uma vez na tela para liberar o som: cada pedido novo **aparece sozinho e toca um aviso**.
2. Avance o status (Começar preparo → Pronto para retirada → Retirado) e use o botão **WhatsApp** para avisar o cliente (a mensagem já vem pronta, com a chave Pix quando for o caso).
3. Acabou um prato? Em **Cardápio**, desmarque **Disponível** (aparece "Esgotado" para o cliente).
4. Promoção? Crie um cupom em **Cupons** e divulgue o código.

## Personalizar sem código (logo, cores e fonte)
A marca do restaurante se troca **dentro do próprio painel**, sem mexer em código: menu ▸ **Configurar site** ▸ **Cores, escrita e logotipo** (`/painel/personalizacao`). Ela vale no **cardápio do cliente** (`/`), no painel, na tela de login, na **comanda impressa** e no ícone da aba do navegador.

1. **Logo:** clique em **Enviar logo** (PNG, JPG, SVG ou WebP até 1 MB; quadrada e com fundo transparente fica melhor). Ela aparece no topo do cardápio, no menu do painel, no topo do celular, na tela de login, na comanda impressa (pequena, em preto e branco) e no ícone da aba. Sem logo, o app mostra as iniciais do nome.
2. **Cores:** escolha uma das 9 paletas prontas com 1 clique (a primeira, **Brasa**, usa preto e dourado) ou monte a sua: a **cor principal** pinta o menu, os links e os botões do painel; a **cor de destaque** pinta os botões de ação do cardápio (**Adicionar**, **Enviar pedido**) e os selos. Dá para usar o seletor ou digitar o código `#RRGGBB`. O app calcula sozinho a cor do texto (branco ou preto) e avisa se a combinação ficar difícil de ler.
3. **Fonte:** **Padrão do cardápio** (Fraunces + DM Sans), Moderna, Elegante, Amigável, Clássica, Técnica ou Divertida.
4. **Nome exibido** (vazio = usa o nome do negócio das Configurações) e **subtítulo** — a *frase de apresentação* que aparece embaixo do nome no cardápio (ex.: "Restaurante & Delivery · Comida caseira"); **tema padrão** (claro, escuro ou seguir o sistema — cada pessoa ainda pode trocar no botão de sol/lua) e **arredondamento** dos cantos.
5. Confira na **Prévia ao vivo** (painel e login, claro e escuro) e clique em **Salvar**. Abra o cardápio (botão **Ver cardápio** no topo) para ver o resultado. Mudou de ideia? **Restaurar padrão** volta à paleta Brasa, à fonte padrão e remove a logo personalizada.

> A logo fica no Supabase ▸ **Storage** ▸ pasta `marca` (criada pelo `schema.sql`). Se aparecer "A pasta de arquivos marca não existe", rode o `schema.sql` de novo.
> WhatsApp, endereço para retirada, foto de capa, tempo estimado de retirada e formas de pagamento continuam em **Configurar site ▸ WhatsApp e informações**.

## Recuperação de senha
Na tela de login, **Esqueci minha senha** envia um e-mail com link para `/redefinir-senha`.
- O e-mail padrão do Supabase tem limite de poucos envios por hora. Para uso real, configure SMTP próprio em **Authentication ▸ Emails ▸ SMTP Settings**.
- Para o link funcionar em qualquer navegador, troque o link do template **Reset Password** por:
  `{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=recovery&next=/redefinir-senha`

## Personalizar com IA
Abra a pasta no [Claude Code](https://claude.com/claude-code) (ou cole os arquivos no Claude) e peça, por exemplo:

- "Adicione mais uma paleta pronta chamada 'Pizzaria' (vermelho e creme) na tela Personalização (`PALETAS` em `lib/marca.ts`)."
- "Mude as cores neutras (fundo creme, bordas) do tema claro em `app/globals.css` para um cinza frio." (a cor principal/destaque e a fonte o dono troca sozinho em Personalização)
- "Leve a foto de capa do cardápio para a tela Personalização, com upload no Storage (campo de marca próprio do app, veja o COMO-ESTENDER.md)."
- "Adicione pagamento por Pix com QR Code na tela de sucesso do pedido usando a chave Pix das Configurações."
- "Crie um relatório em `/painel/relatorios` com faturamento por dia e os 10 produtos mais vendidos (tabela `pedido_itens`)."
- "Permita pedir pizza meio a meio: um grupo de opcionais 'Segundo sabor' que cobra o maior preço."
- "Adicione um campo 'tempo de preparo' no produto e mostre no cardápio."
- "Limite a quantidade de pedidos por telefone por hora na função `criar_pedido` para evitar abusos."

O arquivo [`COMO-ESTENDER.md`](COMO-ESTENDER.md) explica a estrutura e os padrões que a IA deve seguir.

## Estrutura principal
```
app/page.tsx                      cardápio público (lê o banco como visitante)
app/acoes-cardapio.ts             Server Actions públicas: conferirCupom, enviarPedido (chamam as funções do banco)
components/cardapio/              cardápio, janela do produto, sacola/checkout, mensagem do WhatsApp, estado do cliente
app/(app)/painel/                 painel logado: pedidos (realtime), cardapio, opcionais, cupons, horarios, configurar-site, configuracoes, personalizacao
lib/marca.ts · lib/marca-servidor.ts  marca do restaurante (paletas, fontes, contraste) e leitura por marca_publica()
components/logo-negocio.tsx       <LogoNegocio /> (logo ou iniciais): cardápio, menu, login, comanda
lib/cardapio.ts                   tipos e regras (horário, totais) do cardápio
lib/rotas.ts                      rotas públicas ("/" só no endereço exato)
supabase/schema.sql · seed.sql    banco (tabelas, RLS, funções, storage, realtime) e dados de exemplo
```

## Limitações
- O pagamento é combinado no WhatsApp (não há pagamento online).
- O cliente precisa tocar em **enviar** no WhatsApp; mesmo que não envie, o pedido já fica registrado no painel.
- Qualquer pessoa com o link pode enviar pedidos (como em qualquer cardápio público). Se aparecer abuso, peça à IA um limite por telefone/hora na função `criar_pedido`.

## Tecnologias
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (Postgres, Auth, Realtime, Storage) · lucide-react · zod
