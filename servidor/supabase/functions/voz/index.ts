// Voz del astrólogo. La clave de Google vive solo acá, como secreto del servidor.
import { CORS, identificar, responder, topeVoz } from "../_compartido/comun.ts";

const VOZ_PERMITIDA = /^es-[A-Z0-9]{2,3}-(Wavenet|Standard)-[A-Z]$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return responder({ error: "Método no permitido" }, 405);

  const quien = await identificar(req);
  if ("error" in quien) return quien.error;

  let c: { texto?: string; voz?: string; lang?: string; pitch?: number; rate?: number };
  try { c = await req.json(); } catch { return responder({ error: "Pedido inválido" }, 400); }
  const texto = String(c.texto ?? "").slice(0, 4500);
  if (!texto.trim() || !VOZ_PERMITIDA.test(String(c.voz))) return responder({ error: "Pedido de voz inválido" }, 400);
  if (topeVoz(quien, texto.length)) return responder({ error: "Llegaste al tope de voz.", tope: true }, 429);

  const r = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": Deno.env.get("GOOGLE_TTS_KEY")! },
    body: JSON.stringify({
      input: { text: texto },
      voice: { languageCode: String(c.voz).slice(0, 5), name: c.voz },
      audioConfig: { audioEncoding: "MP3", pitch: Math.max(-10, Math.min(10, Number(c.pitch) || 0)), speakingRate: Math.max(0.7, Math.min(1.3, Number(c.rate) || 1)) },
    }),
  });
  const j = await r.json();
  if (!r.ok) return responder({ error: j?.error?.message ?? "No se pudo generar la voz" }, 502);
  await quien.admin.rpc("sumar_uso", { p_usuario: quien.usuario.id, p_consultas: 0, p_voz: texto.length });
  return responder({ audio: j.audioContent });
});
