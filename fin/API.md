# Financeiro — contrato para o chat financeiro

O Financeiro guarda tudo na tabela `fin_records` (kind + data JSON). Valores em **centavos inteiros**; dado ausente = `null`, nunca 0.
O Financeiro nunca paga nem move dinheiro. Apagar = lixeira (reversível).

## Tipos (kind) e campos principais de `data`
- `card`: nome/apelido, closeDay, dueDay, limitC
- `charge`: compra no cartão (cardId, valor em centavos, parcelas, data, descrição)
- `invpay`: pagamento de fatura registrado
- `bill` / `billmonth`: conta recorrente e o valor/estado de cada mês
- `debt`: creditor, balanceC, installC, rateBp (juros ao mês em centésimos de %), status, dueDay, account, **dir** (`PAGAR` padrão = eu devo; `RECEBER` = me devem), **firstDue** (data da 1ª parcela), **paidYm** (lista de meses AAAA-MM já pagos ou recebidos; ao marcar, o saldo diminui da parcela)
- `proposal`: pendências vindas do Núcleo (text, status) e `cfg:'capacity'` com `capacityC` (quanto dá por mês para dívidas)

## Como usar
**A) Sem acesso à internet:** no Financeiro, 🤝 Chat financeiro → “Copiar tudo para o chat”. O chat devolve
`{"fin_ops":1,"ops":[{"op":"create","kind":"debt","data":{...}},{"op":"update","id":"...","data":{...}},{"op":"delete","id":"..."}]}`
e Marcelo cola em “Colar mudanças do chat” e confirma.

**B) Com chamadas HTTP:** `POST {SUPABASE_URL}/rest/v1/rpc/fin_chat` com headers `apikey` e `Authorization: Bearer <chave publicável>` e corpo
`{"p_token":"<código>","p_cmd":{"read":true}}` ou `{"p_token":"<código>","p_cmd":{"ops":[...]}}`.
Tudo ou nada; máximo 60 ops; resposta traz `registros` atualizados. Edições ficam com `updated_by='chat'`.
