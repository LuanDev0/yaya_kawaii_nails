# Decisões técnicas

Todas de **julho de 2026**. Da DT-001 à DT-011, tomadas numa conversa de definição de escopo, antes de existir código; da DT-012 em diante, durante a construção. Mais recente no topo.

---

## DT-017 — Intervalo de arrumação por serviço, e não do salão
**Situação:** aceita

### Contexto
O plano era guardar um intervalo único entre atendimentos, na configuração do salão. Perguntada quantos minutos, a dona respondeu que depende: alguns procedimentos pedem 5 minutos de arrumação, outros 25.

### Decisão
`buffer_minutes` é coluna de `services`, não de `settings`.

O tempo de arrumação é propriedade do procedimento, não do salão — blindagem sempre vai dar menos trabalho que alongamento, em qualquer dia. Um número único do salão seria uma média que não descreve nenhum dos dois casos: apertada para o serviço pesado, desperdiçando agenda no serviço leve.

### O agendamento guarda dois marcos

| Campo | Significa | Quem vê |
|---|---|---|
| `ends_at` | Fim do atendimento | A cliente |
| `blocked_until` | Fim da arrumação | Só a agenda |

Somar o intervalo à duração e guardar um número só faria a cliente ler "das 14h às 16h55" quando 25 daqueles minutos são a mesa sendo limpa. A separação mantém honesto o que se mostra a ela e correto o que a agenda bloqueia.

A trava de sobreposição passou a usar `blocked_until`, então o banco continua sendo quem garante que ninguém marca em cima — agora incluindo a arrumação.

### Alternativas consideradas
- **Somar o intervalo ao `ends_at`** — uma coluna a menos, mas a cliente veria um horário de término que não é o dela
- **Intervalo único na configuração** — mais simples, mas obrigaria escolher entre agenda apertada ou desperdiçada

### Consequências
- Cada serviço declara seu próprio tempo de arrumação, com padrão zero
- `blocked_until` é calculado pelo app ao marcar, e não pelo banco: `timestamptz + interval` não é imutável no Postgres e por isso não pode entrar na expressão de uma constraint

---

## DT-016 — Disponibilidade como padrão semanal mais exceções por data
**Situação:** aceita

### Contexto
O modelo inicial tinha só um padrão semanal fixo: uma faixa por dia da semana. A dona informou que o salão é trabalho secundário no início e que os horários vão mudar com frequência enquanto ela se ajeita.

Com só o padrão semanal, cada mudança exigiria reeditar os sete dias. Trabalho chato o bastante para ela deixar de fazer — e agenda desatualizada oferece horário que não existe, o que é pior que agenda nenhuma.

Perguntada se havia algum padrão, respondeu que ainda não sabe.

### Decisão
Manter `business_hours` como padrão semanal e acrescentar `schedule_exceptions`, com uma linha por data.

Uma exceção com horário **substitui** o padrão naquela data. Uma exceção **sem** horário fecha o dia.

### Por que isto também resolve o "ainda não sei"

Como a exceção tanto fecha quanto abre, o mesmo modelo atende os dois cenários sem alteração:

- **Com padrão:** cadastra o padrão semanal e marca só o que foge dele
- **Sem padrão:** deixa o padrão vazio e abre data por data

A escolha passa a ser de uso, não de estrutura. Ela decide com a prática, e mudar de ideia não custa migração.

### Alternativas consideradas
- **Só datas específicas, sem padrão semanal** — máxima flexibilidade, mas obrigaria a abrir cada dia toda semana mesmo depois que a rotina estabilizasse
- **Tabela separada para férias, com intervalo de datas** — evitaria uma linha por dia, mas criaria um segundo lugar onde procurar quando o app calcula disponibilidade. Um caminho só é mais fácil de manter correto que dois

