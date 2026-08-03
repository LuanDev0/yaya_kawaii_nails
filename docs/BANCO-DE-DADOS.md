# Banco de dados

Postgres hospedado no Supabase, região São Paulo (`sa-east-1`).

O schema vive em `supabase/migrations/`. Para aplicar: painel do Supabase → **SQL Editor** → colar o arquivo → **Run**.

## Diagrama

```mermaid
erDiagram
    professionals ||--o{ appointments : atende
    professionals ||--o{ business_hours : "trabalha em"
    clients       ||--o{ appointments : faz
    services      ||--o{ appointments : "é agendado em"
```

## Tabelas

### `professionals`

Profissionais que atendem. Uma linha por enquanto ([DT-007](DECISOES.md)).

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | uuid | |
| `name` | text | |
| `active` | boolean | Inativa some do catálogo público |

### `services`

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | uuid | |
| `name` | text | |
| `description` | text | O que está incluso. Escrito para a cliente ler |
| `price_cents` | integer | Preço cheio, em **centavos** — ver abaixo |
| `discount_kind` | text | `valor` ou `percentual`. Nulo = sem promoção |
| `discount_value` | integer | Centavos se `valor`; de 1 a 100 se `percentual` |
| `discount_starts_on` | date | Nulo = vale desde já |
| `discount_ends_on` | date | Nulo = vale até ser removida. **Inclusiva** |
| `duration_minutes` | integer | Duração do atendimento. É o que a cliente vê |
| `buffer_minutes` | integer | Arrumação depois. Bloqueia a agenda sem aparecer para a cliente ([DT-017](DECISOES.md)) |
| `active` | boolean | |
| `sort_order` | integer | Ordem de exibição para a cliente |

### `clients`

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | uuid | |
| `name` | text | |
| `phone` | text | **Único.** É a identidade da cliente, já que não há senha ([DT-004](DECISOES.md)). Guardar só dígitos |
| `birth_date` | date | |
| `preferences` | text | Formato, tamanho, cores que ela gosta |
| `notes` | text | Observações livres |

Não há campo de dados de saúde. A anamnese fica em papel ([DT-010](DECISOES.md)), e por isso o app não guarda informação sensível de saúde.

### `appointments`

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | uuid | |
| `client_id` | uuid | → `clients.id` |
| `service_id` | uuid | → `services.id` |
| `professional_id` | uuid | → `professionals.id` |
| `starts_at` | timestamptz | |
| `ends_at` | timestamptz | Fim do **atendimento**. É o que a cliente vê |
| `blocked_until` | timestamptz | Fim da **arrumação**. É o que a agenda bloqueia |
| `status` | text | `pendente`, `confirmado`, `cancelado`, `concluido` |
| `price_cents` | integer | **Cópia** do valor cobrado no momento da marcação |
| `discount_cents` | integer | Quanto de promoção foi dado. Zero quando não houve |
| `notes` | text | |

### `schedule_exceptions`

Ajustes de agenda para datas específicas, que substituem o padrão semanal ([DT-016](DECISOES.md)).

| Coluna | Tipo | Regra |
|---|---|---|
| `professional_id` | uuid | → `professionals.id` |
| `date` | date | Junto com `professional_id`, é a chave primária |
| `opens_at` | time | Nulo junto com `closes_at` significa **fechado o dia todo** |
| `closes_at` | time | |
| `note` | text | Motivo, de uso interno. **Não é legível pela chave pública** |

A exceção tanto abre quanto fecha, e é isso que faz o modelo servir para quem tem rotina estável e para quem não tem nenhuma:

| Situação | Como fica |
|---|---|
| Fechar uma quinta específica | Linha na data, sem horário |
| Naquele sábado só de manhã | Linha na data, 09:00–12:00 |
| Atender num domingo fora do padrão | Linha na data, com horário |
| Férias | Uma linha por dia do período |

### `business_hours`

Chave primária composta por `(professional_id, weekday)` — uma faixa por dia da semana.

`weekday` segue a convenção do JavaScript: `0` = domingo, `6` = sábado.

### `settings`

Tabela de uma linha só. A chave primária é um boolean que só aceita `true`, então uma segunda linha é impossível — evita o clássico "qual das duas configurações vale?".

| Coluna | Padrão | Para que |
|---|---|---|
| `require_approval` | `true` | Dona aprova cada agendamento ([DT-008](DECISOES.md)) |
| `allow_client_cancel` | `true` | Cliente cancela sozinha |
| `maintenance_reminder_days` | `21` | Dias até a cliente entrar na lista de retorno |
| `booking_window_days` | `14` | Até quantos dias à frente a agenda aceita marcação |
| `minimum_notice_hours` | `3` | Antecedência mínima para marcar |

