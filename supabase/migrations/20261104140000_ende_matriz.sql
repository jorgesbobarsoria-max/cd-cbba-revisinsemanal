-- Nuevo sitio ENDE Matriz: equipos y parámetros según la planilla "Revisión estado en equipos de infraestructura - Data Center Principal ENDE Matriz".
INSERT INTO public.equipos (id, ciudad, categoria, tag, marca, modelo, capacidad, ubicacion, criticidad, estado, orden) VALUES
 ('EM-AIR-01','ENDE Matriz','Aire de Precisión','AA-1','Stulz',NULL,'18 kW','Data Center Principal','Alta','Operativo',201),
 ('EM-AIR-02','ENDE Matriz','Aire de Precisión','AA-2','Stulz',NULL,'18 kW','Data Center Principal','Alta','Operativo',202),
 ('EM-UPS-01','ENDE Matriz','UPS','UPS-40KVA','Kstar',NULL,'40 kVA','Data Center Principal','Alta','Operativo',203),
 ('EM-GEN-01','ENDE Matriz','Grupo Electrógeno','G-G','Himoinza',NULL,'120 kVA','Data Center Principal','Alta','Operativo',204),
 ('EM-SEG-01','ENDE Matriz','Seguridad','CA-10','Fase','Sistema de acceso y sensores ambientales',NULL,'Data Center Principal','Media','Operativo',205)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.puntos_inspeccion (equipo_id, numero, descripcion, tipo, unidad, min_ok, max_ok, min_alerta, max_alerta, valores_count, etiquetas_valores, respuesta_esperada, severidad, obligatorio)
SELECT e.id, v.numero, v.descripcion, v.tipo, v.unidad, v.min_ok, v.max_ok, v.min_alerta, v.max_alerta, v.vc, v.et, v.resp, v.sev, true
FROM (VALUES ('EM-AIR-01'),('EM-AIR-02')) e(id)
CROSS JOIN (VALUES
 (1,'Temp. Retorno','numerico','°C',18::numeric,30::numeric,15::numeric,35::numeric,1,NULL::text[],NULL,'alerta'),
 (2,'Temp. de Inyección','numerico','°C',13,24,10,27,1,NULL,NULL,'alerta'),
 (3,'Humedad HR','numerico','%',40,60,30,70,1,NULL,NULL,'alerta'),
 (4,'Ventilador Evaporador','estado',NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,'alerta'),
 (5,'Ventilador Condensador','estado',NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,'alerta'),
 (6,'Tensión Total del Sistema','numerico','V',360,420,340,440,3,ARRAY['L1','L2','L3'],NULL,'alerta'),
 (7,'Corriente Total del Sistema','numerico','A',0,40,0,45,3,ARRAY['L1','L2','L3'],NULL,'alerta'),
 (8,'Alertas Presentes','binario',NULL,NULL,NULL,NULL,NULL,1,NULL,'No','falla'),
 (9,'Fugas de Refrigerante Alta','binario',NULL,NULL,NULL,NULL,NULL,1,NULL,'No','falla'),
 (10,'Fugas de Refrigerante Baja','binario',NULL,NULL,NULL,NULL,NULL,1,NULL,'No','falla'),
 (11,'Presión de Alta','numerico','PSI',250,400,200,450,1,NULL,NULL,'alerta'),
 (12,'Presión de Baja','numerico','PSI',60,90,45,100,1,NULL,NULL,'alerta'),
 (13,'Ruidos Anormales','binario',NULL,NULL,NULL,NULL,NULL,1,NULL,'No','alerta'),
 (14,'Tensión del Compresor','numerico','V',360,420,340,440,3,ARRAY['L1','L2','L3'],NULL,'alerta'),
 (15,'Corriente del Compresor','numerico','A',0,25,0,30,3,ARRAY['L1','L2','L3'],NULL,'alerta')
) v(numero,descripcion,tipo,unidad,min_ok,max_ok,min_alerta,max_alerta,vc,et,resp,sev);

