# Núcleo

Sistema pessoal de lembretes, notas e agenda (PWA). Este repositório é público e contém **somente código**.
Nenhum dado pessoal, senha, chave secreta, backup ou foto deve entrar aqui.

- `index.html` — protótipo atual do app.
- `supabase/001_schema.sql` — tabelas e regras de acesso (RLS) do banco.

## Regras
- A chave pública (anon/publishable) do Supabase pode aparecer no app. A chave secreta (service_role) nunca.
- A proteção dos dados está no servidor (login + RLS), não na tela.
