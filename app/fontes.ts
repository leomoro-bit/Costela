/**
 * FONTES do app — baixadas no BUILD pelo next/font (ficam hospedadas junto com o app,
 * sem chamar o Google Fonts no navegador).
 *
 * Cada fonte vira uma variável CSS (--ff-...). A combinação usada é escolhida na tela
 * Personalização e aplicada pelo atributo data-fonte="..." no <html>; o mapeamento
 * "combinação → variáveis" fica em app/globals.css (procure por data-fonte).
 *
 * Só as fontes do padrão do app (Fraunces + DM Sans, combinação "app") são pré-carregadas;
 * as outras só são baixadas se forem usadas.
 */
import {
  DM_Sans,
  Fraunces,
  Fredoka,
  Inter,
  Lora,
  Manrope,
  Nunito,
  Playfair_Display,
  Source_Sans_3,
  Space_Grotesk,
} from "next/font/google";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--ff-fraunces", display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--ff-dm-sans", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--ff-inter", display: "swap", preload: false });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--ff-playfair", display: "swap", preload: false });
const nunito = Nunito({ subsets: ["latin"], variable: "--ff-nunito", display: "swap", preload: false });
const lora = Lora({ subsets: ["latin"], variable: "--ff-lora", display: "swap", preload: false });
const sourceSans = Source_Sans_3({ subsets: ["latin"], variable: "--ff-source-sans", display: "swap", preload: false });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--ff-space-grotesk", display: "swap", preload: false });
const manrope = Manrope({ subsets: ["latin"], variable: "--ff-manrope", display: "swap", preload: false });
const fredoka = Fredoka({ subsets: ["latin"], variable: "--ff-fredoka", display: "swap", preload: false });

/** Classes que declaram as variáveis --ff-* (vão no <html>). */
export const classesFontes = [fraunces, inter, playfair, dmSans, nunito, lora, sourceSans, spaceGrotesk, manrope, fredoka]
  .map((f) => f.variable)
  .join(" ");