> ⚠️ **A confirmar:** `maintenance_reminder_days` está em 21 por suposição. Qual é o prazo real de manutenção? Varia por serviço?

> ⚠️ **A confirmar:** intervalo entre atendimentos, para limpeza e preparo. Entra no cálculo de disponibilidade e ainda não existe no schema.

## Uma armadilha ao consultar `schedule_exceptions`

A coluna `note` é restrita por permissão de coluna, não por RLS — RLS controla linha, e liberar a linha para a cliente entregaria o motivo junto ("consulta médica", "viagem").

A consequência prática: **`select('*')` nessa tabela é recusado para a chave pública**, porque `*` inclui `note`. Consultas do lado da cliente precisam listar as colunas:

```ts
.select('professional_id, date, opens_at, closes_at')
```

O erro, se esquecer, é `permission denied for table schedule_exceptions` — que sugere falta de permissão e leva para o caminho errado. A tentação vira conceder acesso total, reabrindo o buraco.

## Duas escolhas que merecem explicação

### Dinheiro em centavos, não em decimal

`price_cents` é `integer`. Guardar dinheiro como número de ponto flutuante acumula erro de arredondamento, e isso aparece no relatório de faturamento como centavos que não fecham. Um preço de R$ 120,00 é `12000`.

### A promoção não sobrescreve o preço

`discount_kind` e `discount_value` ficam em colunas próprias em vez de baixar `price_cents`.

Assim o valor cheio não se perde: encerrada a promoção, basta limpar o desconto e o preço volta sozinho, sem ninguém precisar lembrar qual era. E a cliente pode ver "de R$ 120 por R$ 96" — que vende bem mais que só "R$ 96".

O prazo é opcional dos dois lados: sem início, vale desde já; sem fim, vale até ser removida à mão. Com início no futuro, a promoção fica **agendada** e entra sozinha na data.

**`discount_ends_on` é inclusiva.** "Até 31/05" tem desconto no dia 31 — é como as pessoas leem uma promoção, e o contrário renderia reclamação legítima de cliente no último dia.

O cálculo fica em `src/lib/pricing.ts`, separado do acesso ao banco para poder ser testado sozinho.

`appointments.discount_cents` registra quanto foi abatido naquele atendimento. Sem isso, o faturamento mostraria o valor cobrado sem que houvesse como saber quanto foi de promoção no período.

### O preço é copiado para o agendamento

`appointments.price_cents` duplica o valor de `services.price_cents` de propósito, no momento da marcação.

Sem essa cópia, aumentar o preço de um serviço reescreveria o histórico: o faturamento do mês passado mudaria sozinho, e o que a cliente pagou deixaria de bater com o que está registrado.

## A trava de horário

O ponto que justificou escolher Postgres em vez de Firestore ([DT-002](DECISOES.md)):

```sql
alter table appointments add constraint sem_sobreposicao
  exclude using gist (
    professional_id with =,
    tstzrange(starts_at, blocked_until) with &&
  ) where (status in ('pendente', 'confirmado'));
```

Repare que a faixa vai até `blocked_until`, e não até `ends_at`: o tempo de arrumação também é horário ocupado. Um alongamento de 2h30 com 25 minutos de arrumação marcado às 14h termina para a cliente às 16h30 e libera a agenda às 16h55.

`blocked_until` é calculado pelo app ao marcar, e não por coluna gerada, porque `timestamptz + interval` não é imutável no Postgres — e só expressão imutável entra em constraint ou índice.

Duas clientes agendando o mesmo horário no mesmo instante: o banco recusa a segunda. Isso **não** depende de o app ter checado antes — e é exatamente na disputa simultânea que a checagem no app falha, porque as duas leem "livre" antes de qualquer uma escrever.

O `where` deixa de fora `cancelado` e `concluido`: horário cancelado volta a ficar livre, e atendimento concluído não deve bloquear uma remarcação no mesmo espaço.

## As três funções que a cliente usa

A cliente não lê nem escreve nas tabelas de agendamento. Ela chama funções que rodam dentro do banco com acesso privilegiado e devolvem só o necessário.

| Função | Recebe | Devolve |
|---|---|---|
| `available_slots(servico, data)` | Serviço e data | Lista de horários vagos |
| `book_appointment(servico, horario, nome, telefone)` | O essencial | O código do agendamento criado |
| `appointment_details(codigo)` | O código | Aquele agendamento |

E duas que só a dona usa, para lançar agendamento de quem combinou por WhatsApp:

| Função | Para que |
|---|---|
| `slot_warnings(servico, horario)` | O que está sendo furado naquele horário. Lista vazia = limpo |
| `book_appointment_as_owner(…, forcar)` | Lança o agendamento; com `forcar`, ignora as restrições |

