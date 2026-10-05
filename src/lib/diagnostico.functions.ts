import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const INSTRUCCIONES = `Eres un ingeniero senior de infraestructura de data centers (aires de precisión, UPS, ATS, grupos electrógenos, supresión de incendios, racks y sensores).
Un técnico describe una falla. Analiza su descripción junto con los parámetros configurados del equipo y el historial reciente de revisiones semanales.
Responde en español, en Markdown simple, con estas secciones exactas:
## Resumen
## Causas probables
(lista ordenada de más a menos probable, cada una con su justificación basada en los datos)
## Pasos de revisión
(lista numerada, segura y concreta, empezando por lo menos invasivo)
## Precauciones de seguridad
## Datos que faltan
Sé conciso (máximo ~450 palabras). No inventes valores que no estén en los datos.`;

export const diagnosticarFalla = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      equipo_id: z.string().min(1).max(64),
      descripcion: z.string().trim().min(10, "Describe la falla con más detalle").max(2000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: eq, error: eqErr } = await sb.from("equipos")
      .select("id,tag,categoria,marca,modelo,ubicacion,criticidad,ciudad").eq("id", data.equipo_id).maybeSingle();
    if (eqErr || !eq) throw new Error("Equipo no encontrado.");

    const [{ data: puntos }, { data: insps }] = await Promise.all([
      sb.from("puntos_inspeccion").select("id,descripcion,tipo,unidad,min_ok,max_ok,min_alerta,max_alerta").eq("equipo_id", eq.id),
      sb.from("inspecciones").select("id,fecha,semana,standby_equipos").eq("ciudad", eq.ciudad).order("fecha", { ascending: false }).limit(8),
    ]);
    const ids = (insps ?? []).map((i) => i.id);
    const { data: items } = ids.length
      ? await sb.from("inspeccion_items").select("inspeccion_id,punto_id,valor,semaforo,observaciones,accion_correctiva")
          .eq("equipo_id", eq.id).in("inspeccion_id", ids)
      : { data: [] as never[] };

    const pMap = new Map((puntos ?? []).map((p) => [p.id, p]));
    const historial = (insps ?? []).map((i) => {
      const its = (items ?? []).filter((x) => x.inspeccion_id === i.id);
      const sb = (i.standby_equipos ?? []).includes(eq.id);
      const lineas = its.map((x) => {
        const p = pMap.get(x.punto_id);
        return `  - ${p?.descripcion ?? x.punto_id}: ${x.valor ?? "-"} ${p?.unidad ?? ""} [${x.semaforo ?? "sin estado"}]${x.observaciones ? ` obs: ${x.observaciones}` : ""}${x.accion_correctiva ? ` acción: ${x.accion_correctiva}` : ""}`;
      });
      return `Semana ${i.semana} (${i.fecha})${sb ? " STAND BY" : ""}:\n${lineas.join("\n") || "  (sin registros)"}`;
    }).join("\n");

    const parametros = (puntos ?? []).map((p) =>
      `- ${p.descripcion} (${p.tipo}${p.unidad ? `, ${p.unidad}` : ""}) OK: ${p.min_ok ?? "-"}..${p.max_ok ?? "-"} alerta: ${p.min_alerta ?? "-"}..${p.max_alerta ?? "-"}`).join("\n");

    const alertas = (items ?? []).filter((x) => x.semaforo === "amarillo" || x.semaforo === "rojo").length;

    const prompt = `EQUIPO: ${eq.tag} · ${eq.categoria} · ${[eq.marca, eq.modelo].filter(Boolean).join(" ") || "sin marca/modelo"} · ubicación ${eq.ubicacion ?? "-"} · criticidad ${eq.criticidad ?? "-"} · sitio ${eq.ciudad}

FALLA DESCRITA POR EL TÉCNICO:
${data.descripcion}

PARÁMETROS CONFIGURADOS Y UMBRALES:
${parametros || "(sin parámetros)"}

HISTORIAL RECIENTE (más reciente primero, ${alertas} alertas/fallas en total):
${historial || "(sin revisiones registradas)"}`;

    const { generarTextoIA } = await import("./ai-gateway.server");
    const analisis = await generarTextoIA(INSTRUCCIONES, prompt);
    return { analisis, equipo: eq.tag, revisiones: ids.length, alertas };
  });
