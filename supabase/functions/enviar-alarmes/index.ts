// Núcleo: envia os avisos (notificações) dos alarmes que já chegaram na hora.
// Chamada a cada minuto pelo relógio do banco (pg_cron -> public.chamar_alarmes()).
// As chaves e o código do relógio ficam na tabela push_config (sem acesso público), não no repositório.
// Na primeira execução, se ainda não houver chaves, a função cria o par e guarda na tabela.
import webpush from "npm:web-push@3.6.7";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

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
  const due: { id: string; owner: string; message: string }[] = await r.json();

  let enviados = 0, removidos = 0;
  const subsCache: Record<string, { id: string; endpoint: string; keys: unknown }[]> = {};
  for (const a of due) {
    if (!subsCache[a.owner]) {
      const s = await fetch(`${URL_}/rest/v1/push_subscriptions?owner=eq.${a.owner}&select=id,endpoint,keys`, { headers: H });
      subsCache[a.owner] = s.ok ? await s.json() : [];
    }
    const payload = JSON.stringify({ title: "Núcleo", body: a.message || "Lembrete", tag: a.id });
    for (const sub of subsCache[a.owner]) {
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
  }
  return new Response(JSON.stringify({ alarmes: due.length, enviados, removidos }), { headers: { "Content-Type": "application/json" } });
});
