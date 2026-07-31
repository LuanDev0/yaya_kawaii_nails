/**
 * Identidade visual do yaya_kawaii_nails.
 *
 * As cores vêm da DT-003 em docs/DECISOES.md, que é a fonte da verdade —
 * se este arquivo e a documentação divergirem, a documentação vence.
 *
 * Nenhuma tela deve escrever cor à mão. Consuma sempre via useTheme().
 */

export const Colors = {
  light: {
    /** Botão principal, destaque ativo */
    primary: '#F4661F',
    /** Texto e ícone sobre o laranja. Escuro, não branco: branco sobre o
     *  laranja dá 3,1:1 de contraste e reprova em acessibilidade. */
    onPrimary: '#2A1408',
    primaryPressed: '#C24A0F',
    /** Laranja legível como texto sobre fundo claro (preços, links) */
    textAccent: '#C24A0F',
    secondary: '#C9A9E9',
    background: '#F6F0FB',
    surface: '#FFFFFF',
    border: '#E0D2EE',
    textPrimary: '#1C1A1F',
    textSecondary: '#6B6373',
    blush: '#F5A0A8',
    peach: '#F4A87C',
  },
  dark: {
    primary: '#FF8347',
    onPrimary: '#2A1408',
    primaryPressed: '#F4661F',
    textAccent: '#FF9A63',
    secondary: '#A88BC9',
    /** Preto puxado para o roxo, não preto puro — mantém o parentesco
     *  com o lavanda em vez de virar um app genérico. */
    background: '#17131C',
    surface: '#241E2C',
    border: '#3A3145',
    textPrimary: '#F2EDF7',
    textSecondary: '#B0A7BC',
    blush: '#E88B95',
    peach: '#8A5433',
  },
} as const;

export type ColorScheme = keyof typeof Colors;
export type ThemeColor = keyof typeof Colors.light;
/** Record<…, string> e não `typeof Colors.light`: aquele fixaria os valores
 *  literais do modo claro e o modo escuro deixaria de ser atribuível. */
export type ThemeColors = Record<ThemeColor, string>;

/**
 * Baloo 2 nos títulos carrega a personalidade do logo. Nunito nos dados
 * porque uma fonte de destaque numa lista de horários e preços vira bloco
 * pesado, e agenda é justamente a tela que se varre com o olho.
 */
export const Fonts = {
  headingBold: 'Baloo2_700Bold',
  headingSemiBold: 'Baloo2_600SemiBold',
  body: 'Nunito_400Regular',
  bodyBold: 'Nunito_700Bold',
} as const;

export const TextStyles = {
  title: { fontFamily: Fonts.headingBold, fontSize: 26, lineHeight: 34 },
  heading: { fontFamily: Fonts.headingBold, fontSize: 20, lineHeight: 28 },
  subheading: { fontFamily: Fonts.headingSemiBold, fontSize: 17, lineHeight: 24 },
  body: { fontFamily: Fonts.body, fontSize: 16, lineHeight: 24 },
  bodyBold: { fontFamily: Fonts.bodyBold, fontSize: 16, lineHeight: 24 },
  support: { fontFamily: Fonts.body, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: Fonts.bodyBold, fontSize: 13, lineHeight: 18 },
} as const;

export type TextVariant = keyof typeof TextStyles;

/** "Arredondado" foi decisão explícita da identidade. */
export const Radius = {
  small: 10,
  medium: 16,
  large: 24,
  pill: 999,
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const MaxContentWidth = 800;
