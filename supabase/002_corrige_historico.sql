-- Correção: o gatilho que guarda o histórico era bloqueado pela própria regra de segurança
-- (item_history não aceita gravação direta). O gatilho passa a rodar com permissão do dono do banco.
alter function public.items_guard() security definer set search_path = public;
