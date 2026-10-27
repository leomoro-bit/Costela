"use client";

/**
 * Formulário da Personalização. Cada escolha atualiza a PRÉVIA na hora; nada muda
 * no app até clicar em "Salvar". Padrão do projeto: useAcao(serverAction) + <form onSubmit>.
 */
import { AlertTriangle, Check, ImageUp, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LogoNegocio } from "@/components/logo-negocio";
import { Botao } from "@/components/ui/botao";
import { Campo, Entrada } from "@/components/ui/campo";
import { Cartao } from "@/components/ui/cartao";
import {
  FONTES,
  type Fonte,
  LOGO_TIPOS,
  PALETAS,
  RAIOS,
  type Raio,
  TEMAS,
  type TemaPadrao,
  avisosContraste,
  erroArquivoLogo,
} from "@/lib/marca";
import { useAcao } from "@/lib/use-acao";
import { cn } from "@/lib/utils";
import { salvarPersonalizacao } from "./actions";
import { PreviaMarca, type TelaPrevia } from "./previa-marca";

export type DadosPersonalizacao = {
  nome_exibicao: string;
  subtitulo: string;
  logo_url: string | null;
  cor_primaria: string;
  cor_destaque: string;
  fonte: Fonte;
  raio: Raio;
  tema_padrao: TemaPadrao;
};

const HEX = /^#[0-9a-fA-F]{6}$/;