### Consequências
- O cálculo de disponibilidade consulta padrão, exceções e agendamentos existentes
- Férias viram várias linhas; a tela cria a partir de um intervalo, então ela não digita dia por dia
- A chave primária `(professional_id, date)` garante uma exceção por data, sem ambiguidade

---

## DT-015 — Configuração antes do agendamento
**Situação:** aceita

### Contexto
O plano original deixava a tela de configuração por último (camada 7). Ao ser perguntada pelos serviços e horários reais, a dona respondeu que prefere cadastrá-los ela mesma, na tela.

Isso deixaria toda a construção acontecendo sobre dados inventados — inclusive a lógica de "quais horários estão livres", que é a parte mais delicada do agendamento.

### Decisão
Trocar a ordem: login e configuração viram a camada 2, e o agendamento passa a ser a camada 3.

### Consequências
- A lógica de disponibilidade é construída e testada contra os horários e durações reais do salão. Testar com dado falso esconde bug que só aparece com dado real
- A primeira versão utilizável demora um pouco mais a aparecer
- O login precisava existir antes da configuração de qualquer forma (DT-014), então as duas caminham juntas

---

## DT-014 — Login da dona por email e senha, vinculado à profissional
**Situação:** aceita

### Contexto
A cliente não tem login (DT-004), mas as regras de acesso do banco bloqueiam toda escrita. Sem uma identidade autenticada, a dona não consegue salvar configuração, aprovar agendamento nem cadastrar cliente.

### Decisão
Autenticação por email e senha, usando o Supabase Auth. E — este é o ponto que importa — a conta é **vinculada** a uma linha de `professionals` por uma coluna `auth_user_id`.

As políticas de acesso perguntam *"existe uma profissional cujo `auth_user_id` é o usuário logado?"*, e não simplesmente *"está logado?"*.

### Por que o vínculo, e não só "está logado"

O Supabase vem com cadastro aberto por padrão. A regra ingênua trataria qualquer pessoa que criasse uma conta no projeto como se fosse a dona, dando acesso à agenda e aos dados das clientes.

Com o vínculo, uma conta criada por fora não corresponde a nenhuma profissional e não enxerga nada. A segurança deixa de depender de lembrar de desligar o cadastro no painel.

### Alternativas consideradas
- **Link mágico por email** — dispensa senha, mas depende de acesso ao email no momento de entrar
- **PIN de quatro dígitos no app** — mais cômodo, porém qualquer pessoa com o link e o PIN entra como a dona, e o PIN teria que ficar guardado de forma que não protege de verdade. Inaceitável com dados de cliente no banco

### Consequências
- Só a cliente fica sem senha; a gestão é autenticada
- Funciona sem alteração quando houver mais de uma profissional (DT-007)
- `src/lib/supabase.ts` precisa passar a persistir sessão, hoje desligada

---

## DT-013 — Código em inglês, interface em português
**Situação:** aceita

### Contexto
O projeto é de uma desenvolvedora brasileira, para um público brasileiro. Não era óbvio se os nomes de variáveis, funções e componentes deveriam acompanhar o idioma da interface.

### Decisão
Identificadores em inglês (`Button`, `useTheme`, `appointments`). Todo texto que o usuário lê, em português.

### Alternativas consideradas
- **Tudo em português** — mais confortável de ler para quem está começando, mas geraria mistura constante com as APIs do React Native, que são em inglês: `onPress` ao lado de `aoApertar`, `useState` ao lado de `definirModo`. O código fica com dois vocabulários disputando a mesma linha.

### Consequências
- Consistência com React Native, Expo e com os nomes de tabela do banco
- Se um dia outra pessoa entrar no projeto, o código está no padrão que ela espera
- Exige atenção para não deixar português vazar em nome de variável

---

## DT-012 — Estilo com StyleSheet e módulo de tema, sem biblioteca de UI
**Situação:** aceita

### Contexto
A identidade visual é bem específica: laranja kawaii, cantos bem arredondados, Baloo 2 nos títulos.

