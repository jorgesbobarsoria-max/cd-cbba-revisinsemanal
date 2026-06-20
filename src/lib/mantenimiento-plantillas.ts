// Plantillas de mantenimiento preventivo basadas en los informes oficiales
// de ENDE TECNOLOGÍAS S.A. (Climatización, Energía, UPS, Generador, Sistema
// Supresor de Incendios y Micro Data Center).

export type ItemTipo = "binario" | "numerico" | "texto" | "opcion" | "trio";

export type ItemPlantilla = {
  k: string;            // clave única dentro del mantenimiento
  l: string;            // label
  t: ItemTipo;
  u?: string;           // unidad (numérico)
  o?: string[];         // opciones (opcion / binario custom)
  ph?: string;          // placeholder
};

export type SeccionPlantilla = { titulo: string; items: ItemPlantilla[] };

export type Plantilla = {
  id: string;
  nombre: string;
  icon: string; // emoji para UI
  categoriaEquipo: string | null; // categoría de "equipos" asociada (null si no aplica)
  secciones: SeccionPlantilla[];
};

const SI_NO: ItemPlantilla["t"] = "binario";

// ---------- Climatización ----------
const climaSecciones: SeccionPlantilla[] = [
  {
    titulo: "Circuitos de refrigeración",
    items: [
      { k: "diam_descarga", l: "Diámetro tubería de descarga (gas)", t: "numerico", u: "mm/plg" },
      { k: "aisl_descarga", l: "Aislamiento de la tubería de descarga", t: SI_NO },
      { k: "diam_liquido", l: "Diámetro tubería de líquido", t: "numerico", u: "mm/plg" },
      { k: "aisl_liquido", l: "Aislamiento de la tubería de líquido", t: SI_NO },
      { k: "long_tuberias", l: "Longitud tubería frigorífica", t: "numerico", u: "m" },
      { k: "num_curvas", l: "Nº curvas en tuberías", t: "numerico" },
      { k: "desnivel", l: "Desnivel equipo interno/externo", t: "numerico", u: "m" },
    ],
  },
  {
    titulo: "Vacío y carga de refrigerante",
    items: [
      { k: "fugas", l: "Comprobación de fugas (N₂ seco)", t: SI_NO },
      { k: "vacio", l: "Valor del vacío", t: "numerico", u: "mmHg/μ" },
      { k: "refrigerante", l: "Tipo de refrigerante", t: "opcion", o: ["R22", "R407c", "R410a", "R32"] },
      { k: "carga_kg", l: "Carga", t: "numerico", u: "kg" },
    ],
  },
  {
    titulo: "Componentes y funcionamiento",
    items: [
      { k: "temp_int", l: "Temperatura interior", t: "numerico", u: "°C" },
      { k: "hum_int", l: "Humedad interior", t: "numerico", u: "%" },
      { k: "temp_ext", l: "Temperatura exterior", t: "numerico", u: "°C" },
      { k: "alarma_vent", l: "Alarma de ventilador", t: SI_NO },
      { k: "sentido_giro_vent", l: "Sentido de giro ventilador", t: SI_NO },
      { k: "alim_vent", l: "Alimentación ventilador", t: "trio", u: "V" },
      { k: "corr_vent", l: "Corriente ventilador", t: "trio", u: "A" },
      { k: "presion_baja", l: "Presión aspiración (baja)", t: "numerico", u: "PSI" },
      { k: "presion_alta", l: "Presión descarga (alta)", t: "numerico", u: "PSI" },
      { k: "temp_desc_comp", l: "Temp. descarga compresor", t: "numerico", u: "°C" },
      { k: "alim_comp", l: "Alimentación compresor", t: "trio", u: "V" },
      { k: "corr_comp", l: "Corriente compresor", t: "trio", u: "A" },
    ],
  },
  {
    titulo: "Descarga de condensación",
    items: [
      { k: "sifones", l: "Presencia de sifones", t: SI_NO },
      { k: "drenaje", l: "Drenaje correcto de agua", t: SI_NO },
      { k: "estanqueidad", l: "Estanqueidad de conexiones", t: SI_NO },
      { k: "bomba_desc", l: "Bomba de descarga OK", t: SI_NO },
    ],
  },
  {
    titulo: "Alimentación eléctrica",
    items: [
      { k: "ajuste_bornes", l: "Ajuste de bornes y conexiones", t: SI_NO },
      { k: "cable_seccion", l: "Cable de alimentación y sección", t: SI_NO },
      { k: "diam_cable", l: "Diámetro del cable", t: "numerico", u: "mm²/AWG" },
      { k: "alim_princ", l: "Alimentación principal", t: "trio", u: "V" },
      { k: "corr_abs", l: "Corriente absorbida", t: "trio", u: "A" },
      { k: "frecuencia", l: "Frecuencia", t: "numerico", u: "Hz" },
      { k: "secuencia_fases", l: "Secuencia de fases correcta", t: SI_NO },
    ],
  },
  {
    titulo: "Control y setup",
    items: [
      { k: "display", l: "Tarjeta de control y display", t: SI_NO },
      { k: "factory_setup", l: "Parámetros factory setup", t: SI_NO },
      { k: "alarmas", l: "Activación de alarmas/avisos", t: SI_NO },
      { k: "setpoint_temp", l: "Set Point temperatura", t: "numerico", u: "°C" },
      { k: "setpoint_hum", l: "Set Point humedad", t: "numerico", u: "%" },
      { k: "humidificador", l: "Humidificador habilitado", t: SI_NO },
      { k: "teamwork", l: "Teamwork mode", t: "opcion", o: ["No", "1", "2"] },
    ],
  },
];

