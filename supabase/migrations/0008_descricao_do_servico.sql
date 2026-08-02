-- Descrição do serviço: o que está incluso, para a cliente saber o que está
-- contratando antes de escolher.
--
-- Fica legível pela chave pública junto com o resto do catálogo — é conteúdo
-- feito para ela ler.

alter table services
  add column if not exists description text;
