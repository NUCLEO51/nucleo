# Casa em Dia

App (PWA) de lugares e pendências da casa, do carro e da chácara. Fica na pasta `casa/`, ao lado do Financeiro (`fin/`), e usa o mesmo banco do Núcleo (tabela `casa_records`, ver `supabase/012_casa.sql`).

- Link: https://nucleo51.github.io/nucleo/casa/
- Login: o mesmo email e senha do Núcleo.
- Versão: `APP_V` em `index.html` e `V` em `sw.js` andam juntas. Ao publicar mudança, suba as duas.
- Tipos de registro: `lugar`, `tarefa`, `feita` (histórico), `nota` (Caixa de voz; a Siri grava pela função `siri_casa`).
- Lixeira: apagar = preencher `deleted_at`; uma rotina diária remove o que passou de 30 dias.
- IPVA, seguro e parcelas do carro ficam no Financeiro.
- Só código aqui: nenhum dado pessoal, senha ou chave secreta.
