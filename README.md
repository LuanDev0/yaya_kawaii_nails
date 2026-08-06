# yaya_kawaii_nails

Sistema de agendamento para salão de manicure, pedicure e nail design — gestão de horários, clientes, serviços, histórico de atendimentos e lembretes.

## Status

**Camadas 1 a 6 concluídas** (julho e agosto de 2026). O app já é utilizável no salão:

- A cliente abre o link, escolhe um ou vários serviços, vê os horários livres e agenda
- A dona vê a agenda, aprova, cancela e conclui
- A dona lança agendamento por quem combinou por WhatsApp, com opção de encaixar fora do expediente
- Ficha e histórico de cada cliente
- Mensagens de confirmação, lembrete e retorno montadas para envio pelo WhatsApp
- Vitrine de trabalhos na tela da cliente, e fotos guardadas em cada atendimento
- Serviços, horários, folgas, promoções e preferências são configurados por ela

Próximo passo: camada 7, faturamento.

## Como rodar

### Pré-requisitos
- Node 20 ou superior
- App **Expo Go** no celular ([Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent))

### Passo a passo
```bash
npm install
cp .env.example .env
npm start
```

Preencha o `.env` com a URL e a chave `anon` do projeto Supabase (painel → Settings → API Keys). Sem isso o app não abre — e o erro diz exatamente o que está faltando.

As variáveis só são lidas quando o servidor inicia: se editar o `.env`, reinicie o `npm start`.

Um QR code aparece no terminal. Abra o Expo Go no celular e aponte a câmera para ele — o app carrega e recarrega sozinho a cada alteração no código.

Para abrir no navegador em vez do celular, tecle `w` com o servidor rodando, ou:

```bash
npm run web
```

### Outros comandos

| Comando | O que faz |
|---|---|
| `npm start` | Servidor de desenvolvimento com QR code |
| `npm run web` | Abre direto no navegador |
| `npm run android` | Abre num emulador Android |
| `npx tsc --noEmit` | Verifica erros de tipo sem gerar arquivos |

## Gerar o APK

O build roda na nuvem da Expo — não é preciso instalar Android Studio.

```bash
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview
```

O perfil `preview` gera **APK**, que instala direto no celular. O perfil `production` gera **app-bundle**, formato exigido pela Play Store — só serve quando for publicar.

As credenciais do Supabase não vão no repositório, então precisam ser cadastradas uma vez como variáveis de ambiente do projeto no [painel da Expo](https://expo.dev), no ambiente `preview`:

| Variável | Onde achar |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Idem, a chave `anon` |

Sem elas o app compila e abre com erro dizendo o que falta.

## Stack escolhida

- **React Native com Expo** (TypeScript) — um código para iPhone e Android, e também para navegador
- **Supabase** (Postgres gerenciado) — banco de dados e regras de acesso

O porquê de cada escolha está em [Decisões técnicas](docs/DECISOES.md).

## Como o app é usado

Dois públicos, dois caminhos de acesso:

- **A dona do salão** instala o app no celular e gerencia agenda, clientes e serviços
- **As clientes** abrem um link no navegador e agendam sem instalar nada

## Ordem de construção

O app sai em camadas, cada uma utilizável sozinha:

1. ~~Fundação — projeto, tema, banco de dados~~ ✅
2. ~~Login e configuração~~ ✅
3. ~~Agendar — cliente marca pelo link, dona vê e aprova~~ ✅ ← *já dá para usar no salão*
4. ~~Clientes — ficha, histórico~~ ✅
5. ~~WhatsApp — confirmação, lembrete e retorno~~ ✅
6. ~~Fotos — galeria e registro dos atendimentos~~ ✅
7. Financeiro — faturamento
8. Refinamento — acertar o que o uso real mostrar

A configuração era a última camada e passou para a segunda: sem ela, a lógica de horários livres seria construída sobre serviços e horários inventados ([DT-015](docs/DECISOES.md)).

O detalhe de cada uma está em [Funcionalidades](docs/FUNCIONALIDADES.md).

## Documentação

- [Arquitetura](docs/ARQUITETURA.md) — como o código é organizado e como o tema funciona
- [Funcionalidades](docs/FUNCIONALIDADES.md) — o que o app faz, passo a passo
- [Decisões técnicas](docs/DECISOES.md) — por que as coisas são do jeito que são

`docs/BANCO-DE-DADOS.md` entra junto com o schema, na camada 1B.
