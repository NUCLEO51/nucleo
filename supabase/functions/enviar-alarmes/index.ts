// Núcleo: envia os avisos (notificações) dos alarmes que já chegaram na hora.
// Chamada a cada minuto pelo relógio do banco (pg_cron). Só aceita quem sabe o código do relógio.
import webpush from "npm:web-push@3.6.7";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT")!,
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.headers.get("x-cron-secret") !== Deno.env.get("CRON_SECRET")) {
    return new Response("negado", { status: 401 });
  }
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
        if (code === 404 || code === 410) {
          await fetch(`${URL_}/rest/v1/push_subscriptions?id=eq.${sub.id}`, { method: "DELETE", headers: H });
          removidos++;
        }
      }
    }
  }
  return new Response(JSON.stringify({ alarmes: due.length, enviados, removidos }), { headers: { "Content-Type": "application/json" } });
});
