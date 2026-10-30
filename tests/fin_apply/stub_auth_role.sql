-- Ensaio local: no Supabase, auth.role() lê o claim "role" do JWT. Aqui o claim vem de request.jwt.claim.role.
create or replace function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role', true),'') $$;
