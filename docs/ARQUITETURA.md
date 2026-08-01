# Arquitetura

Estado em julho de 2026: existe a camada 1 — projeto, identidade visual, componentes base e banco de dados. Ainda não há telas de agendamento.

## Visão geral

Aplicativo React Native com Expo, em TypeScript. O mesmo código gera três saídas: app Android, app iOS e site. É isso que permite a dona instalar o app e a cliente acessar por link, sem manter dois projetos ([DT-005](DECISOES.md)).

O roteamento é do Expo Router, que transforma a estrutura de arquivos em rotas: um arquivo em `src/app/` vira uma tela navegável.

## Organização do código

| Pasta | Responsabilidade | Regra |
|---|---|---|
| `src/app/` | Rotas. Cada arquivo é uma tela | Não escreve cor nem fonte à mão; consome de `useTheme` e dos componentes |
| `src/components/` | Componentes reutilizáveis | Lê o tema, não recebe cor por prop |
| `src/constants/` | Tema: cores, tipografia, raios, espaçamentos | Fonte única de valores visuais |
| `src/hooks/` | Hooks compartilhados | |
| `src/lib/` | Integrações externas | Único lugar que fala com o Supabase |
| `supabase/migrations/` | Schema do banco, em SQL | |
| `assets/` | Ícones e splash | |

O alias `@/` aponta para `src/` (configurado em `tsconfig.json`). Use `@/components/button`, não caminho relativo.

## Como o tema funciona

Este é o ponto que mais afeta o dia a dia de quem escreve tela.

```mermaid
graph TD
    A[constants/theme.ts<br/>Colors, TextStyles, Radius] --> B[hooks/use-theme.tsx<br/>ThemeProvider + useTheme]
    C[hooks/use-color-scheme<br/>modo do sistema] --> B
    B --> D[components/*]
    B --> E[app/*]
```

`ThemeProvider` envolve o app inteiro em `src/app/_layout.tsx`. Ele decide entre paleta clara e escura e expõe tudo via `useTheme()`:

```tsx
const { colors, scheme, mode, setMode } = useTheme();
```

Por padrão segue o sistema operacional. `setMode('light' | 'dark' | 'system')` força um modo — usado hoje na tela de prévia e, no futuro, numa configuração do app.

**A regra que sustenta o resto:** nenhuma tela escreve cor à mão. Se aparecer um `#F4661F` fora de `src/constants/theme.ts`, o modo escuro vai quebrar naquele ponto e ninguém vai notar até alguém abrir o app à noite.

### Por que `useColorScheme` vem de `@/hooks/`, não do `react-native`

O web é gerado estaticamente (`"output": "static"` no `app.json`), então a página é montada no servidor antes de chegar ao navegador — e no servidor não existe modo escuro. O hook local devolve `light` até a hidratação e reavalia no cliente. Importar direto do `react-native` faria a página abrir clara e trocar para escura na frente do usuário, com aviso de hidratação no console.

## Fontes

Baloo 2 e Nunito vêm de `@expo-google-fonts` e são carregadas em `_layout.tsx`. A splash screen fica na tela até terminarem: sem isso o app abre com a fonte do sistema e troca no meio, o que dá um salto visual.

Telas nunca declaram `fontFamily`. Use `<AppText variant="…">`, que já aplica a fonte e o tamanho da variante.

## Componentes base

| Componente | Para que |
|---|---|
| `AppText` | Todo texto. Variantes: `title`, `heading`, `subheading`, `body`, `bodyBold`, `support`, `label` |
| `Button` | Variantes `primary` (laranja) e `secondary` (contorno) |
| `Card` | Superfície com borda e canto arredondado |

## Convenções

**Idioma.** Identificadores em inglês, interface em português. Ver [DT-013](DECISOES.md).

**Sem biblioteca de UI.** Tudo com `StyleSheet` e o módulo de tema. Ver [DT-012](DECISOES.md).

## Acesso a dados

`src/lib/supabase.ts` é o único ponto que conversa com o banco. Telas não montam consulta SQL nem chamam a API direto.

Quem protege os dados são as políticas de acesso do banco — o desenho delas está em [BANCO-DE-DADOS.md](BANCO-DE-DADOS.md).

As credenciais vêm de `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY`. O prefixo `EXPO_PUBLIC_` é obrigatório: sem ele o Expo não expõe a variável ao código do app. Se faltar alguma, o app falha na abertura com uma mensagem dizendo o que fazer — melhor que uma tela em branco e `undefined` no console.

## Autenticação

Dois públicos, dois tratamentos:

- **A cliente não tem login.** Identifica-se por nome e telefone ao agendar ([DT-004](DECISOES.md)).
- **A dona entra com email e senha**, e a sessão é persistida — ela digita a senha uma vez ([DT-014](DECISOES.md)).

`src/hooks/use-auth.tsx` expõe o estado de login. O ponto a entender é que ele devolve **dois** sinais diferentes:

| Campo | Significa |
|---|---|
| `session` | Está autenticada em alguma conta |
| `isOwner` | A conta corresponde a uma profissional ativa do salão |

**As telas de gestão checam `isOwner`, nunca apenas `session`.** O Supabase permite cadastro aberto: alguém pode criar uma conta no projeto e ficar com `session` válida. Só o vínculo com `professionals` caracteriza a dona, e o banco aplica a mesma regra pelas políticas de acesso — a checagem na tela é conveniência, não é a proteção.

`src/app/dona/_layout.tsx` é onde isso vira código: sem sessão, redireciona para `/entrar`; com sessão mas sem vínculo, mostra uma tela explicando que aquela conta não tem acesso.

### Rotas

| Rota | Quem usa |
|---|---|
| `/` | Prévia da identidade (temporária) |
| `/entrar` | Login da dona |
| `/dona/*` | Área de gestão, protegida |

## O que ainda não existe

- **Rotas da cliente.** O fluxo de agendamento é a camada 3.
- **Telas de configuração.** Serviços, horários e preferências — camada 2, em construção.
- **Escrita pela cliente.** As políticas hoje permitem escrita apenas para a dona.
