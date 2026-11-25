// Utilidades compartidas por las funciones del servidor.
import { createClient } from "jsr:@supabase/supabase-js@2";

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Topes por plan. Gratis: una consulta de bienvenida en total. Pago: por día y por mes.
export const TOPES = {
  gratis: { total: 1, vozTotal: 3000 },
  pago: { dia: 5, mes: 60, vozDia: 15000 },
};

export function responder(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: { ...CORS, "Content-Type": "application/json" } });
}

/** Identifica a la persona por su sesión y devuelve su plan vigente y su uso de hoy. */
export async function identificar(req: Request) {
  // La clave privilegiada cambia de nombre según la versión del proyecto
  const clave = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY") ?? (() => { try { return Object.values(JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}"))[0] as string; } catch { return undefined; } })();
  if (!clave) return { error: responder({ error: "El servidor no encuentra su clave interna.", variables: Object.keys(Deno.env.toObject()).filter((k) => k.startsWith("SUPABASE_") || k.startsWith("SB_")) }, 500) };
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, clave);
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return { error: responder({ error: "Inicia sesión para usar el astrólogo inteligente." }, 401) };
  const { data: cuenta } = await admin.from("cuentas").select("plan, plan_hasta").eq("id", data.user.id).maybeSingle();
  const pago = cuenta?.plan === "pago" && (!cuenta.plan_hasta || new Date(cuenta.plan_hasta) > new Date());
  const plan: "gratis" | "pago" = pago ? "pago" : "gratis";
  // Uso de hoy, del mes y de siempre (el día se cuenta en hora de Argentina, igual que en la base)
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
  const { data: filas } = await admin.from("uso").select("dia, consultas, voz_caracteres").eq("usuario", data.user.id);
  const uso = { hoy: 0, mes: 0, total: 0, vozHoy: 0, vozTotal: 0 };
  for (const f of filas ?? []) {
    uso.total += f.consultas; uso.vozTotal += f.voz_caracteres;
    if (String(f.dia).slice(0, 7) === hoy.slice(0, 7)) uso.mes += f.consultas;
    if (String(f.dia) === hoy) { uso.hoy += f.consultas; uso.vozHoy += f.voz_caracteres; }
  }
  return { admin, usuario: data.user, plan, uso };
}

type Quien = { plan: "gratis" | "pago"; uso: { hoy: number; mes: number; total: number; vozHoy: number; vozTotal: number } };
/** Devuelve el aviso de tope si la persona ya no puede hacer otra consulta; si puede, null. */
export function topeConsulta(q: Quien): string | null {
  if (q.plan === "gratis") return q.uso.total >= TOPES.gratis.total ? "Ya usaste tu consulta de bienvenida. Con el plan completo tienes 5 consultas por día con tu astrólogo." : null;
  if (q.uso.hoy >= TOPES.pago.dia) return `Llegaste a las ${TOPES.pago.dia} consultas de hoy. Mañana seguimos.`;
  if (q.uso.mes >= TOPES.pago.mes) return `Llegaste a las ${TOPES.pago.mes} consultas de este mes. Se renuevan el día 1.`;
  return null;
}
export function topeVoz(q: Quien, caracteres: number): boolean {
  return q.plan === "gratis" ? q.uso.vozTotal + caracteres > TOPES.gratis.vozTotal : q.uso.vozHoy + caracteres > TOPES.pago.vozDia;
}
