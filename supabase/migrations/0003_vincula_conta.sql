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

update professionals
set auth_user_id = (
  select id from auth.users
  where email = 'SEU-EMAIL-AQUI'
)
where name = 'Yaya';

-- Confere se deu certo. Deve devolver uma linha com vinculada = true.
select
  p.name,
  p.auth_user_id is not null as vinculada,
  is_owner() as reconhecida_como_dona
from professionals p
where p.name = 'Yaya';