export function FormPersonalizacao({ inicial, nomeNegocio }: { inicial: DadosPersonalizacao; nomeNegocio: string }) {
  const [nomeExibicao, setNomeExibicao] = useState(inicial.nome_exibicao);
  const [subtitulo, setSubtitulo] = useState(inicial.subtitulo);
  const [cor, setCor] = useState(inicial.cor_primaria);
  const [destaque, setDestaque] = useState(inicial.cor_destaque);
  const [fonte, setFonte] = useState<Fonte>(inicial.fonte);
  const [raio, setRaio] = useState<Raio>(inicial.raio);
  const [tema, setTema] = useState<TemaPadrao>(inicial.tema_padrao);
  const [logo, setLogo] = useState<{ url: string | null; nova: boolean }>({ url: inicial.logo_url, nova: false });
  const [erroLogo, setErroLogo] = useState<string | null>(null);
  const [previaEscura, setPreviaEscura] = useState(inicial.tema_padrao === "escuro");
  const [telaPrevia, setTelaPrevia] = useState<TelaPrevia>("app");

  const inputLogo = useRef<HTMLInputElement>(null);
  const urlTemporaria = useRef<string | null>(null);
  useEffect(() => () => {
    if (urlTemporaria.current) URL.revokeObjectURL(urlTemporaria.current);
  }, []);

  const { onSubmit, erros: e, pendente, estado } = useAcao(salvarPersonalizacao);
  // Erro do servidor sobre a logo some quando a pessoa escolhe outro arquivo.
  const [estadoLogoVisto, setEstadoLogoVisto] = useState<typeof estado | null>(null);
  const erroLogoServidor = estado !== estadoLogoVisto ? e.logo : undefined;

  const removerLogo = logo.url === null && inicial.logo_url !== null;
  const alterado =
    nomeExibicao !== inicial.nome_exibicao ||
    subtitulo !== inicial.subtitulo ||
    cor !== inicial.cor_primaria ||
    destaque !== inicial.cor_destaque ||
    fonte !== inicial.fonte ||
    raio !== inicial.raio ||
    tema !== inicial.tema_padrao ||
    logo.nova ||
    removerLogo;

  const nomePrevia = nomeExibicao.trim() || nomeNegocio;
  const avisos = avisosContraste({ corPrimaria: cor, corDestaque: destaque });
  const paletaAtual = PALETAS.find((p) => p.principal === cor && p.destaque === destaque)?.id;

  function limparArquivo() {
    if (inputLogo.current) inputLogo.current.value = "";
    if (urlTemporaria.current) URL.revokeObjectURL(urlTemporaria.current);
    urlTemporaria.current = null;
  }

  /** Arquivo recusado: mostra o motivo e volta para a logo salva (o campo de arquivo fica vazio). */
  function recusarLogo(mensagem: string) {
    limparArquivo();
    setLogo({ url: inicial.logo_url, nova: false });
    setErroLogo(mensagem);
  }

  function aoEscolherLogo(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;
    setEstadoLogoVisto(estado);
    const erro = erroArquivoLogo(arquivo);
    if (erro) return recusarLogo(erro);
    const url = URL.createObjectURL(arquivo);
    const teste = new Image();
    teste.onload = () => {
      setErroLogo(null);
      if (urlTemporaria.current) URL.revokeObjectURL(urlTemporaria.current);
      urlTemporaria.current = url;
      setLogo({ url, nova: true });
    };
    teste.onerror = () => {
      URL.revokeObjectURL(url);
      recusarLogo("O arquivo não parece ser uma imagem válida. Envie PNG, JPG, SVG ou WebP.");
    };
    teste.src = url;
  }

  function aoRemoverLogo() {
    setEstadoLogoVisto(estado);
    limparArquivo();
    setErroLogo(null);
    setLogo({ url: null, nova: false });
  }

  function descartar() {
    limparArquivo();
    setErroLogo(null);
    setNomeExibicao(inicial.nome_exibicao);
    setSubtitulo(inicial.subtitulo);
    setCor(inicial.cor_primaria);
    setDestaque(inicial.cor_destaque);
    setFonte(inicial.fonte);
    setRaio(inicial.raio);
    setTema(inicial.tema_padrao);
    setLogo({ url: inicial.logo_url, nova: false });
  }

  function aoMudarTema(novo: TemaPadrao) {
    setTema(novo);
    if (novo !== "sistema") setPreviaEscura(novo === "escuro");
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start"
    >
      <aside className="min-w-0 lg:sticky lg:top-20 lg:order-2">
        <PreviaMarca
          nome={nomePrevia}
          subtitulo={subtitulo.trim()}
          logoUrl={logo.url}
          corPrimaria={cor}
          corDestaque={destaque}
          fonte={fonte}
          raio={raio}
          escuro={previaEscura}
          aoMudarEscuro={setPreviaEscura}
          tela={telaPrevia}
          aoMudarTela={setTelaPrevia}
        />
      </aside>

      <div className="min-w-0 space-y-6 lg:order-1">
        {/* 1. IDENTIDADE ------------------------------------------------ */}
        <Cartao className="space-y-5">
          <TituloSecao numero={1} titulo="Logo e nome" descricao="Aparecem no cardápio do cliente, no menu do painel, na tela de login, na comanda impressa e no ícone da aba." />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="grid size-24 shrink-0 place-items-center rounded-2xl border border-dashed border-borda bg-superficie-2 p-2">
              <LogoNegocio nome={nomePrevia} logoUrl={logo.url} tamanho="xl" decorativa={false} />
            </div>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap gap-2">
                <Botao variante="secundario" onClick={() => inputLogo.current?.click()} aria-describedby="logo-ajuda">
                  <ImageUp className="size-4" aria-hidden /> {logo.url ? "Trocar logo" : "Enviar logo"}
                </Botao>
                {logo.url && (
                  <Botao variante="fantasma" onClick={aoRemoverLogo}>
                    <Trash2 className="size-4" aria-hidden /> Remover
                  </Botao>
                )}
              </div>
              <input
                ref={inputLogo}
                id="campo-logo"
                name="logo"
                type="file"
                accept={LOGO_TIPOS.join(",")}
                onChange={aoEscolherLogo}
                className="sr-only"
                tabIndex={-1}
                aria-label="Arquivo da logo"
              />
              <input type="hidden" name="remover_logo" value={removerLogo ? "1" : ""} />
              <p id="logo-ajuda" className="text-xs text-texto-2">
                PNG, JPG, SVG ou WebP até 1 MB. Fica melhor quadrada e com fundo transparente.
                {logo.nova && " A logo nova será enviada ao salvar."}
              </p>
              {(erroLogo ?? erroLogoServidor) && (
                <p role="alert" className="text-sm text-perigo">
                  {erroLogo ?? erroLogoServidor}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              rotulo="Nome exibido"
              nome="nome_exibicao"
              erro={e.nome_exibicao}
              ajuda="Vazio = usa o nome do negócio (Configurações)."
            >
              {(p) => (
                <Entrada
                  {...p}
                  value={nomeExibicao}
                  onChange={(ev) => setNomeExibicao(ev.target.value)}
                  placeholder={nomeNegocio}
                  maxLength={60}
                />
              )}
            </Campo>
            <Campo rotulo="Subtítulo" nome="subtitulo" erro={e.subtitulo} ajuda="Frase de apresentação: aparece abaixo do nome no cardápio, no menu e no login.">
              {(p) => (
                <Entrada
                  {...p}
                  value={subtitulo}
                  onChange={(ev) => setSubtitulo(ev.target.value)}
                  placeholder="Restaurante & Delivery · Comida caseira"
                  maxLength={140}
                />
              )}
            </Campo>
          </div>
        </Cartao>

        {/* 2. CORES ----------------------------------------------------- */}
        <Cartao className="space-y-5">
          <TituloSecao numero={2} titulo="Cores" descricao="Escolha uma paleta pronta com 1 clique ou monte a sua." />

          <div role="group" aria-label="Paletas prontas" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PALETAS.map((p) => {
              const ativa = paletaAtual === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={ativa}
                  onClick={() => {
                    setCor(p.principal);
                    setDestaque(p.destaque);
                  }}
                  className={cn(
                    "group relative min-h-11 rounded-2xl border bg-superficie p-2 text-left transition-colors hover:bg-superficie-2",
                    ativa ? "border-texto ring-2 ring-texto/80" : "border-borda",
                  )}
                >
                  <span className="flex h-12 overflow-hidden rounded-xl" aria-hidden>
                    <span className="flex-[3]" style={{ background: p.principal }} />
                    <span className="flex-[2]" style={{ background: p.destaque }} />
                  </span>
                  <span className="mt-2 flex items-center justify-between gap-1 px-1 text-sm font-medium text-texto">
                    {p.nome}
                    {ativa && <Check className="size-4 shrink-0" aria-hidden />}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 border-t border-borda pt-5 sm:grid-cols-2">
            <CampoCor
              nome="cor_primaria"
              rotulo="Cor principal"
              ajuda="Botões, menu ativo e links."
              valor={cor}
              aoMudar={setCor}
              erro={e.cor_primaria}
            />
            <CampoCor
              nome="cor_destaque"
              rotulo="Cor de destaque"
              ajuda="Selos, avisos e detalhes que chamam atenção."
              valor={destaque}
              aoMudar={setDestaque}
              erro={e.cor_destaque}
            />
          </div>

          <div aria-live="polite">
            {avisos.length > 0 && (
              <div className="flex gap-3 rounded-xl bg-alerta-suave p-3 text-sm text-alerta">
                <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
                <ul className="space-y-1">
                  {avisos.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Cartao>

        {/* 3. FONTE ----------------------------------------------------- */}
        <Cartao className="space-y-5">
          <TituloSecao numero={3} titulo="Fonte" descricao="Combinação de letras para títulos e textos." />
          <fieldset>
            <legend className="sr-only">Fonte</legend>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {FONTES.map((f) => (
                <OpcaoCartao key={f.id} nome="fonte" valor={f.id} marcado={fonte === f.id} aoMarcar={() => setFonte(f.id)}>
                  <span data-fonte={f.id} className="block font-sans">
                    <span className="block font-titulo text-3xl leading-none font-bold text-texto">Aa</span>
                    <span className="mt-2 block font-titulo text-base font-semibold text-texto">{f.nome}</span>
                    <span className="block text-xs text-texto-2">{f.descricao}</span>
                  </span>
                </OpcaoCartao>
              ))}
            </div>
          </fieldset>
          {e.fonte && (
            <p role="alert" className="text-sm text-perigo">
              {e.fonte}
            </p>
          )}
        </Cartao>

        {/* 4. APARÊNCIA ------------------------------------------------- */}
        <Cartao className="space-y-5">
          <TituloSecao numero={4} titulo="Aparência" descricao="Tema de quem abre o app pela primeira vez e formato dos cantos." />
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-texto">Tema padrão</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {TEMAS.map((t) => (
                <OpcaoCartao key={t.id} nome="tema_padrao" valor={t.id} marcado={tema === t.id} aoMarcar={() => aoMudarTema(t.id)}>
                  <span className="text-sm font-medium text-texto">{t.nome}</span>
                </OpcaoCartao>
              ))}
            </div>
            <p className="text-xs text-texto-2">
              Cada pessoa ainda pode trocar entre claro e escuro no botão de sol/lua do topo.
            </p>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-texto">Arredondamento dos cantos</legend>
            <div className="grid grid-cols-3 gap-2">
              {RAIOS.map((r) => (
                <OpcaoCartao key={r.id} nome="raio" valor={r.id} marcado={raio === r.id} aoMarcar={() => setRaio(r.id)}>
                  <span className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                    <span
                      data-raio={r.id}
                      className="size-6 shrink-0 rounded-lg border-2 border-texto-2 bg-marca-suave"
                      aria-hidden
                    />
                    <span className="text-sm font-medium text-texto">{r.nome}</span>
                  </span>
                </OpcaoCartao>
              ))}
            </div>
          </fieldset>
        </Cartao>

        {/* BARRA DE SALVAR (fica visível enquanto rola a página) --------- */}
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-borda bg-superficie/95 p-3 backdrop-blur",
            // Só "gruda" no rodapé enquanto houver alterações não salvas.
            alterado && "sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 shadow-lg md:bottom-4",
          )}
        >
          <p className="text-sm text-texto-2" aria-live="polite">
            {alterado ? "Você tem alterações não salvas." : "Tudo salvo."}
          </p>
          <div className="flex flex-1 justify-end gap-2 sm:flex-none">
            {alterado && (
              <Botao variante="fantasma" onClick={descartar} disabled={pendente}>
                Descartar
              </Botao>
            )}
            <Botao type="submit" carregando={pendente} disabled={!alterado} className="flex-1 sm:flex-none">
              {pendente ? "Salvando..." : "Salvar"}
            </Botao>
          </div>
        </div>
      </div>
    </form>
  );
}

function TituloSecao({ numero, titulo, descricao }: { numero: number; titulo: string; descricao: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-marca-suave text-xs font-bold text-marca-forte">
        {numero}
      </span>
      <div>
        <h2 className="text-base font-semibold text-texto">{titulo}</h2>
        <p className="text-sm text-texto-2">{descricao}</p>
      </div>
    </div>
  );
}

/** Opção em forma de cartão (radio de verdade por baixo → teclado e leitor de tela funcionam). */
function OpcaoCartao({
  nome,
  valor,
  marcado,
  aoMarcar,
  children,
}: {
  nome: string;
  valor: string;
  marcado: boolean;
  aoMarcar: () => void;
  children: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "relative flex min-h-11 cursor-pointer items-center rounded-2xl border bg-superficie p-3 transition-colors hover:bg-superficie-2",
        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-foco",
        marcado ? "border-texto ring-2 ring-texto/80" : "border-borda",
      )}
    >
      <input type="radio" name={nome} value={valor} checked={marcado} onChange={aoMarcar} className="sr-only" />
      <span className="min-w-0 flex-1">{children}</span>
      {marcado && <Check className="absolute top-2 right-2 size-4 text-texto" aria-hidden />}
    </label>
  );
}

