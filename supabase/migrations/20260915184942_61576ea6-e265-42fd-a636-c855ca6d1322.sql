
ALTER TABLE public.equipos ADD COLUMN IF NOT EXISTS ciudad text NOT NULL DEFAULT 'Cochabamba';
ALTER TABLE public.inspecciones ADD COLUMN IF NOT EXISTS ciudad text NOT NULL DEFAULT 'Cochabamba';
CREATE INDEX IF NOT EXISTS idx_equipos_ciudad ON public.equipos(ciudad);
CREATE INDEX IF NOT EXISTS idx_inspecciones_ciudad ON public.inspecciones(ciudad);

INSERT INTO public.equipos (id, ciudad, categoria, tag, marca, modelo, capacidad, ubicacion, criticidad, redundancia, estado, orden, datos_adicionales) VALUES
('LP-ATS-01','La Paz','ATS','ATS-LP','ASCO','Serie 300','230 A','Sala Eléctrica LP','Crítica',NULL,'Operativo',101,'{"IP":"http://10.241.5.13"}'::jsonb),
('LP-GEN-01','La Paz','Grupo Generador','GG-LP','SDMO','J110C','110 KVA','Exterior LP','Crítica',NULL,'Operativo',102,'{"IP":"http://10.241.5.14"}'::jsonb),
('LP-UPS-01','La Paz','UPS','UPS-1 LP','VERTIV','APM 150','60 KVA','Sala UPS LP','Crítica',NULL,'Operativo',103,'{"IP":"http://10.241.5.10"}'::jsonb),
('LP-UPS-02','La Paz','UPS','UPS-2 LP','NEWAVE','UPScale','40 KVA','Sala UPS LP','Crítica',NULL,'Operativo',104,'{"IP":"http://10.241.5.4"}'::jsonb),
('LP-AIR-01','La Paz','Aire de Precisión','AA1','VERTIV','HPM','20 KW','Sala Principal LP','Crítica',NULL,'Operativo',105,'{"IP":"http://10.241.5.11"}'::jsonb),
('LP-INC-01','La Paz','Sistema Supresor Incendios','INC-LP','NOVEC','1230',NULL,'Sala Principal LP','Crítica',NULL,'Operativo',106,'{"IP":"http://10.241.5.15"}'::jsonb),
('LP-RACK-01','La Paz','Rack / Micro Data Center','RACK-MHE','HUAWEI','Rack CD Contingencia MHE',NULL,'MHE','Alta',NULL,'Operativo',107,'{"IP":"10.241.5.8"}'::jsonb),
('LP-AIR-02','La Paz','Aire de Precisión','AA2','ATTOM','Inrow','25 KW','Sala Principal LP','Crítica',NULL,'Operativo',108,'{"IP":"http://10.24.5.25"}'::jsonb),
('LP-AIR-03','La Paz','Aire de Precisión','AA3','UNIFLAIR','Uniflair','20 KW','Sala Principal LP','Crítica',NULL,'Operativo',109,'{"IP":"http://10.241.5.6"}'::jsonb),
('LP-SEN-01','La Paz','Sensores Ambiente','SEN-TEMP MHE','N/A','N/A','N/A','MHE','Media',NULL,'Operativo',110,'{"IP":"http://10.241.5.30/"}'::jsonb),
('LP-SEN-02','La Paz','Sensores Ambiente','SEN-TEMP CD LP','N/A','N/A','N/A','Sala Principal LP','Media',NULL,'Operativo',111,'{"IP":"http://10.241.5.31/"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.puntos_inspeccion
  (equipo_id, numero, descripcion, tipo, unidad, min_ok, max_ok, min_alerta, max_alerta, valores_count, etiquetas_valores, respuesta_esperada, severidad, obligatorio)
SELECT m.nuevo, p.numero, p.descripcion, p.tipo, p.unidad, p.min_ok, p.max_ok, p.min_alerta, p.max_alerta,
       p.valores_count, p.etiquetas_valores, p.respuesta_esperada, p.severidad, p.obligatorio
FROM (VALUES
  ('LP-ATS-01','ATS-01'),
  ('LP-GEN-01','GEN-01'),
  ('LP-UPS-01','UPS-01'),
  ('LP-UPS-02','UPS-02'),
  ('LP-AIR-01','AIR-01'),
  ('LP-AIR-02','AIR-01'),
  ('LP-AIR-03','AIR-01'),
  ('LP-INC-01','INC-01'),
  ('LP-SEN-01','SEN-01'),
  ('LP-SEN-02','SEN-01')
) AS m(nuevo, origen)
JOIN public.puntos_inspeccion p ON p.equipo_id = m.origen
WHERE NOT EXISTS (SELECT 1 FROM public.puntos_inspeccion x WHERE x.equipo_id = m.nuevo);

INSERT INTO public.puntos_inspeccion (equipo_id, numero, descripcion, tipo, unidad, severidad, obligatorio)
SELECT 'LP-RACK-01', v.numero, v.descripcion, v.tipo, v.unidad, 'alerta', true
FROM (VALUES
  (1,'Estado general del rack y cerraduras','estado',NULL),
  (2,'Limpieza y orden de cableado','estado',NULL),
  (3,'Ventiladores y flujo de aire operativos','binario',NULL),
  (4,'Alarmas activas en equipos del rack','binario',NULL),
  (5,'Observaciones generales','texto',NULL)
) AS v(numero, descripcion, tipo, unidad)
WHERE NOT EXISTS (SELECT 1 FROM public.puntos_inspeccion x WHERE x.equipo_id = 'LP-RACK-01');
