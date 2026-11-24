// Utilidades compartidas por las funciones del servidor.
import { createClient } from "jsr:@supabase/supabase-js@2";

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Topes diarios por plan
export const TOPES = {
  gratis: { consultas: 3, voz: 3000 },
  pago: { consultas: 20, voz: 40000 },
};

export function responder(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: { ...CORS, "Content-Type": "application/json" } });
}

/** Identifica a la persona por su sesión y devuelve su plan vigente y su uso de hoy. */
export async function identificar(req: Request) {
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return { error: responder({ error: "Inicia sesión para usar el astrólogo inteligente." }, 401) };
  const { data: cuenta } = await admin.from("cuentas").select("plan, plan_hasta").eq("id", data.user.id).maybeSingle();
  const pago = cuenta?.plan === "pago" && (!cuenta.plan_hasta || new Date(cuenta.plan_hasta) > new Date());
  const plan: "gratis" | "pago" = pago ? "pago" : "gratis";
  const { data: uso } = await admin.rpc("sumar_uso", { p_usuario: data.user.id, p_consultas: 0, p_voz: 0 });
  return { admin, usuario: data.user, plan, tope: TOPES[plan], uso: uso?.[0] ?? { consultas: 0, voz_caracteres: 0 } };
}