`book_appointment_as_owner` exige `is_owner()`. Sem essa checagem, qualquer pessoa chamaria a versão sem restrições e marcaria a madrugada inteira.

> **Armadilha:** no Supabase, `grant execute ... to authenticated` **não** exclui a chave anônima — funções nascem executáveis por todos. Descobrimos testando: a chave pública conseguiu chamar `book_appointment_as_owner` e só foi barrada pelo `is_owner()` de dentro. Toda função restrita precisa de `revoke execute ... from anon, public` **e** da checagem interna. A permissão sozinha não segura.

**O que nem forçando passa é sobreposição.** A constraint `sem_sobreposicao` recusa, e com razão: a dona é uma pessoa só, não existe caso legítimo de duas clientes no mesmo horário. Fora do expediente, em cima da hora e além da janela, sim — são decisões dela.

Agendamento lançado por ela nasce `confirmado`, não `pendente`: ela acabou de combinar com a cliente, e deixar pendente a obrigaria a aprovar o próprio lançamento.

### Por que não abrir as tabelas

**Para ler:** calcular a disponibilidade no app exigiria baixar os agendamentos para o navegador dela — e aí nome, telefone e serviço das outras clientes já vazaram. Esconder na tela não desfaz o download.

**Para escrever:** com acesso direto ao `insert`, ela escolheria o que gravar, inclusive o preço. Validar na tela não protege, porque a tela roda no navegador dela.

### A validação e a listagem usam o mesmo caminho

`book_appointment` não reconfere expediente, exceção, antecedência e colisão por conta própria. Ela pergunta se o horário pedido está entre os que `available_slots` ofereceria.

Isso elimina a classe de bug em que a tela mostra um horário que o gravador recusa — ou pior, aceita um que não deveria.

### Como a cliente vê o agendamento depois

Sem senha (DT-004), o código do agendamento é a prova de posse: um identificador aleatório, guardado no navegador que o criou. Quem não tem o código não descobre nada.

**Não existe busca por telefone**, de propósito: ela deixaria qualquer pessoa que saiba o número de outra ver o histórico dela.

## Regras de acesso (RLS)

RLS ligado em todas as tabelas. **Sem política, ninguém lê nem escreve** — o padrão é negar.

| Tabela | Quem lê | Quem escreve |
|---|---|---|
| `services` | Qualquer um, se `active` · a dona vê todos | A dona |
| `professionals` | Qualquer um, se `active` | A dona (só a própria linha) |
| `business_hours` | Qualquer um | A dona |
| `clients` | A dona | A dona |
| `appointments` | A dona | A dona |
| `settings` | A dona | A dona |

As três primeiras são o catálogo: a cliente precisa ver serviços e horários para conseguir agendar. Dados pessoais só a dona enxerga.

A cliente ainda não escreve nada — o fluxo de agendamento entra na camada 3, com políticas próprias.

### Quem é "a dona", do ponto de vista do banco

Não é "quem está autenticado". O Supabase permite cadastro aberto, então essa definição trataria qualquer pessoa que criasse uma conta no projeto como administradora do salão.

A tabela `professionals` tem uma coluna `auth_user_id` que aponta para `auth.users`. A função `is_owner()` verifica se existe uma profissional **ativa** cujo `auth_user_id` é o usuário logado, e é ela que todas as políticas de escrita consultam:

```sql
create or replace function is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from professionals
    where auth_user_id = auth.uid() and active
  );
$$;
```

Uma conta criada por fora autentica normalmente, mas não corresponde a nenhuma linha e não enxerga nada.

O `security definer` é necessário: a função precisa ler `professionals` ignorando o RLS dessa mesma tabela, senão a política que a chama entra em recursão infinita. O `set search_path` que acompanha impede que um schema no caminho de busca sequestre os nomes usados dentro dela — cuidado padrão com funções `security definer`.

A conta é ligada à profissional por `supabase/migrations/0003_vincula_conta.sql`. O email real não fica versionado ali de propósito: é dado pessoal, e uma vez commitado permanece no histórico do git.

## Conexão a partir do app

`src/lib/supabase.ts`. As credenciais vêm de variáveis de ambiente:

```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
```

Copie `.env.example` para `.env` e preencha. O `.env` não vai para o Git.

A chave `anon` é pública por natureza — quem protege os dados é o RLS, não o segredo da chave. Já a `service_role` **ignora todas as políticas** e nunca deve entrar no app nem no repositório.

## Dados de exemplo

A migration insere serviços e horários fictícios (terça a sábado, 9h às 18h) para o app ter o que mostrar enquanto a tela de configuração não existe.

> ⚠️ **A confirmar:** a lista real de serviços com preço e duração, e os dias e horários de atendimento.
