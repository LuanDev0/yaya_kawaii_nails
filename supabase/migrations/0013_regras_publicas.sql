-- As regras de agendamento que a cliente precisa conhecer.
--
-- Ela precisa saber até quando pode marcar, com quanta antecedência e se pode
-- cancelar sozinha — sem isso a tela ofereceria datas que o banco vai recusar.
--
-- O resto de `settings` continua fechado: se a dona aprova cada agendamento e
-- de quantos em quantos dias ela cobra retorno são assunto do salão.
--
-- Restrição por COLUNA, não por linha: RLS libera a linha inteira, e a tabela
-- tem uma linha só. Ver a mesma armadilha em schedule_exceptions.note.

revoke select on settings from anon;

grant select (booking_window_days, minimum_notice_hours, allow_client_cancel)
  on settings to anon;

create policy "regras de agendamento sao publicas"
  on settings for select to anon
  using (true);
