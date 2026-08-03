// Motor único de evaluación y cálculo de indicadores.
// Toda la app (formularios, dashboard e informes Word) debe usar estas funciones
// para que un mismo dato produzca siempre el mismo semáforo y la misma métrica.

export type Semaforo = "verde" | "amarillo" | "rojo" | "gris";

export type ReglaPunto = {
  tipo: string;
  unidad?: string | null;
  min_ok?: number | null;
  max_ok?: number | null;
  min_alerta?: number | null;
  max_alerta?: number | null;
  valores_count?: number | null;
  /** Respuesta considerada correcta en preguntas Sí/No. Por defecto "No". */
  respuesta_esperada?: string | null;
  /** Semáforo aplicado cuando la respuesta no es la esperada: "alerta" | "falla". */
  severidad?: string | null;
  obligatorio?: boolean | null;
};

const ORDEN: Record<Semaforo, number> = { gris: 0, verde: 1, amarillo: 2, rojo: 3 };

/** Devuelve el semáforo más crítico de una lista. */
export function peor(estados: Semaforo[]): Semaforo {
  return estados.reduce<Semaforo>((acc, e) => (ORDEN[e] > ORDEN[acc] ? e : acc), "gris");
}

/** Separa un valor multivaluado "R|S|T" en sus lecturas no vacías. */
export function partirValores(valor?: string | null): string[] {
  return String(valor ?? "")
    .split("|")
    .map((v) => v.trim())
    .filter((v) => v !== "");
}

export function aNumero(v: string): number | null {
  if (!/^-?\d+([.,]\d+)?$/.test(v.trim())) return null;
  const n = parseFloat(v.trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function severidadA(regla: ReglaPunto): Semaforo {
  return (regla.severidad ?? "alerta") === "falla" ? "rojo" : "amarillo";
}

/** Evalúa una lectura numérica contra los umbrales OK / Alerta. */
export function evaluarNumero(n: number, r: ReglaPunto): Semaforo {
  const { min_ok, max_ok, min_alerta, max_alerta } = r;
  const dentro = (lo?: number | null, hi?: number | null) =>
    (lo == null || n >= lo) && (hi == null || n <= hi);

  if (min_ok != null || max_ok != null) {
    if (dentro(min_ok, max_ok)) return "verde";
    if ((min_alerta != null || max_alerta != null) && dentro(min_alerta, max_alerta)) return "amarillo";
    return "rojo";
  }
  if (min_alerta != null || max_alerta != null) {
    return dentro(min_alerta, max_alerta) ? "verde" : "rojo";
  }
  return "verde";
}

/**
 * Evalúa un punto completo. `estadoManual` es la excepción declarada por el
 * técnico (OK / ALERTA / FALLA / NA) y siempre tiene prioridad.
 */
export function evaluarPunto(
  valor: string | undefined | null,
  regla: ReglaPunto,
  estadoManual?: string | null,
): Semaforo {
  switch (estadoManual) {
    case "NA":
      return "gris";
    case "OK":
      return "verde";
    case "ALERTA":
      return "amarillo";
    case "FALLA":
      return "rojo";
  }

  if (regla.tipo === "binario") {
    const v = (valor ?? "").trim();
    if (v === "") return "gris";
    const esperada = (regla.respuesta_esperada ?? "No").trim();
    return v.toLowerCase() === esperada.toLowerCase() ? "verde" : severidadA(regla);
  }

  if (regla.tipo === "texto" || regla.tipo === "estado") {
    return (valor ?? "").trim() !== "" ? "verde" : "gris";
  }

  const partes = partirValores(valor);
  if (partes.length === 0) return "gris";
  return peor(
    partes.map((p) => {
      const n = aNumero(p);
      return n == null ? ("gris" as Semaforo) : evaluarNumero(n, regla);
    }),
  );
}

// ---------------------------------------------------------------------------
// Validación de captura
// ---------------------------------------------------------------------------

export const MAX_VALORES = 3;

export function cantidadValores(r: ReglaPunto): number {
  return Math.max(1, Math.min(MAX_VALORES, r.valores_count ?? 1));
}

export type ResultadoValidacion = {
  /** Mensaje por cada casilla (cadena vacía si es válida). */
  porValor: string[];
  /** Mensaje que aplica al punto completo. */
  global: string;
  bloqueante: boolean;
};

export function validarNumerico(r: ReglaPunto, raw: string | undefined | null): ResultadoValidacion {
  const count = cantidadValores(r);
  const parts = String(raw ?? "").split("|").slice(0, count);
  while (parts.length < count) parts.push("");

  const porValor = new Array<string>(count).fill("");
  let llenos = 0;
  let bloqueante = false;

  for (let i = 0; i < count; i++) {
    const v = (parts[i] ?? "").trim();
    if (v === "") continue;
    llenos++;
    const n = aNumero(v);
    if (n == null) {
      porValor[i] = "Formato numérico inválido";
      bloqueante = true;
      continue;
    }
    if (r.min_alerta != null && r.max_alerta != null) {
      const span = Math.max(1, r.max_alerta - r.min_alerta);
      if (n < r.min_alerta - span * 2 || n > r.max_alerta + span * 2) {
        porValor[i] = `Fuera de rango razonable (${r.min_alerta}–${r.max_alerta}${r.unidad ? " " + r.unidad : ""})`;
        bloqueante = true;
      }
    }
  }

  let global = "";
  if (count > 1 && llenos > 0 && llenos < count) {
    global = `Faltan valores: se esperan ${count} lecturas (${llenos} completadas)`;
    bloqueante = true;
  }
  return { porValor, global, bloqueante };
}

// ---------------------------------------------------------------------------
// Indicadores agregados
// ---------------------------------------------------------------------------

export type ResumenItem = { equipo_id: string; semaforo?: string | null };

export type Resumen = {
  ok: number;
  alerta: number;
  falla: number;
  na: number;
  /** Puntos evaluables (excluye equipos en Stand By). */
  total: number;
  /** Puntos con dato registrado. */
  registrados: number;
  /** % de avance de captura. */
  completitud: number;
  /**
   * Disponibilidad = puntos conformes sobre puntos efectivamente evaluados
   * (verde + amarillo + rojo). Los N/A y los Stand By no penalizan.
   */
  disponibilidad: number;
};

export function resumir(
  items: ResumenItem[],
  totalPuntos: number,
  standby: Set<string> | string[] = [],
): Resumen {
  const sb = standby instanceof Set ? standby : new Set(standby);
  const activos = items.filter((i) => !sb.has(i.equipo_id));
  const cuenta = (s: string) => activos.filter((i) => i.semaforo === s).length;
  const ok = cuenta("verde");
  const alerta = cuenta("amarillo");
  const falla = cuenta("rojo");
  const na = cuenta("gris");
  const evaluados = ok + alerta + falla;
  return {
    ok,
    alerta,
    falla,
    na,
    total: totalPuntos,
    registrados: activos.length,
    completitud: totalPuntos ? Math.round((activos.length / totalPuntos) * 100) : 0,
    disponibilidad: evaluados ? Math.round((ok / evaluados) * 100) : 0,
  };
}

/** Etiqueta legible del semáforo, usada en UI e informes. */
export function etiquetaSemaforo(s?: string | null): string {
  switch (s) {
    case "verde":
      return "Conforme";
    case "amarillo":
      return "Alerta";
    case "rojo":
      return "No conforme";
    default:
      return "No aplica";
  }
}
