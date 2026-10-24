# fin_apply v2.3 (23/10/2026)

Corrige os achados da auditoria independente sobre a v2.2. Arquivo a aplicar: `fin/sql/fin_apply_v2_3.sql`. Reversão: `fin/sql/fin_apply_v2_3_rollback.sql`.

## O que mudou
1. Conflito de versão devolve só id, versão atual e versão enviada (código 40001). Não devolve o registro.
2. Update valida referências (cardId, billId) no registro completo, depois da mesclagem.
3. Delete de cartão ou conta com lançamentos ativos ligados é recusado.
4. `fin_op_result`: login comum só lê recibos do canal `fin`.
5. Novo gatilho `fin_escrita_t`: gravação direta sem login em `fin_records` é recusada, salvo via `fin_apply` ou dentro da janela do modo legado (`fin_config.admin_canal_legado='sim'` e `admin_canal_legado_ate` no futuro). O app Financeiro (login comum) não é afetado.
6. Sem DROP na migração.

## Limites (honestos)
- A trava é contra gravação acidental ou por ferramenta sem login. Um administrador pode ligar a marca `fin.via_apply` de propósito.
- Nenhum teste automatizado foi executado a pedido do Marcelo. A conferência foi por leitura do banco depois de aplicar.
- Durante a janela do modo legado, GPT e Claude continuam gravando como antes. Fora da janela, só com credencial registrada (`fin_ator_registrar`) e `fin_apply`.
- Backup externo restaurável, conciliação entre fontes e o plano P1 de produto continuam pendentes.