/** Seletor de cor + campo hexadecimal (#RRGGBB) sincronizados. */
function CampoCor({
  nome,
  rotulo,
  ajuda,
  valor,
  aoMudar,
  erro,
}: {
  nome: string;
  rotulo: string;
  ajuda: string;
  valor: string;
  aoMudar: (cor: string) => void;
  erro?: string;
}) {
  const [texto, setTexto] = useState(valor);
  const [ultimoValor, setUltimoValor] = useState(valor);
  // Paleta escolhida (valor mudou de fora) → atualiza o texto.
  if (valor !== ultimoValor) {
    setUltimoValor(valor);
    setTexto(valor);
  }
  const invalido = !HEX.test(texto.startsWith("#") ? texto : `#${texto}`);

  return (
    <Campo rotulo={rotulo} nome={`${nome}_hex`} erro={erro ?? (invalido ? "Use o formato #RRGGBB." : undefined)} ajuda={ajuda}>
      {(p) => (
        <div className="flex items-center gap-2">
          <input
            type="color"
            name={nome}
            value={valor.toLowerCase()}
            onChange={(ev) => aoMudar(ev.target.value.toUpperCase())}
            aria-label={`${rotulo} (seletor)`}
            className="h-11 w-14 shrink-0 cursor-pointer rounded-xl border border-borda bg-superficie p-1"
          />
          <Entrada
            {...p}
            name={undefined}
            value={texto}
            onChange={(ev) => {
              const v = ev.target.value.trim();
              setTexto(v);
              const hex = v.startsWith("#") ? v : `#${v}`;
              if (HEX.test(hex)) aoMudar(hex.toUpperCase());
            }}
            onBlur={() => setTexto(valor)}
            maxLength={7}
            spellCheck={false}
            autoCapitalize="characters"
            className="font-mono uppercase"
          />
        </div>
      )}
    </Campo>
  );
}
