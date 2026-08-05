-- Liga a conta de login à profissional.
--
-- Rode DEPOIS de criar a conta em Authentication → Users e DEPOIS da
-- migration 0002.
--
-- O email real não fica neste arquivo de propósito: o repositório vai para o
-- GitHub, e endereço de email é dado pessoal. Uma vez commitado, fica no
-- histórico do git para sempre, onde remover dá bastante trabalho.
--
-- Substitua o espaço reservado abaixo pelo email da conta antes de rodar.

-- lower() nos dois lados: o Supabase normaliza o email para minúsculas ao
-- criar a conta, então comparar o texto exato falha se quem digitar aqui usar
-- maiúsculas em qualquer letra.
update professionals
set auth_user_id = (
  select id from auth.users
  where lower(email) = lower('SEU-EMAIL-AQUI')
)
where name = 'Yaya';

-- Falha alto se não achou a conta.
--
-- Sem isto, um email errado deixa auth_user_id nulo sem reclamar, e o sintoma
-- só aparece bem depois, como um login que autentica mas não dá acesso a nada
-- — bem mais difícil de ligar de volta a este passo.
do $$
begin
  if not exists (
    select 1 from professionals where name = 'Yaya' and auth_user_id is not null
  ) then
    raise exception 'Nenhuma conta encontrada com esse email. Confira se ela existe em Authentication -> Users e se o endereco esta escrito igual.';
  end if;
end $$;

-- Confere se deu certo. Deve devolver uma linha com vinculada = true.
select
  p.name,
  p.auth_user_id is not null as vinculada
from professionals p
where p.name = 'Yaya';