INSERT INTO public.puntos_inspeccion (equipo_id, numero, descripcion, tipo, unidad, min_ok, max_ok, min_alerta, max_alerta, valores_count, etiquetas_valores, respuesta_esperada, severidad, obligatorio) VALUES
 ('EM-UPS-01',1,'% de Carga','numerico','%',0,80,0,90,1,NULL,NULL,'alerta',true),
 ('EM-UPS-01',2,'Tensión de Entrada','numerico','V',200,240,190,250,3,ARRAY['L1','L2','L3'],NULL,'alerta',true),
 ('EM-UPS-01',3,'Voltaje de Baterías','numerico','VDC',360,440,340,460,1,NULL,NULL,'alerta',true),
 ('EM-UPS-01',4,'Frecuencia','numerico','Hz',59.5,60.5,59,61,1,NULL,NULL,'alerta',true),
 ('EM-UPS-01',5,'Tiempo de Autonomía','numerico','min',15,NULL,10,NULL,1,NULL,NULL,'alerta',true),
 ('EM-UPS-01',6,'Tensión de Salida','numerico','V',210,230,200,240,3,ARRAY['L1','L2','L3'],NULL,'alerta',true),
 ('EM-UPS-01',7,'Corriente de Salida','numerico','A',0,50,0,55,3,ARRAY['L1','L2','L3'],NULL,'alerta',true),
 ('EM-UPS-01',8,'Alertas Presentes','binario',NULL,NULL,NULL,NULL,NULL,1,NULL,'No','falla',true),
 ('EM-GEN-01',1,'Fugas Presentes','binario',NULL,NULL,NULL,NULL,NULL,1,NULL,'No','falla',true),
 ('EM-GEN-01',2,'Batería','numerico','V',12.4,14.4,12,15,1,NULL,NULL,'alerta',true),
 ('EM-GEN-01',3,'Horas de Funcionamiento','numerico','h',0,NULL,NULL,NULL,1,NULL,NULL,'alerta',true),
 ('EM-GEN-01',4,'Nivel de Combustible','numerico','%',75,100,50,100,1,NULL,NULL,'alerta',true),
 ('EM-GEN-01',5,'Temp. Calentador de Agua','numerico','°C',30,50,25,60,1,NULL,NULL,'alerta',true),
 ('EM-GEN-01',6,'Tensión Entrada/Salida','numerico','V',200,240,190,250,3,ARRAY['L1','L2','L3'],NULL,'alerta',true),
 ('EM-GEN-01',7,'Corriente de Salida','numerico','A',0,300,0,330,3,ARRAY['L1','L2','L3'],NULL,'alerta',false),
 ('EM-GEN-01',8,'Alertas Presentes','binario',NULL,NULL,NULL,NULL,NULL,1,NULL,'No','falla',true),
 ('EM-SEG-01',1,'Temperatura Ambiente T-1 / T-2','numerico','°C',18,27,15,32,2,ARRAY['T-1','T-2'],NULL,'alerta',true),
 ('EM-SEG-01',2,'Humedad Relativa','numerico','%',20,60,15,70,1,NULL,NULL,'alerta',true),
 ('EM-SEG-01',3,'Sensor de Humo operativo','binario',NULL,NULL,NULL,NULL,NULL,1,NULL,'Sí','falla',true),
 ('EM-SEG-01',4,'Sensor de Puerta operativo','binario',NULL,NULL,NULL,NULL,NULL,1,NULL,'Sí','alerta',true),
 ('EM-SEG-01',5,'Sensor de Movimiento operativo','binario',NULL,NULL,NULL,NULL,NULL,1,NULL,'Sí','alerta',true),
 ('EM-SEG-01',6,'Tensión','numerico','V',200,240,190,250,3,ARRAY['L1','L2','L3'],NULL,'alerta',true),
 ('EM-SEG-01',7,'Batería','numerico','VDC',12,14.4,11.5,15,1,NULL,NULL,'alerta',true),
 ('EM-SEG-01',8,'Salida de Mensajes SMS / Teléfono','binario',NULL,NULL,NULL,NULL,NULL,1,NULL,'Sí','alerta',true),
 ('EM-SEG-01',9,'Alertas Presentes','binario',NULL,NULL,NULL,NULL,NULL,1,NULL,'No','falla',true);