// ---------- UPS ----------
const upsSecciones: SeccionPlantilla[] = [
  {
    titulo: "Montaje de la unidad",
    items: [
      { k: "capacidad", l: "Capacidad de la unidad", t: "numerico", u: "kVA/kW" },
      { k: "montaje", l: "Unidad montada en", t: "opcion", o: ["Rack", "Tower"] },
      { k: "anclajes", l: "Sujeción anclajes (Tower)", t: SI_NO },
      { k: "soportes", l: "Sujeción soportes (Rack)", t: SI_NO },
      { k: "ventilacion", l: "Ventilación adecuada", t: SI_NO },
      { k: "aterramiento", l: "Aterramiento eléctrico", t: SI_NO },
      { k: "aterramiento_ohm", l: "Resistencia tierra", t: "numerico", u: "Ω" },
      { k: "bypass_ext", l: "Bypass de mantenimiento externo", t: "opcion", o: ["POD", "Local", "Interno", "Ninguno"] },
    ],
  },
  {
    titulo: "Entrada eléctrica",
    items: [
      { k: "prog_v_in", l: "Programación voltaje entrada", t: "numerico", u: "V" },
      { k: "ajuste_bornes_in", l: "Ajuste de bornes", t: SI_NO },
      { k: "termico_in", l: "Térmico de protección", t: "numerico", u: "A" },
      { k: "cable_in", l: "Cable y sección OK", t: SI_NO },
      { k: "termografia_in", l: "Verificación termográfica", t: SI_NO },
      { k: "diam_cable_in", l: "Diámetro cable", t: "numerico", u: "mm²/AWG" },
      { k: "alim_ll_in", l: "Alimentación L-L (U/V/W)", t: "trio", u: "V" },
      { k: "alim_ln_in", l: "Alimentación L-N (R/S/T)", t: "trio", u: "V" },
      { k: "corr_in", l: "Corriente de línea", t: "trio", u: "A" },
      { k: "nt_in", l: "Neutro - Tierra", t: "numerico", u: "V" },
      { k: "frec_in", l: "Frecuencia entrada", t: "numerico", u: "Hz" },
      { k: "fases_in", l: "Secuencia de fases", t: SI_NO },
    ],
  },
  {
    titulo: "Bypass",
    items: [
      { k: "termico_bp", l: "Térmico de protección", t: "numerico", u: "A" },
      { k: "cable_bp", l: "Cable y sección OK", t: SI_NO },
      { k: "termografia_bp", l: "Verificación termográfica", t: SI_NO },
      { k: "alim_bp", l: "Alimentación bypass", t: "trio", u: "V" },
      { k: "frec_bp", l: "Frecuencia bypass", t: "numerico", u: "Hz" },
      { k: "fases_bp", l: "Secuencia de fases", t: SI_NO },
    ],
  },
  {
    titulo: "Salida eléctrica",
    items: [
      { k: "prog_v_out", l: "Programación voltaje salida", t: "numerico", u: "V" },
      { k: "ajuste_bornes_out", l: "Ajuste de bornes", t: SI_NO },
      { k: "termico_out", l: "Térmico de protección", t: "numerico", u: "A" },
      { k: "cable_out", l: "Cable y sección OK", t: SI_NO },
      { k: "termografia_out", l: "Verificación termográfica", t: SI_NO },
      { k: "diam_cable_out", l: "Diámetro cable", t: "numerico", u: "mm²/AWG" },
      { k: "alim_ll_out", l: "Alimentación regulada L-L", t: "trio", u: "V" },
      { k: "alim_ln_out", l: "Alimentación regulada L-N", t: "trio", u: "V" },
      { k: "corr_out", l: "Corriente de línea", t: "trio", u: "A" },
      { k: "pot_out", l: "Potencia entregada", t: "trio", u: "W" },
      { k: "carga_pct", l: "Nivel de carga", t: "trio", u: "%" },
      { k: "nt_out", l: "Neutro - Tierra", t: "numerico", u: "V" },
      { k: "frec_out", l: "Frecuencia salida", t: "numerico", u: "Hz" },
      { k: "fases_out", l: "Secuencia de fases", t: SI_NO },
    ],
  },
  {
    titulo: "Baterías",
    items: [
      { k: "banco", l: "Banco de baterías", t: "opcion", o: ["Interno", "Externo"] },
      { k: "tipo_bat", l: "Tipo de batería", t: "opcion", o: ["VRLA", "Litio", "Modular", "Flooded"] },
      { k: "capacidad_celda_w", l: "Capacidad por celda", t: "numerico", u: "W" },
      { k: "capacidad_celda_ah", l: "Capacidad por celda", t: "numerico", u: "Ah" },
      { k: "cant_bat", l: "Cantidad de baterías", t: "numerico" },
      { k: "prueba_auto", l: "Prueba automática de baterías", t: SI_NO },
      { k: "analisis", l: "Análisis de baterías", t: SI_NO },
      { k: "autonomia", l: "Autonomía aproximada", t: "numerico", u: "min" },
    ],
  },
  {
    titulo: "Control, monitoreo y pruebas",
    items: [
      { k: "display", l: "Funcionamiento display/LED", t: SI_NO },
      { k: "factory_setup", l: "Parámetros factory setup", t: SI_NO },
      { k: "epo", l: "Activación botón EPO", t: SI_NO },
      { k: "arranque_auto", l: "Arranque automático tras corte", t: SI_NO },
      { k: "tarjeta_red", l: "Tarjeta de red", t: SI_NO },
      { k: "ip", l: "Dirección IP", t: "texto", ph: "192.168.1.10" },
      { k: "netmask", l: "Netmask", t: "texto" },
      { k: "gateway", l: "Gateway", t: "texto" },
      { k: "snmp", l: "Comunidad SNMP", t: "texto" },
      { k: "prueba_sin", l: "Autonomía sin carga (min)", t: "numerico", u: "min" },
      { k: "prueba_con", l: "Autonomía con carga (min)", t: "numerico", u: "min" },
    ],
  },
];

