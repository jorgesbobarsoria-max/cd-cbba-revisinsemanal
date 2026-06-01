
-- Add new optional columns
ALTER TABLE public.equipos
  ADD COLUMN IF NOT EXISTS fecha_instalacion DATE,
  ADD COLUMN IF NOT EXISTS observaciones TEXT;

-- Wipe and reseed
DELETE FROM public.inspeccion_items;
DELETE FROM public.puntos_inspeccion;
DELETE FROM public.equipos;

-- ===== EQUIPOS (14) =====
INSERT INTO public.equipos (id, categoria, tag, marca, modelo, capacidad, ubicacion, criticidad, redundancia, estado, fecha_instalacion, observaciones, orden) VALUES
('AIR-01','Aire de Precisión','A-1','HUAWEI','NetCol 5000-A020','20KW','Sala Principal','Crítica','N+1','Operativo','2020-01-15','Filtros reseteados recientemente',1),
('AIR-02','Aire de Precisión','B-1','HUAWEI','NetCol 5000-A020','20KW','Sala Principal','Crítica','N+1','Standby','2020-01-15','Modo Standby',2),
('AIR-03','Aire de Precisión','B-2','HUAWEI','NetCol 5000-A020','20KW','Sala Principal','Crítica','N+1','Operativo','2020-01-15','Inyección activa',3),
('UPS-01','UPS','UPS-1','HUAWEI','UPS-2000G','20KW (2+1)','Sala UPS','Crítica','2+1','Operativo','2019-06-10','Baterías en buen estado',4),
('UPS-02','UPS','UPS-2','VERTIV','ITA 20 KVA','20 KVA','Sala UPS','Crítica','N','Operativo','2019-06-10','Autonomía 82 min',5),
('ATS-01','ATS','ATS-1','ASCO','SERIE-300','200 A','Sala Eléctrica','Crítica','N','Operativo','2019-06-10','Transferencias OK',6),
('GEN-01','Grupo Generador','GG-1','MODAZA','MD-125I','125 KVA','Exterior','Crítica','N','Operativo con observaciones','2019-03-20','Configurar retardo apagado',7),
('INC-01','Sistema Supresor Incendios','INC-1','NOTIFIRE/VESDA/SEVO','SEVO-SYSTEMS 47.6Kg','47.6 Kg','Sala Principal','Crítica','N','Operativo','2020-02-10','Presión 360 PSI (Verde)',8),
('SEN-01','Sensores Ambiente','SEN-TEMP','N/A','N/A','N/A','Sala Principal','Media','N','Operativo','2021-01-01','Monitoreo temperatura',9),
('SEN-02','Sensores Ambiente','SEN-HUM','N/A','N/A','N/A','Sala Principal','Media','N','Operativo','2021-01-01','Monitoreo humedad',10),
('SEN-03','Sensores Ambiente','SEN-MOV','N/A','N/A','N/A','Sala Principal','Media','N','Operativo','2021-01-01','Detección movimiento',11),
('SEN-04','Sensores Ambiente','SEN-ANI','N/A','N/A','N/A','Sala Principal','Alta','N','Operativo','2021-01-01','Detección aniego',12),
('SEN-05','Sensores Ambiente','SEN-HUMO','N/A','N/A','N/A','Sala Principal','Crítica','N','Operativo','2021-01-01','Detección humo',13);

