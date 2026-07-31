# Decisões técnicas

Todas as decisões abaixo foram tomadas em **julho de 2026**, antes de existir código, numa conversa de definição de escopo. Mais recente no topo.

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