// ---------- ATS ----------
const atsSecciones: SeccionPlantilla[] = [
  {
    titulo: "Verificación general",
    items: [
      { k: "v_entrada", l: "Voltaje de entrada de fábrica", t: "numerico", u: "V" },
      { k: "ajuste_bornes", l: "Apriete de bornes y conexiones", t: SI_NO },
      { k: "termico", l: "Térmico de protección", t: "numerico", u: "A" },
      { k: "cable", l: "Cable y sección OK", t: SI_NO },
      { k: "diam_cable", l: "Diámetro del cable", t: "numerico", u: "mm²/AWG" },
    ],
  },
  {
    titulo: "Parámetros eléctricos",
    items: [
      { k: "alim_ll", l: "Alimentación L-L (U/V/W)", t: "trio", u: "V" },
      { k: "alim_ln", l: "Alimentación L-N (R/S/T)", t: "trio", u: "V" },
      { k: "corriente", l: "Corriente de línea", t: "trio", u: "A" },
      { k: "nt", l: "Neutro - Tierra", t: "numerico", u: "V" },
      { k: "frecuencia", l: "Frecuencia", t: "numerico", u: "Hz" },
      { k: "fases", l: "Secuencia de fases correcta", t: SI_NO },
    ],
  },
  {
    titulo: "Pruebas funcionales",
    items: [
      { k: "act_manual", l: "Activación manual con ATS", t: SI_NO },
      { k: "act_auto", l: "Activación automática con ATS", t: SI_NO },
    ],
  },
];

