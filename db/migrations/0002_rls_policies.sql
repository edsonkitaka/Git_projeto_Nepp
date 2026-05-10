-- =====================================================================
-- Migration 0002: políticas Row Level Security (LGPD)
-- =====================================================================
--
-- Princípio: "default deny". O frontend público insere via service role
-- ou via funções RPC controladas — nunca lê dados de outros participantes.
-- Pesquisadores autenticados (auth.role() = 'authenticated') leem tudo.
-- =====================================================================

-- O frontend anônimo só pode INSERIR — nunca SELECT/UPDATE/DELETE.
-- Isso garante que mesmo com a anon key vazada, ninguém extrai a base.
create policy participantes_anon_insert on participantes
  for insert to anon with check (true);

create policy consentimentos_anon_insert on consentimentos_lgpd
  for insert to anon with check (true);

create policy triagens_anon_insert on triagens_red_flags
  for insert to anon with check (true);

create policy respostas_anon_insert on respostas_clinicas
  for insert to anon with check (true);

create policy eva_anon_insert on eva_medicoes
  for insert to anon with check (true);

create policy pics_anon_insert on pics_uso
  for insert to anon with check (true);

create policy followup_anon_insert on follow_ups
  for insert to anon with check (true);

-- O participante pode ATUALIZAR seu próprio EVA D+7 via follow_up_token.
-- Implementado por RPC (security definer) na próxima migration —
-- não exposto direto via REST.

-- Pesquisadores autenticados (UNICAMP) — leitura total.
create policy participantes_pesquisador_select on participantes
  for select to authenticated using (true);

create policy consentimentos_pesquisador_select on consentimentos_lgpd
  for select to authenticated using (true);

create policy triagens_pesquisador_select on triagens_red_flags
  for select to authenticated using (true);

create policy respostas_pesquisador_select on respostas_clinicas
  for select to authenticated using (true);

create policy eva_pesquisador_select on eva_medicoes
  for select to authenticated using (true);

create policy pics_pesquisador_select on pics_uso
  for select to authenticated using (true);

create policy followup_pesquisador_select on follow_ups
  for select to authenticated using (true);
