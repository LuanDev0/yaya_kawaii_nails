# yaya_kawaii_nails

Sistema de agendamento para salão de manicure, pedicure e nail design — gestão de horários, clientes, serviços, histórico de atendimentos e lembretes.

## Status

**Em definição.** Julho de 2026: o escopo e as decisões técnicas estão fechados, mas ainda não há código. A próxima etapa é criar o projeto Expo com o tema da marca.

Não há nada para instalar ou rodar ainda — esta seção ganha conteúdo assim que a camada 1 existir.

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

- [Funcionalidades](docs/FUNCIONALIDADES.md) — o que o app faz, passo a passo
- [Decisões técnicas](docs/DECISOES.md) — por que as coisas são do jeito que são

`docs/ARQUITETURA.md` e `docs/BANCO-DE-DADOS.md` entram quando houver código e schema — documentar pastas e tabelas que ainda não existem seria inventar.
