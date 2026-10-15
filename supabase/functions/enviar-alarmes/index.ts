// Núcleo: envia os avisos (notificações) dos alarmes que já chegaram na hora e repete o aviso.
// Chamada a cada minuto pelo relógio do banco (pg_cron -> public.chamar_alarmes()).
// As chaves e o código do relógio ficam na tabela push_config (sem acesso público), não no repositório.
// Repetição: depois do aviso, manda de novo a cada minuto (REPS vezes) até o app ser aberto,
// que apaga as repetições (tabela alarm_repeats). O primeiro aviso não tem número; as repetições são "1 de 10" a "10 de 10".
import webpush from "npm:web-push@3.6.7";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const REPS = 10; // repetições depois do primeiro aviso (cerca de 10 minutos)
// o relógio do banco roda a cada minuto, mas com alguns milissegundos de diferença: agenda 15 s antes do minuto
// seguinte e aceita repetições até 5 s à frente, para nenhuma ficar para o minuto depois.
const STEP_MS = 60_000 - 15_000;
const JANELA_MS = 5_000;

type Cfg = { vapid_subject: string; vapid_public: string | null; vapid_private: string | null; cron_secret: string };

async function lerCfg(): Promise<Cfg | null> {
  const r = await fetch(`${URL_}/rest/v1/push_config?id=eq.1&select=vapid_subject,vapid_public,vapid_private,cron_secret`, { headers: H });
  if (!r.ok) return null;
  const j = await r.json();
  return j[0] ?? null;
}

Deno.serve(async (req) => {
  let cfg = await lerCfg();
  if (!cfg || req.headers.get("x-cron-secret") !== cfg.cron_secret) {
    return new Response("negado", { status: 401 });
  }

  // primeira vez: cria as chaves de aviso e guarda (só grava se ainda estiverem vazias)
  if (!cfg.vapid_public || !cfg.vapid_private) {
    const k = webpush.generateVAPIDKeys();
    await fetch(`${URL_}/rest/v1/push_config?id=eq.1&vapid_public=is.null`, {
      method: "PATCH", headers: H, body: JSON.stringify({ vapid_public: k.publicKey, vapid_private: k.privateKey }),
    });
    cfg = await lerCfg();
    if (!cfg || !cfg.vapid_public || !cfg.vapid_private) return new Response("chaves nao criadas", { status: 500 });
  }
  webpush.setVapidDetails(cfg.vapid_subject, cfg.vapid_public, cfg.vapid_private);

  const now = new Date();
  const iso = now.toISOString();
  const velho = new Date(now.getTime() - 36 * 3600e3).toISOString();

  // alarmes muito antigos só são dados como vencidos (não faz sentido avisar 2 dias depois)
  await fetch(`${URL_}/rest/v1/alarms?fired_at=is.null&fire_at=lt.${velho}`, {
    method: "PATCH", headers: H, body: JSON.stringify({ fired_at: iso }),
  });

  // pega os que chegaram na hora e já marca como enviados na mesma operação (evita aviso duplicado)
  const r = await fetch(`${URL_}/rest/v1/alarms?fired_at=is.null&fire_at=lte.${iso}`, {
    method: "PATCH", headers: { ...H, Prefer: "return=representation" }, body: JSON.stringify({ fired_at: iso }),
  });
  if (!r.ok) return new Response("erro ao ler alarmes: " + (await r.text()), { status: 500 });
  const due: { id: string; owner: string; message: string; key?: string }[] = await r.json();

  let enviados = 0, removidos = 0, repetidos = 0;
  const subsCache: Record<string, { id: string; endpoint: string; keys: unknown }[]> = {};
  const subsDe = async (owner: string) => {
    if (!subsCache[owner]) {
      const s = await fetch(`${URL_}/rest/v1/push_subscriptions?owner=eq.${owner}&select=id,endpoint,keys`, { headers: H });
      subsCache[owner] = s.ok ? await s.json() : [];
    }
    return subsCache[owner];
  };
  const enviar = async (owner: string, payload: string) => {
    for (const sub of await subsDe(owner)) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys as { p256dh: string; auth: string } }, payload, { TTL: 3600, urgency: "high" });
        enviados++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        // aparelho que não existe mais ou inscrito com chave antiga: tira da lista (o app se inscreve de novo)
        if (code === 401 || code === 403 || code === 404 || code === 410) {
          await fetch(`${URL_}/rest/v1/push_subscriptions?id=eq.${sub.id}`, { method: "DELETE", headers: H });
          removidos++;
        }
      }
    }
  };

  // 1) primeiro aviso de cada alarme que chegou na hora
  for (const a of due) {
    await enviar(a.owner, JSON.stringify({ title: "Núcleo", body: a.message || "Lembrete", tag: a.id }));
    // agenda as repetições (o teste do app não repete)
    if (!String(a.key ?? "").startsWith("teste|")) {
      await fetch(`${URL_}/rest/v1/alarm_repeats`, {
        method: "POST", headers: H,
        body: JSON.stringify({ owner: a.owner, alarm_id: a.id, message: a.message || "Lembrete", next_at: new Date(now.getTime() + STEP_MS).toISOString(), sent: 1, total: REPS + 1 }),
      });
    }
  }

  // 2) repetições que já estão na hora (o app apaga estas linhas quando é aberto)
  const limite = new Date(now.getTime() + JANELA_MS).toISOString();
  const rr = await fetch(`${URL_}/rest/v1/alarm_repeats?next_at=lte.${limite}&select=*`, { headers: H });
  const reps: { id: string; owner: string; alarm_id: string | null; message: string; sent: number; total: number }[] = rr.ok ? await rr.json() : [];
  for (const p of reps) {
    const nova = p.sent + 1; // sent conta o primeiro aviso; a repetição número N é nova - 1
    const ultima = nova >= p.total;
    // reserva a vez antes de enviar, para duas execuções não repetirem o mesmo aviso
    const claim = await fetch(`${URL_}/rest/v1/alarm_repeats?id=eq.${p.id}&sent=eq.${p.sent}`, {
      method: ultima ? "DELETE" : "PATCH",
      headers: { ...H, Prefer: "return=representation" },
      body: ultima ? undefined : JSON.stringify({ sent: nova, next_at: new Date(now.getTime() + STEP_MS).toISOString() }),
    });
    const got = claim.ok ? await claim.json() : [];
    if (!got.length) continue;
    await enviar(p.owner, JSON.stringify({ title: "Núcleo", body: `🔔 ${p.message} (${nova - 1} de ${p.total - 1})`, tag: `${p.alarm_id ?? p.id}-${nova}` }));
    repetidos++;
  }

  return new Response(JSON.stringify({ alarmes: due.length, enviados, removidos, repetidos }), { headers: { "Content-Type": "application/json" } });
});