### Decisão
Escrever os estilos com o `StyleSheet` do próprio React Native, alimentado por um módulo de tema em `src/constants/theme.ts`.

### Alternativas consideradas
- **Biblioteca pronta (React Native Paper, Tamagui)** — traria componentes com visual próprio que teríamos que sobrescrever peça por peça. Numa marca tão caracterizada, a biblioteca vira obstáculo em vez de atalho.
- **NativeWind** — classes curtas no estilo Tailwind, mas adiciona um passo de build que costuma quebrar em upgrade de SDK do Expo. Custo alto de manutenção para um projeto de uma pessoa só.

### Consequências
- Controle total sobre o visual, sem lutar contra padrão de terceiro
- Mais código escrito à mão nos componentes base — pago uma vez, reaproveitado sempre
- A regra "nenhuma tela escreve cor à mão" passa a ser o que garante o modo escuro; se alguém furar, quebra silenciosamente

---

## DT-011 — Construção em camadas, não tudo de uma vez
**Situação:** aceita

### Contexto
O escopo acordado (agenda, ficha, fotos, financeiro, lembretes, configurações) é grande para uma primeira versão.

### Decisão
Construir em sete camadas, na ordem listada no README, cada uma utilizável sozinha. A camada 2 já entrega um app que funciona de verdade.

### Consequências
- O salão começa a usar antes de tudo estar pronto
- Evita semanas sem nada visível, que é onde projeto pessoal costuma morrer
- Nada do escopo é descartado, só adiado

---

## DT-010 — Anamnese fica no papel, fora do app
**Situação:** aceita

### Contexto
A ficha de anamnese (histórico de saúde, alergias, medicamentos) chegou a ser considerada como tela do app. O salão já usa uma ficha física.

### Decisão
Não trazer a anamnese para o app. O papel segue como registro formal.

### Alternativas consideradas
- **Anamnese digital com assinatura na tela** — mais completo, mas guarda dado de saúde, que a LGPD trata como dado pessoal sensível. Exigiria consentimento explícito, trava de acesso reforçada e rotina de exclusão a pedido.

### Consequências
- O app não armazena dado de saúde, o que simplifica bastante o tratamento de privacidade
- A dona consulta o papel quando precisa
- Se um dia a anamnese entrar no app, esta decisão precisa ser revista junto com as obrigações de LGPD

> ⚠️ **A confirmar:** o campo curto de "alergias e sensibilidades" na ficha da cliente permanece como lembrete rápido na tela, ou também sai por já estar no papel?

---

## DT-009 — Sem cobrança de sinal na primeira versão
**Situação:** aceita

### Contexto
Sinal antecipado reduz não comparecimento, um problema comum em salão.

### Decisão
Não integrar meio de pagamento agora. Modelar o banco de forma que dê para acrescentar depois sem refazer a estrutura.

### Consequências
- Menos trabalho e nenhuma taxa de gateway agora
- O risco de furo continua; se virar problema real, a decisão volta à mesa

---

## DT-008 — Aprovação e cancelamento como configuração, não regra fixa
**Situação:** aceita

### Contexto
Não estava claro se a dona quer aprovar cada agendamento ou deixar confirmar sozinho, nem se a cliente deve poder cancelar livremente. As duas respostas foram "assim por enquanto, mas quero poder mudar".

### Decisão
Tratar as duas como chaves nas configurações, não como comportamento fixo no código.

**Valores iniciais:** aprovação manual ligada, cancelamento livre pela cliente.

### Consequências
- A dona ajusta conforme aprende como funciona na prática, sem depender de alteração de código
- Custa pouco agora e evita retrabalho previsível

---

## DT-007 — Banco preparado para várias profissionais desde o início
**Situação:** aceita

### Contexto
Hoje só a dona atende, mas há intenção de crescer.

### Decisão
Modelar agendamento com vínculo a uma profissional desde a primeira versão, mesmo que a interface mostre apenas uma.

