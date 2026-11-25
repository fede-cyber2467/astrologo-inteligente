// Consulta al astrólogo inteligente. La clave de Claude vive solo acá, como secreto del servidor.
// La app envía las instrucciones, la conversación y las herramientas; el servidor fija el modelo y los límites.
import { CORS, identificar, responder, topeConsulta } from "../_compartido/comun.ts";

const MODELO = "claude-sonnet-5-5";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return responder({ error: "Método no permitido" }, 405);

  const quien = await identificar(req);
  if ("error" in quien) return quien.error;

  let cuerpo: { system?: unknown; messages?: Array<{ role: string; content: unknown }>; tools?: unknown[] };
  try { cuerpo = await req.json(); } catch { return responder({ error: "Pedido inválido" }, 400); }
  const mensajes = cuerpo.messages;
  if (!Array.isArray(mensajes) || !mensajes.length || mensajes.length > 80) return responder({ error: "Conversación inválida o demasiado larga. Empieza una nueva." }, 400);
  if (JSON.stringify(cuerpo).length > 400_000) return responder({ error: "La conversación es demasiado larga. Empieza una nueva." }, 413);

  // Cuenta como consulta solo lo que escribe la persona, no las idas y vueltas internas de las herramientas
  const ultimo = mensajes[mensajes.length - 1];
  const esPregunta = ultimo.role === "user" && typeof ultimo.content === "string";
  const aviso = esPregunta ? topeConsulta(quien) : null;
  if (aviso) return responder({ error: aviso, tope: true, plan: quien.plan }, 429);

  const pedido = (conRespaldo: boolean) => fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
      "anthropic-version": "2026-10-21",
      ...(conRespaldo ? { "anthropic-beta": "server-side-fallback-2026-07-01" } : {}),
    },
    body: JSON.stringify({
      model: MODELO, max_tokens: 16000, thinking: { type: "adaptive" }, output_config: { effort: "medium" },
      system: cuerpo.system, tools: cuerpo.tools, messages: mensajes,
      ...(conRespaldo ? { fallbacks: "default" } : {}),
    }),
  });

  let r = await pedido(true);
  if (r.status === 400) {
    const texto = await r.clone().text();
    if (/fallback|beta/i.test(texto)) r = await pedido(false);
  }
  if (r.ok && esPregunta) await quien.admin.rpc("sumar_uso", { p_usuario: quien.usuario.id, p_consultas: 1, p_voz: 0 });
  return new Response(r.body, { status: r.status, headers: { ...CORS, "Content-Type": "application/json" } });
});