-- ===== PUNTOS DE INSPECCIÓN =====
-- tipo: 'estado' | 'numerico' | 'texto' | 'binario'
INSERT INTO public.puntos_inspeccion (equipo_id, numero, descripcion, tipo, unidad, min_ok, max_ok, min_alerta, max_alerta) VALUES
-- A-1
('AIR-01',1,'Alertas Presentes','binario',NULL,NULL,NULL,NULL,NULL),
('AIR-01',2,'Temperatura Retorno','numerico','°C',18,27,16,30),
('AIR-01',3,'Humedad Retorno','numerico','%',40,60,35,65),
('AIR-01',4,'Giro Ventilador Evaporador','numerico','A',0.3,1.2,0.1,1.5),
('AIR-01',5,'Giro Ventilador Condensador','numerico','A',0,1.5,0,2),
('AIR-01',6,'Funcionamiento Compresor','numerico','A',0,2,0,3),
('AIR-01',7,'Fugas Gas Refrigerante','estado',NULL,NULL,NULL,NULL,NULL),
('AIR-01',8,'Calidad Frío','estado',NULL,NULL,NULL,NULL,NULL),
-- B-1
('AIR-02',1,'Alertas Presentes','binario',NULL,NULL,NULL,NULL,NULL),
('AIR-02',2,'Temperatura Retorno','numerico','°C',18,27,16,30),
('AIR-02',3,'Humedad Retorno','numerico','%',40,60,35,65),
('AIR-02',4,'Giro Ventilador Evaporador','numerico','A',0.3,1.2,0.1,1.5),
('AIR-02',5,'Giro Ventilador Condensador','numerico','A',0,1.5,0,2),
('AIR-02',6,'Funcionamiento Compresor','numerico','A',0,2,0,3),
('AIR-02',7,'Fugas Gas Refrigerante','estado',NULL,NULL,NULL,NULL,NULL),
('AIR-02',8,'Calidad Frío','estado',NULL,NULL,NULL,NULL,NULL),
-- B-2
('AIR-03',1,'Alertas Presentes','binario',NULL,NULL,NULL,NULL,NULL),
('AIR-03',2,'Temperatura Inyección','numerico','°C',16,22,14,25),
('AIR-03',3,'Humedad Inyección','numerico','%',40,60,35,65),
('AIR-03',4,'Giro Ventilador Evaporador','numerico','A',0.3,1.2,0.1,1.5),
('AIR-03',5,'Giro Ventilador Condensador','estado',NULL,NULL,NULL,NULL,NULL),
('AIR-03',6,'Funcionamiento Compresor','numerico','A',0,2,0,3),
('AIR-03',7,'Fugas Gas Refrigerante','estado',NULL,NULL,NULL,NULL,NULL),
('AIR-03',8,'Calidad Frío','estado',NULL,NULL,NULL,NULL,NULL),
-- UPS-1
('UPS-01',1,'Alertas Presentes','binario',NULL,NULL,NULL,NULL,NULL),
('UPS-01',2,'Rectificador (V/Hz/A)','texto',NULL,NULL,NULL,NULL,NULL),
('UPS-01',3,'Módulo Carga Baterías','texto',NULL,NULL,NULL,NULL,NULL),
('UPS-01',4,'Inversor (V/Hz/A)','texto',NULL,NULL,NULL,NULL,NULL),
('UPS-01',5,'Prueba Corte Energía','estado',NULL,NULL,NULL,NULL,NULL),
-- UPS-2
('UPS-02',1,'Alertas Presentes','binario',NULL,NULL,NULL,NULL,NULL),
('UPS-02',2,'Rectificador (V/Hz/A)','texto',NULL,NULL,NULL,NULL,NULL),
('UPS-02',3,'Módulo Carga Baterías','texto',NULL,NULL,NULL,NULL,NULL),
('UPS-02',4,'Inversor (V/Hz/A)','texto',NULL,NULL,NULL,NULL,NULL),
('UPS-02',5,'Prueba Corte Energía','estado',NULL,NULL,NULL,NULL,NULL),
-- ATS-1
('ATS-01',1,'Alertas Presentes','binario',NULL,NULL,NULL,NULL,NULL),
('ATS-01',2,'Transferencia Normal → GG','estado',NULL,NULL,NULL,NULL,NULL),
('ATS-01',3,'Transferencia GG → Normal','estado',NULL,NULL,NULL,NULL,NULL),
('ATS-01',4,'Panel de Control (V/A)','texto',NULL,NULL,NULL,NULL,NULL),
-- GG-1
('GEN-01',1,'Alertas Presentes','binario',NULL,NULL,NULL,NULL,NULL),
('GEN-01',2,'Modo Operación','estado',NULL,NULL,NULL,NULL,NULL),
('GEN-01',3,'Encendido Automático','estado',NULL,NULL,NULL,NULL,NULL),
('GEN-01',4,'Apagado Automático','estado',NULL,NULL,NULL,NULL,NULL),
('GEN-01',5,'Voltaje Batería','numerico','VDC',24,28,22,30),
('GEN-01',6,'Pre Calentador Motor','numerico','°C',35,90,30,100),
('GEN-01',7,'Nivel Refrigerante','numerico','L',0.8,1.2,0.6,1.4),
-- INC-1
('INC-01',1,'Alertas Presentes','binario',NULL,NULL,NULL,NULL,NULL),
('INC-01',2,'Presión Cilindro','numerico','PSI',300,450,200,500),
('INC-01',3,'Ductos Sensor Iónico','estado',NULL,NULL,NULL,NULL,NULL),
('INC-01',4,'Ductos Sensor Fotoeléctrico','estado',NULL,NULL,NULL,NULL,NULL),
('INC-01',5,'Estado Baterías','texto',NULL,NULL,NULL,NULL,NULL),
('INC-01',6,'Sistema Armado','estado',NULL,NULL,NULL,NULL,NULL),
-- Sensores
('SEN-01',1,'Alertas Presentes','binario',NULL,NULL,NULL,NULL,NULL),
('SEN-02',1,'Alertas Presentes','binario',NULL,NULL,NULL,NULL,NULL),
('SEN-03',1,'Alertas Presentes','binario',NULL,NULL,NULL,NULL,NULL),
('SEN-04',1,'Alertas Presentes','binario',NULL,NULL,NULL,NULL,NULL),
('SEN-05',1,'Alertas Presentes','binario',NULL,NULL,NULL,NULL,NULL);