### Alternativas consideradas
- **Modelar para uma só e adaptar depois** — mais simples agora, mas mudar a chave de um agendamento depois que existem dados reais é justamente o tipo de migração que dá medo de fazer e acaba virando remendo.

### Consequências
- Custo baixo agora, evita uma migração desconfortável depois
- A interface esconde a escolha de profissional enquanto houver só uma

---

## DT-006 — WhatsApp com envio manual, não automático
**Situação:** aceita

### Contexto
Cliente brasileira lê WhatsApp, não email. Confirmação, lembrete de horário e aviso de retorno precisam chegar por lá.

### Decisão
O app monta a mensagem pronta e abre o WhatsApp para a dona apertar enviar.

### Alternativas consideradas
- **API oficial do WhatsApp Business** — envia sozinho, mas é paga por conversa e tem cadastro burocrático. Peso alto para um salão de uma pessoa.
- **Push notification** — gratuito e automático, mas só funciona com o app instalado, o que contraria a DT-005.

### Consequências
- Nenhum custo por mensagem e nenhuma burocracia
- Depende da dona lembrar de enviar
- Migrar para envio automático depois não quebra nada: as mensagens já existem montadas

---

## DT-005 — Clientes acessam por link no navegador
**Situação:** aceita

### Contexto
O app precisa chegar às clientes para elas agendarem sozinhas.

### Decisão
Cliente abre um link (do Instagram, do WhatsApp) e agenda sem instalar nada. Só a dona instala o app. Publicação nas lojas fica para depois, se fizer sentido.

### Alternativas consideradas
- **Publicar nas duas lojas desde já** — parece mais profissional, mas custa cerca de R$ 500 por ano na Apple, passa por revisão, e pedir que a cliente baixe um app de salão é atrito alto para uma tarefa que ela faz uma vez por mês.

### Consequências
- Atrito quase zero para a cliente
- Sem custo de loja nem espera de revisão
- Descarta push notification como canal de aviso (ver DT-006)
- O mesmo código Expo atende link e lojas, então mudar de ideia depois é barato

---

## DT-004 — Identificação por nome e telefone, sem senha
**Situação:** aceita

### Contexto
Login com senha ou código por SMS cria atrito ou custo. A cliente precisa conseguir agendar rápido.

### Decisão
A cliente informa nome e telefone ao agendar. Não há senha.

### Consequência de privacidade e como ela é tratada
Sem senha, o telefone é a identidade. Uma tela de "digite seu telefone para ver seus agendamentos" deixaria qualquer pessoa que conheça o número de outra ver o histórico dela — quais serviços fez, quando, quanto pagou.

Por isso **não existe consulta por telefone**. A cliente vê os agendamentos dela porque o navegador guarda quem ela é depois que ela agenda. Quem abre o link sem nunca ter agendado não vê histórico de ninguém.

Agendamento falso não vira horário bloqueado, porque a dona aprova cada um (DT-008).

### Alternativas consideradas
- **Telefone + código por SMS** — seguro e familiar, mas cada mensagem custa e exige contratar um serviço de envio
- **Email e senha** — gratuito e pronto no Supabase, mas gera "esqueci a senha" e cliente que não lembra qual email usou
- **Login com Google** — um toque e gratuito; descartado por hora por adicionar uma tela de consentimento a uma tarefa simples

---

## DT-003 — Paleta e tipografia derivadas do logo
**Situação:** aceita

### Contexto
A identidade visual parte de um logo de raposa kitsune em estilo kawaii: laranja vivo, contornos pretos, fundo lavanda, detalhes em rosa.

### Decisão
Usar as cores do logo como base, com dois tons acrescentados por necessidade prática, e o par tipográfico Baloo 2 (títulos) + Nunito (dados).

**Cores** — modo claro e escuro:

