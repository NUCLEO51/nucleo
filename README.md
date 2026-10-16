# Núcleo

Sistema pessoal de lembretes, notas e agenda (PWA). Este repositório é público e contém **somente código**.
Nenhum dado pessoal, senha, chave secreta, backup ou foto deve entrar aqui.

- `index.html` — o app (versão atual: v46).
- `docs/GUIA-CHATGPT-NUCLEO.md` — **guia completo** do que existe, onde está e como mexer (para o ChatGPT e para quem continuar).
- `supabase/001_schema.sql` — tabelas e regras de acesso (RLS) do banco.

## Regras
- A chave pública (anon/publishable) do Supabase pode aparecer no app. A chave secreta (service_role) nunca.
- A proteção dos dados está no servidor (login + RLS), não na tela.
