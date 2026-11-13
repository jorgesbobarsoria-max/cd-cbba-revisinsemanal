import type { Semaforo } from "@/lib/evaluacion";

export type OpcionParametro = { valor: string; etiqueta: string; semaforo: Semaforo };
type ParametroSeleccion = {
  tipo: string; descripcion?: string; opciones?: unknown;
  respuesta_esperada?: string | null; severidad?: string | null;
};

export function opcionesParametro(p: ParametroSeleccion): OpcionParametro[] {
  if (Array.isArray(p.opciones) && p.opciones.length > 0) {
    const validas = p.opciones.filter((o): o is OpcionParametro =>
      o != null && typeof o === "object" && typeof o.valor === "string" && o.valor.trim() !== "" &&
      typeof o.etiqueta === "string" && o.etiqueta.trim() !== "" &&
      ["verde", "amarillo", "rojo", "gris"].includes(o.semaforo));
    if (validas.length > 0) return validas;
  }
  const d = (p.descripcion ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const estados = (etiquetas: string[]): OpcionParametro[] => etiquetas.map((etiqueta, i) => ({
    valor: etiqueta, etiqueta, semaforo: i === 0 ? "verde" : i === 1 ? "amarillo" : "rojo",
  }));
  if (p.tipo === "estado") {
    if (/filtro/.test(d)) return estados(["Limpio", "Sucio", "Obstruido / requiere cambio"]);
    if (/calidad.*frio/.test(d)) return estados(["Adecuada", "Insuficiente", "Sin enfriamiento"]);
    if (/modo.*opera/.test(d)) return estados(["Automático", "Manual", "Fuera de servicio"]);
    if (/prueba|transferencia/.test(d)) return estados(["Exitosa", "Con anomalías", "Fallida"]);
    if (/armado/.test(d)) return estados(["Armado", "Desarmado", "Falla del sistema"]);
    if (/fuga|alerta/.test(d)) return estados(["No presentes", "Presentes", "Críticas"]);
    return estados(["Operativo", "Con anomalías", "Fuera de servicio"]);
  }
  let etiquetas = ["No", "Sí"];
  if (/alerta/.test(d)) etiquetas = ["No · sin alertas", "Sí · alertas presentes"];
  else if (/fuga/.test(d)) etiquetas = ["No · sin fugas", "Sí · fugas presentes"];
  else if (/ruido/.test(d)) etiquetas = ["No · sin ruidos anormales", "Sí · ruidos anormales"];
  else if (/transferencia|encendido|apagado/.test(d)) etiquetas = ["No · no realizado", "Sí · realizado"];
  else if (/operativo|ventilador|activo/.test(d)) etiquetas = ["No · inactivo", "Sí · operativo"];
  return ["No", "Sí"].map((valor, i) => ({ valor, etiqueta: etiquetas[i],
    semaforo: valor.toLowerCase() === (p.respuesta_esperada ?? "No").trim().toLowerCase()
      ? "verde" : p.severidad === "falla" ? "rojo" : "amarillo",
  }));
}