| Token | Papel | Claro | Escuro |
|---|---|---|---|
| `primary` | Botão principal, destaque ativo | `#F4661F` | `#FF8347` |
| `onPrimary` | Texto sobre o laranja | `#2A1408` | `#2A1408` |
| `primaryPressed` | Botão pressionado | `#C24A0F` | `#F4661F` |
| `textAccent` | Texto laranja (preços, links) | `#C24A0F` | `#FF9A63` |
| `secondary` | Lavanda — abas, marcações | `#C9A9E9` | `#A88BC9` |
| `background` | Fundo da tela | `#F6F0FB` | `#17131C` |
| `surface` | Cards, campos | `#FFFFFF` | `#241E2C` |
| `border` | Contornos | `#E0D2EE` | `#3A3145` |
| `textPrimary` | Texto principal | `#1C1A1F` | `#F2EDF7` |
| `textSecondary` | Texto de apoio | `#6B6373` | `#B0A7BC` |
| `blush` | Acento suave | `#F5A0A8` | `#E88B95` |
| `peach` | Faixas e fundos de destaque | `#F4A87C` | `#8A5433` |

Os valores são leitura visual do logo, não amostragem exata do arquivo — ajustar se a arte original tiver os códigos.

### Três escolhas que merecem explicação

**Texto escuro sobre o laranja, não branco.** Branco sobre `#F4661F` dá contraste de 3,1:1, abaixo do mínimo de 4,5:1 — texto ilegível para quem tem baixa visão. Havia duas saídas: escurecer o laranja do botão, perdendo o tom vivo da raposa, ou escurecer o texto. A segunda preserva a cor da marca, dá 5,6:1, e combina com os contornos pretos do logo. O material de divulgação do salão já usa texto escuro sobre laranja.

**Fundo lavanda claro, não o lavanda do logo.** O lavanda do fundo do sticker é saturado demais para cobrir uma tela de agenda inteira — cansa a vista em poucos minutos e disputa atenção com o laranja.

**Preto suavizado (`#1C1A1F`), não `#000000`.** Preto absoluto sobre fundo claro vibra na tela do celular e cansa em leitura longa.

**Tipografia.** Baloo 2 nos títulos carrega a personalidade do logo; Nunito nos dados porque uma fonte de destaque numa lista de horários e preços vira bloco pesado, e agenda é justamente a tela que se varre com o olho procurando uma informação. Se um dia for preciso usar uma fonte só, a Baloo 2 tem cinco pesos e aguenta.

---

## DT-002 — Supabase como backend
**Situação:** aceita

### Contexto
O app precisa de banco de dados e regras de acesso. Não há equipe para manter servidor próprio.

### Decisão
Supabase, que é Postgres gerenciado com autenticação e políticas de acesso prontas.

### Alternativas consideradas
- **Firebase** — SDK mobile mais direto, mas o Firestore é NoSQL. Impedir que dois agendamentos caiam no mesmo horário exigiria lógica manual no app, onde uma condição de corrida entre duas clientes agendando ao mesmo tempo passa despercebida. No Postgres isso é uma constraint que o banco garante sozinho.
- **Backend próprio em Node** — controle total, mas exige hospedar e manter servidor.

### Consequências
- A não-sobreposição de horários é garantida pelo banco, não pelo app
- Regras de acesso por linha vêm prontas
- Dependência do Supabase para autenticação; migrar depois daria trabalho

---

## DT-001 — React Native com Expo
**Situação:** aceita

### Contexto
O app precisa rodar em iPhone e Android sem manter dois códigos separados.

### Decisão
React Native com Expo, em TypeScript.

### Alternativas consideradas
- **Flutter** — performance de interface mais consistente, mas exigiria aprender Dart
- **Dois apps nativos** — inviável para uma pessoa só

### Consequências
- Um código para as duas plataformas e também para navegador, o que viabiliza a DT-005
- Expo simplifica build e publicação, ao custo de menos acesso a APIs nativas