// ---------- Grupo Generador ----------
const genSecciones: SeccionPlantilla[] = [
  {
    titulo: "Montaje",
    items: [
      { k: "anclajes", l: "Anclajes en suelo", t: SI_NO },
      { k: "antivibracion", l: "Soportes antivibración", t: SI_NO },
      { k: "escape", l: "Escape metálico", t: SI_NO },
      { k: "ventilacion", l: "Ventilación adecuada", t: SI_NO },
      { k: "cabinado", l: "Cabinado de fábrica", t: SI_NO },
      { k: "instalacion", l: "Instalado en", t: "opcion", o: ["Interior", "Exterior"] },
      { k: "aterramiento", l: "Aterramiento eléctrico", t: SI_NO },
      { k: "tanque", l: "Tanque de combustible", t: "opcion", o: ["Interno", "Externo"] },
    ],
  },
  {
    titulo: "Control",
    items: [
      { k: "panel", l: "Funcionamiento del panel", t: SI_NO },
      { k: "alarmas", l: "Alarmas presentes", t: SI_NO },
      { k: "emergencia", l: "Botón de emergencia", t: SI_NO },
    ],
  },
  {
    titulo: "Parámetros de funcionamiento",
    items: [
      { k: "bat_estado", l: "Estado de batería(s)", t: SI_NO },
      { k: "bat_v", l: "Voltaje de batería", t: "numerico", u: "V" },
      { k: "aceite", l: "Nivel de aceite", t: "opcion", o: ["Ok", "Requiere cambio"] },
      { k: "filtro_aceite", l: "Filtro de aceite", t: "opcion", o: ["Ok", "Requiere cambio"] },
      { k: "combustible", l: "Nivel de combustible", t: "numerico", u: "%" },
      { k: "horas", l: "Horas de funcionamiento", t: "numerico", u: "h" },
      { k: "filtro_comb", l: "Filtro de combustible", t: "opcion", o: ["Ok", "Requiere cambio"] },
      { k: "tanque_estado", l: "Estado del tanque", t: "opcion", o: ["Ok", "Requiere limpieza"] },
      { k: "filtro_aire", l: "Filtro de aire", t: "opcion", o: ["Ok", "Requiere cambio"] },
      { k: "refrigerante", l: "Líquido refrigerante", t: "opcion", o: ["Ok", "Requiere adición"] },
      { k: "escape_estado", l: "Sistema de escape", t: "opcion", o: ["Ok", "Requiere reparación"] },
    ],
  },
  {
    titulo: "Provisión de energía",
    items: [
      { k: "v_entrada", l: "Voltaje de entrada", t: "numerico", u: "V" },
      { k: "ajuste_bornes", l: "Apriete bornes y conexiones", t: SI_NO },
      { k: "termico", l: "Térmico de protección", t: "numerico", u: "A" },
      { k: "cable", l: "Cable y sección OK", t: SI_NO },
      { k: "diam_cable", l: "Diámetro del cable", t: "numerico", u: "mm²/AWG" },
      { k: "alim_ll", l: "Alimentación L-L", t: "trio", u: "V" },
      { k: "alim_ln", l: "Alimentación L-N", t: "trio", u: "V" },
      { k: "corriente", l: "Corriente de línea", t: "trio", u: "A" },
      { k: "nt", l: "Neutro - Tierra", t: "numerico", u: "V" },
      { k: "frecuencia", l: "Frecuencia", t: "numerico", u: "Hz" },
      { k: "fases", l: "Secuencia de fases", t: SI_NO },
    ],
  },
  {
    titulo: "Pruebas",
    items: [
      { k: "prueba_sin", l: "Autonomía sin carga", t: "numerico", u: "min" },
      { k: "prueba_con", l: "Autonomía con carga", t: "numerico", u: "min" },
      { k: "ats_manual", l: "Activación manual con ATS", t: SI_NO },
      { k: "ats_auto", l: "Activación automática con ATS", t: SI_NO },
    ],
  },
];

