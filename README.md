# yaya_kawaii_nails

Sistema de agendamento para salão de manicure, pedicure e nail design — gestão de horários, clientes, serviços, histórico de atendimentos e lembretes.

## Status

**Camada 1 concluída** (julho de 2026): projeto criado, identidade visual aplicada, componentes base prontos e banco de dados no ar. A tela inicial é uma prévia do tema que lista os serviços vindos do Supabase — serve para provar que a conexão funciona, não é uma funcionalidade. O app ainda não agenda nada.

Próximo passo: camada 2, o fluxo de agendamento.

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

1. Fundação — projeto, tema, banco de dados
2. Agendar — cliente marca pelo link, dona vê e aprova ← *primeira versão usável*
3. Clientes — ficha, histórico
4. WhatsApp — confirmação, lembrete e retorno
5. Fotos — galeria e registro dos atendimentos
6. Financeiro — faturamento
7. Configurações — horários, aprovação, cancelamento

O detalhe de cada uma está em [Funcionalidades](docs/FUNCIONALIDADES.md).

## Documentação

- [Arquitetura](docs/ARQUITETURA.md) — como o código é organizado e como o tema funciona
- [Funcionalidades](docs/FUNCIONALIDADES.md) — o que o app faz, passo a passo
- [Decisões técnicas](docs/DECISOES.md) — por que as coisas são do jeito que são

`docs/BANCO-DE-DADOS.md` entra junto com o schema, na camada 1B.
