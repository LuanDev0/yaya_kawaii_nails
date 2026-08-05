-- Intervalo de arrumação por serviço (DT-017).
--
-- O tempo entre uma cliente e outra depende do procedimento: alguns pedem 5
-- minutos, outros 25. Um número único do salão seria uma média que não
-- descreve nenhum dos dois — apertada para o serviço pesado, desperdiçando
-- agenda no leve.

alter table services
  add column buffer_minutes integer not null default 0
    check (buffer_minutes >= 0);

-- ---------------------------------------------------------------------------
-- Dois marcos no agendamento
--
--   ends_at       fim do atendimento — é o que a cliente vê
--   blocked_until fim da arrumação  — é o que a agenda bloqueia
--
-- Somar o intervalo ao ends_at faria a cliente ler "das 14h às 16h55" quando
-- 25 daqueles minutos são a mesa sendo limpa.
--
-- blocked_until é calculado pelo app ao marcar, não por coluna gerada: no
-- Postgres `timestamptz + interval` não é imutável, e só expressão imutável
-- entra em constraint ou índice.
-- ---------------------------------------------------------------------------
alter table appointments
  add column blocked_until timestamptz;

update appointments set blocked_until = ends_at where blocked_until is null;

alter table appointments
  alter column blocked_until set not null,
  add constraint bloqueio_coerente check (blocked_until >= ends_at);

-- A trava de sobreposição passa a considerar a arrumação: o banco continua
-- sendo quem impede marcação em cima, agora sem engolir o tempo de preparo.
alter table appointments drop constraint sem_sobreposicao;

alter table appointments add constraint sem_sobreposicao
  exclude using gist (
    professional_id with =,
    tstzrange(starts_at, blocked_until) with &&
  ) where (status in ('pendente', 'confirmado'));