// ---------- Sistema Supresor de Incendios ----------
const incSecciones: SeccionPlantilla[] = [
  {
    titulo: "Dispositivos y datos eléctricos",
    items: [
      { k: "sen_ion", l: "Sensores de ionización", t: "numerico" },
      { k: "sen_foto", l: "Sensores fotoeléctricos", t: "numerico" },
      { k: "estrobos", l: "Cantidad de estrobos", t: "numerico" },
      { k: "manual_abort", l: "Descarga manual / Abort", t: "numerico" },
      { k: "termico", l: "Térmico de protección", t: "numerico", u: "A" },
      { k: "v_alim", l: "Voltaje de alimentación", t: "numerico", u: "V" },
      { k: "v_bat", l: "Voltaje de baterías", t: "numerico", u: "V" },
    ],
  },
  {
    titulo: "Prueba funcional",
    items: [
      { k: "led_prueba", l: "Conexión solenoide reemplazada con LED", t: SI_NO },
      { k: "presion_ri", l: "Presión cilindro RI", t: "numerico", u: "PSI" },
      { k: "presion_cv", l: "Presión cilindro CV", t: "numerico", u: "PSI" },
      { k: "presion_rd", l: "Presión cilindro RD", t: "numerico", u: "PSI" },
      { k: "trouble", l: "Indicador Trouble/Abort activo", t: SI_NO },
      { k: "bocina", l: "Suena alarma audible del sistema", t: SI_NO },
      { k: "abort_ok", l: "Sistema vuelve a normal soltando Abort", t: SI_NO },
      { k: "led_desarmado", l: "LED activo en descarga manual desarmado", t: SI_NO },
      { k: "audibles_z1", l: "Alarmas audibles Zona 1 OK", t: SI_NO },
      { k: "led_sensor_z1", l: "LED roja sensor Z1", t: SI_NO },
      { k: "tono_panel", l: "Tono audible del panel", t: SI_NO },
      { k: "led_sensor_z2", l: "LED roja sensor Z2", t: SI_NO },
      { k: "abort_temporizador", l: "Abort detiene temporizador", t: SI_NO },
      { k: "reinicio_conteo", l: "Reinicia conteo al soltar Abort", t: SI_NO },
      { k: "led_demora", l: "LED de prueba de descarga (demora)", t: SI_NO },
      { k: "estrobos_ok", l: "Estroboscópicas se activaron", t: SI_NO },
      { k: "vuelve_normal", l: "Sistema vuelve a normal (10 min)", t: SI_NO },
      { k: "operativo_10min", l: "Sigue operativo después de 10 min", t: SI_NO },
    ],
  },
  {
    titulo: "Prueba de respaldo eléctrico",
    items: [
      { k: "anuncio_falla", l: "Sistema anuncia falla al cortar CA", t: SI_NO },
      { k: "sigue_operativo", l: "Sigue operativo sin CA", t: SI_NO },
    ],
  },
];

// ---------- Micro Data Center (MDC monofásico) ----------
const mdcSecciones: SeccionPlantilla[] = [
  {
    titulo: "Montaje del MDC",
    items: [
      { k: "capacidad_ups", l: "Capacidad del UPS", t: "numerico", u: "kVA/kW" },
      { k: "montaje", l: "Unidad montada en", t: "opcion", o: ["Rack", "Tower"] },
      { k: "anclajes", l: "Sujeción anclajes/soportes", t: SI_NO },
      { k: "aterramiento", l: "Aterramiento eléctrico", t: SI_NO },
      { k: "aterramiento_ohm", l: "Resistencia tierra", t: "numerico", u: "Ω" },
      { k: "aisl_desc", l: "Aislamiento descarga (clima)", t: SI_NO },
      { k: "aisl_liq", l: "Aislamiento líquido (clima)", t: SI_NO },
      { k: "desnivel", l: "Desnivel equipo interno/externo", t: "numerico", u: "m" },
    ],
  },
  {
    titulo: "Climatización",
    items: [
      { k: "temp_int", l: "Temperatura interior", t: "numerico", u: "°C" },
      { k: "hum_int", l: "Humedad interior", t: "numerico", u: "%" },
      { k: "temp_ext", l: "Temperatura exterior", t: "numerico", u: "°C" },
      { k: "alarma_vent", l: "Alarma de ventilador", t: SI_NO },
      { k: "sentido_giro", l: "Sentido de giro", t: SI_NO },
      { k: "bomba_desc", l: "Bomba de descarga", t: SI_NO },
      { k: "fugas_agua", l: "Ausencia pérdidas agua", t: SI_NO },
      { k: "corr_vent", l: "Corriente ventilador", t: "numerico", u: "A" },
      { k: "presion_gas", l: "Presión gas refrigerante", t: "numerico", u: "PSI" },
    ],
  },
  {
    titulo: "Entrada eléctrica (monofásica)",
    items: [
      { k: "prog_v_in", l: "Programación voltaje entrada", t: "numerico", u: "V" },
      { k: "ajuste_bornes_in", l: "Ajuste de bornes", t: SI_NO },
      { k: "termico_in", l: "Térmico de protección", t: "numerico", u: "A" },
      { k: "cable_in", l: "Cable y sección OK", t: SI_NO },
      { k: "diam_cable_in", l: "Diámetro cable", t: "numerico", u: "mm²/AWG" },
      { k: "alim_in", l: "Alimentación (Fase-Neutro)", t: "numerico", u: "V" },
      { k: "corr_in", l: "Corriente entrada", t: "numerico", u: "A" },
      { k: "nt_in", l: "Neutro-Tierra", t: "numerico", u: "V" },
      { k: "frec_in", l: "Frecuencia entrada", t: "numerico", u: "Hz" },
    ],
  },
  {
    titulo: "Pruebas",
    items: [
      { k: "prueba_sin", l: "Autonomía sin carga", t: "numerico", u: "min" },
      { k: "prueba_con", l: "Autonomía con carga", t: "numerico", u: "min" },
    ],
  },
  {
    titulo: "Control y setup",
    items: [
      { k: "display", l: "Funcionamiento display/LED", t: SI_NO },
      { k: "factory_setup", l: "Parámetros factory setup", t: SI_NO },
      { k: "arranque_auto", l: "Arranque automático tras corte", t: SI_NO },
      { k: "tarjeta_red", l: "Tarjeta de red / monitoreo", t: SI_NO },
      { k: "ip", l: "Dirección IP", t: "texto" },
      { k: "netmask", l: "Netmask", t: "texto" },
      { k: "gateway", l: "Gateway", t: "texto" },
    ],
  },
  {
    titulo: "Salida eléctrica (UPS)",
    items: [
      { k: "prog_v_out", l: "Programación voltaje salida", t: "numerico", u: "V" },
      { k: "ajuste_bornes_out", l: "Ajuste de bornes", t: SI_NO },
      { k: "termico_out", l: "Térmico de protección", t: "numerico", u: "A" },
      { k: "cable_out", l: "Cable y sección OK", t: SI_NO },
      { k: "diam_cable_out", l: "Diámetro cable", t: "numerico", u: "mm²/AWG" },
      { k: "alim_out", l: "Alimentación regulada (F-N)", t: "numerico", u: "V" },
      { k: "corr_out", l: "Corriente salida", t: "numerico", u: "A" },
      { k: "pot_out", l: "Potencia entregada", t: "numerico", u: "W" },
      { k: "frec_out", l: "Frecuencia salida", t: "numerico", u: "Hz" },
    ],
  },
  {
    titulo: "Baterías",
    items: [
      { k: "banco", l: "Banco de baterías", t: "opcion", o: ["Interno", "Externo"] },
      { k: "tipo_bat", l: "Tipo de batería", t: "opcion", o: ["VRLA", "Litio"] },
      { k: "capacidad_celda", l: "Capacidad por celda", t: "numerico", u: "W/Ah" },
      { k: "cant_bat", l: "Cantidad de baterías", t: "numerico" },
      { k: "prueba_auto", l: "Prueba automática de baterías", t: SI_NO },
      { k: "analisis", l: "Análisis de baterías", t: SI_NO },
      { k: "autonomia", l: "Autonomía aproximada", t: "numerico", u: "min" },
    ],
  },
];

export const PLANTILLAS: Plantilla[] = [
  { id: "clima",    nombre: "Climatización / Aire de Precisión", icon: "❄️", categoriaEquipo: "Aire de Precisión", secciones: climaSecciones },
  { id: "ups",      nombre: "UPS",                                 icon: "🔋", categoriaEquipo: "UPS",                secciones: upsSecciones },
  { id: "ats",      nombre: "ATS",                                 icon: "🔀", categoriaEquipo: "ATS",                secciones: atsSecciones },
  { id: "gen",      nombre: "Grupo Generador",                     icon: "⚙️", categoriaEquipo: "Grupo Generador",    secciones: genSecciones },
  { id: "supresor", nombre: "Sistema Supresor de Incendios",       icon: "🧯", categoriaEquipo: "Sistema Supresor Incendios", secciones: incSecciones },
  { id: "mdc",      nombre: "Micro Data Center (monofásico)",      icon: "🗄️", categoriaEquipo: null,                 secciones: mdcSecciones },
];

export function getPlantilla(id: string): Plantilla | undefined {
  return PLANTILLAS.find(p => p.id === id);
}
