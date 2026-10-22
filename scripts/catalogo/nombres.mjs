// Normalización de nombres, clasificación por capítulo y bandas de validación
import { fixMojibake, norm } from './lib.mjs';

const ACRONIMOS = new Set(('PVC CPVC EMT IMC RCI LED HF LS AWG THHN THWN SCH PSI NTC RETIE UTP FTP STP CAT VRF UPS TDG UDC IPE PHR A500C NFPA PTAR MDF RH PEAD HDPE AC DC BT SDS WC II III IV HP KW KVA KV GPM PVC-P ' +
  'UG ASTM ACPM DPS TVSS ICONTEC IP65 IP66 RJ45 POE ABS EPS XPS NEMA TW SPT SDR RDE CCTV PPR CU AL AISI INOX UV MPA GF HD').split(' '));
const UNIDADES_TXT = { M2: 'm²', M3: 'm³', ML: 'ml', KG: 'kg', CM: 'cm', MM: 'mm', MTS: 'm', MT: 'm', GLN: 'gal', LTS: 'L', LT: 'L', MPA: 'MPa', W: 'W', V: 'V', A: 'A' };

/** Mayúscula inicial, acrónimos y medidas preservados */
export function sentenceCase(txt) {
  const s = fixMojibake(String(txt || '')).replace(/\s+/g, ' ').trim();
  if (!s) return s;
  const letters = s.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '');
  const upperRatio = letters ? letters.replace(/[^A-ZÁÉÍÓÚÑ]/g, '').length / letters.length : 0;
  let out = s;
  if (upperRatio > 0.6) {
    out = s.split(' ').map((w) => {
      const core = w.replace(/[^A-Za-z0-9ÁÉÍÓÚÑáéíóúñ\-]/g, '');
      const up = norm(core);
      if (ACRONIMOS.has(up)) return w.toUpperCase();
      if (UNIDADES_TXT[up] && core === core.toUpperCase()) return w.replace(core, UNIDADES_TXT[up]);
      if (/\d/.test(w)) return w.replace(/(\d)X(\d)/g, '$1x$2').replace(/(\d)\s?X\b/g, '$1x');
      return w.toLowerCase();
    }).join(' ');
  }
  out = out.replace(/\b(\d+)\s?[xX]\s?(\d+)/g, '$1x$2');
  return out.charAt(0).toUpperCase() + out.slice(1);
}

const PREFIJOS = /^(suministro,?\s+(transporte\s+)?(e|y)\s+instalaci[oó]n\s+(de\s+|del\s+)?|suministro\s+(y|e)\s+(aplicaci[oó]n|colocaci[oó]n|montaje)\s+(de\s+)?|s\s*[ye]\s*i\s+|fabricaci[oó]n\s+(y|e)\s+(instalaci[oó]n|montaje)\s+(de\s+)?|instalaci[oó]n\s+de\s+(?=(salida|punto|toma)))/i;
const CORTES = [/,\s*(incluye|incluido|incl\.|con\s|en\s|tipo\s|seg[uú]n|de acuerdo|para\s|marca|ref\.?|referencia|h=|e=|espesor|calibre)/i, /\s+incluye\s/i, /\s\(/, /;\s/, /\.\s+[A-ZÁÉÍÓÚ]/, /\s-\s/, /,\s/];

/** Devuelve { nombre (≤60), descripcion (texto técnico completo o null) } */
export function acortarNombre(original, max = 60) {
  const full = fixMojibake(String(original || '')).replace(/\s+/g, ' ').trim();
  let s = full.replace(PREFIJOS, '');
  let cortado = false;
  if (s.length > 45) {
    for (const re of CORTES) {
      const m = s.match(re);
      if (m && m.index >= 12) { s = s.slice(0, m.index); cortado = true; break; }
    }
  }
  s = s.replace(/\s*\(copia\)\s*/ig, ' ').replace(/[,;:\-\s]+$/, '').trim();
  if (s.length > max) {
    const cut = s.lastIndexOf(' ', max);
    s = s.slice(0, cut > 20 ? cut : max).replace(/[,;:\-\s]+$/, '');
    cortado = true;
  }
  const nombre = sentenceCase(s);
  const descripcion = (cortado || full.length > nombre.length + 3) && norm(full) !== norm(nombre) ? sentenceCase(full) : null;
  return { nombre, descripcion };
}

// ─── Clasificación de capítulos ───
const ESPECIALES = [
  [/GASES MEDICINAL|OXIGENO MEDICINAL|VACIO MEDICINAL|AIRE MEDICINAL|NFPA 99/, 'GASES MEDICINALES'],
  [/\bRCI\b|INCENDIO|EXTINCION|ROCIADOR|SPRINKLER|GABINETE CONTRA|SIAMESA|DETECTOR DE HUMO|DETECCION/, 'RED CONTRA INCENDIO'],
  [/VOZ Y DATOS|CATEGORIA 6|CAT 6|\bUTP\b|PATCH|RACK|FIBRA OPTICA|JACK RJ|FACE ?PLATE|CABLEADO ESTRUCTURADO/, 'VOZ Y DATOS'],
  [/\bVRF\b|AIRE ACONDICIONADO|VENTILACION MECANICA|TRATAMIENTO DE AIRE|DIFUSOR|REJILLA DE (RETORNO|SUMINISTRO)|DUCTO|CONDUCTO|EXTRACTOR|FAN ?COIL|REFRIGERACION|RUBATEX|CONDENSADORA|EVAPORADORA|MANEJADORA/, 'AIRE ACONDICIONADO'],
  [/GUADUA|ROLLIZA|BIOCONSTRUCCION|ESTRUCTURAS? (EN )?MADERA/, 'GUADUA Y MADERA'],
  [/PISCINA/, 'PISCINAS'],
];
const PALABRAS = [
  [/^(MORTERO|CONCRETO|CCTO|HORMIGON)\b.*\b(1:\d|PSI|MPA)\b.*$|^FORMALETA$|^ACERO \d/, 'BÁSICOS', true],
  [/ASEO|LIMPIEZA (GENERAL|FINAL|PERMANENTE)/, 'ASEO Y ENTREGA'],
  [/\bG\/ ?ESC|GUARDAESC|GUARDA ESC|\bG ESC|TABLON|^PIEDRA |^PLACA (GRANITO|MARMOL)/, 'PISOS Y ENCHAPES'],
  [/CERRAMIENTO|LOCALIZACION|REPLANTEO|CAMPAMENTO|DESCAPOTE|DEMOLICION|DESMONT|RETIRO DE|VALLA|CONTR TOPOG|TOPOGRAF|SE[NÑ]ALIZACION|PROVISIONAL/, 'PRELIMINARES'],
  [/EXCAVACION|RELLENO|CARGUE|BOTE |DISPOSICION FINAL|NIVELACION DE TERRENO|COMPACTACION|MOVIMIENTO DE TIERRA|SUB-?BASE|MEJORAMIENTO/, 'MOVIMIENTO DE TIERRAS'],
  [/PINTURA|ESTUCO|VINILO|ESMALTE|ANTICORROSIVO|IMPADOC|GRAFIADO|KORAZA|EPOXI/, 'ESTUCO Y PINTURA'],
  [/DRYWALL|CIELO ?RASO|CIELORRASO|SUPERBOARD|PANEL YESO|GYPSUM|DUELA|PLACA DE YESO|SISTEMA LIVIANO|FIBROCEMENTO/, 'DRYWALL Y CIELOS'],
  [/ENCHAPE|CERAMIC|PORCELANATO|GRANITO|MARMOL|TABLETA|GRAVILLA LAVADA|PISO|GUARDAESCOBA|BALDOSA|VINILO EN ROLLO|ALFOMBRA|MEDIA CA[NÑ]A|WIN |BOCAPUERTA|ALFAJIA|PELDA|ZOCALO|SOBREPISO|AFINADO/, 'PISOS Y ENCHAPES'],
  [/PA[NÑ]ETE|REPELLO|REVOQUE|ENVOLVENTE MONOLITICA|IMPERMEABILIZA/, 'PAÑETES'],
  [/MAMPOSTERIA|MURO EN (LADRILLO|BLOQUE)|LADRILLO|BLOQUE|CULATA|DINTEL|ALFAJ/, 'MAMPOSTERÍA'],
  [/CUBIERTA|TEJA|CANAL|BAJANTE|FLANCHE|CABALLETE|CORREA|LIMAHOYA|GOTERO|CERCHA/, 'CUBIERTAS'],
  [/ZAPATA|CIMENTACION|CIMIENTO|SOLADO|PEDESTAL|CICLOPEO|PILOTE|CAISSON|VIGA DE AMARRE|DADO/, 'CIMENTACIÓN'],
  [/\bIPE\b|PERFIL|METALIC|TUBO ESTRUCTURAL|A500|PLATINA|ANGULO|ESTRUCTURA METAL|CORREA METAL|SOLDADURA|PERNO/, 'ESTRUCTURA METÁLICA'],
  [/COLUMNA|VIGA|PLACA|LOSA|MURO PANTALLA|MURO DE CONTENCION|ESCALERA|ACERO DE REFUERZO|ACERO FIGURADO|MALLA ELECTRO|CORPALOSA|METALDECK|CONCRETO|TANQUE (SUBTERRANEO|EN CONCRETO)|CCTO/, 'ESTRUCTURA EN CONCRETO'],
  [/SANITARIO|LAVAMANOS|ORINAL|GRIFERIA|DUCHA|LAVAPLATOS|LAVADERO|INCRUSTACION|ESPEJO|TOALLERO|JABONERA|DISPENSADOR|BARRA DE APOYO|POCETA|MESON/, 'APARATOS SANITARIOS'],
  [/PUERTA|VENTANA|VENTANERIA|VIDRIO|DIVISION|BARANDA|PASAMANO|CERRADURA|CLOSET|MUEBLE|GABINETE|REJA|MARCO|CORTINA|ENTAMBORADA|PTA |ESPEJO|CARPINTER|ALUMINIO/, 'CARPINTERÍA'],
  [/TUBERIA|TUBO|PUNTO HIDRAULICO|PUNTO SANITARIO|PTO HID|PTO SAN|CAJA DE INSPECCION|CAJ INSP|CAM INSPECC|CAMARA|REGISTRO|LLAVE DE PASO|VALVULA|TANQUE|BOMBA|EQUIPO DE PRESION|ALCANTARILLA|SIFON|PTAR|SEPTICO|TRAMPA DE GRASA|DESAGUE|SIFON|REJILLA|CONTADOR|MEDIDOR DE AGUA|HIDRAULIC|SANITARI|AGUAS LLUVIAS|POZO|FILTRO|ANILLO|TAPA/, 'HIDROSANITARIAS'],
  [/SALIDA|TOMA|INTERRUPTOR|LUMINARIA|LAMPARA|PANEL LED|\bLED\b|TABLERO|ACOMETIDA|CABLE|CONDUCTOR|\bEMT\b|\bIMC\b|BREAKER|TOTALIZADOR|PUESTA A TIERRA|APANTALLAMIENTO|PARARRAYO|BANDEJA PORTACABLE|CANALETA|CAJA DE PASO|ELECTRIC|TRANSFORMADOR|PLANTA ELECTRICA|UPS|ILUMINACION|REFLECTOR|SENSOR/, 'ELÉCTRICAS'],
  [/ANDEN|SARDINEL|BORDILLO|VIA |VIAS|PAVIMENTO|ADOQUIN|CERCA|JARDIN|EMPRADIZADO|CUNETA|PARQUEADERO|ASFALTO|GRAMA|CESPED|MURO DE CERRAMIENTO|EXTERIOR/, 'EXTERIORES Y VÍAS'],
];
const POR_CATEGORIA = [
  [/BASICO/, 'BÁSICOS'], [/PRELIMINAR/, 'PRELIMINARES'], [/MOVIMIENTO DE TIERRA/, 'MOVIMIENTO DE TIERRAS'], [/CIMENTACION/, 'CIMENTACIÓN'],
  [/ESTRUCTURA.*METAL|METALICA/, 'ESTRUCTURA METÁLICA'], [/ESTRUCTURA|FUNDICION/, 'ESTRUCTURA EN CONCRETO'], [/MURO|MAMPOSTER/, 'MAMPOSTERÍA'],
  [/REVOQUE|PA[NÑ]ETE|ENVOLVENTE/, 'PAÑETES'], [/ENCHAPE|PISO/, 'PISOS Y ENCHAPES'], [/CUBIERTA|CANALES/, 'CUBIERTAS'],
  [/HIDRAULIC|SANITARI|ALCANTARILL|PUNTOS SANITARIOS|PTAR|HIDROSANIT/, 'HIDROSANITARIAS'], [/ELECTRIC|ACOMETIDA|TABLERO/, 'ELÉCTRICAS'],
  [/LIVIANO|DRYWALL/, 'DRYWALL Y CIELOS'], [/ESTUCO|PINTURA/, 'ESTUCO Y PINTURA'], [/CARPINTER|VENTANERIA/, 'CARPINTERÍA'],
  [/APARATOS/, 'APARATOS SANITARIOS'], [/EXTERIOR|VIAS/, 'EXTERIORES Y VÍAS'], [/ASEO/, 'ASEO Y ENTREGA'], [/ACABADOS/, 'ESTUCO Y PINTURA'],
];

/** @returns {{capitulo:string, regla:string}} */
export function clasificarCapitulo(nombre, categoriaOrigen = '') {
  const N = norm(nombre), C = norm(fixMojibake(categoriaOrigen));
  for (const [re, cap] of ESPECIALES) if (re.test(C)) return { capitulo: cap, regla: 'categoria-especial' };
  if (/BASICO/.test(C)) return { capitulo: 'BÁSICOS', regla: 'categoria' };
  for (const [re, cap] of ESPECIALES) if (re.test(N)) return { capitulo: cap, regla: 'nombre-especial' };
  for (const [re, cap, soloNombre] of PALABRAS) {
    if (soloNombre && !re.test(N)) continue;
    if (re.test(N)) return { capitulo: cap, regla: 'nombre' };
  }
  for (const [re, cap] of POR_CATEGORIA) if (re.test(C)) return { capitulo: cap, regla: 'categoria' };
  return { capitulo: 'PRELIMINARES', regla: 'SIN CLASIFICAR' };
}

/** Capítulo del Hospital según prefijo de ítem del cuadro */
export function capituloHospital(item) {
  const p = String(item || '').split('.');
  const a = Number(p[0]), b = Number(p[1]);
  if (a === 1 && b === 1) return 'PRELIMINARES';
  if (a === 1 && b === 2) return 'CIMENTACIÓN';
  if (a === 1 && b === 3) return null; // concreto o metálica según nombre
  return ({ 2: 'DRYWALL Y CIELOS', 3: 'PISOS Y ENCHAPES', 4: 'HIDROSANITARIAS', 5: 'HIDROSANITARIAS', 6: 'CARPINTERÍA', 7: 'RED CONTRA INCENDIO', 8: 'RED CONTRA INCENDIO', 9: 'ELÉCTRICAS', 10: 'ELÉCTRICAS', 11: 'VOZ Y DATOS', 12: 'AIRE ACONDICIONADO', 13: 'GASES MEDICINALES' })[a] || null;
}

// ─── Categorías de insumos (Marketplace / almacén) ───
const CAT_INSUMO = [
  [/^(OBRA CIVIL|MAMPOSTERIA|PROTECCION DE OBRA)$/, 'OBRA GRIS'], [/OBRA LIVIANA/, 'DRYWALL Y LIVIANOS'], [/OBRA BLANCA|PINTURA|ESTUCO/, 'PINTURAS Y ESTUCOS'],
  [/PISOS|ENCHAPE/, 'PISOS Y ENCHAPES'], [/CUBIERTA/, 'CUBIERTAS'], [/METALICA/, 'METÁLICOS Y PERFILERÍA'], [/CARPINTERIA/, 'CARPINTERÍA'],
  [/VIDRIO/, 'VIDRIOS Y ALUMINIO'], [/HIDRAULIC|SANITARI|PTAR|PISCINA/, 'HIDROSANITARIOS'], [/APARATOS/, 'APARATOS SANITARIOS'],
  [/ILUMINACION/, 'ILUMINACIÓN'], [/ELECTRIC/, 'ELÉCTRICOS'], [/RCI|DETECCION|INCENDIO/, 'CONTRA INCENDIO'], [/DATOS/, 'VOZ Y DATOS'],
  [/CLIMATIZACION|AIRE/, 'CLIMATIZACIÓN'], [/GASES/, 'GASES MEDICINALES'], [/HERRAMIENTA|CONSUMIBLE/, 'HERRAMIENTAS Y CONSUMIBLES'], [/BLINDAJE/, 'ESPECIALES'],
];
export function categoriaInsumo(catOrigen, nombre = '') {
  const C = norm(catOrigen);
  for (const [re, cat] of CAT_INSUMO) if (re.test(C)) return cat;
  const N = norm(nombre);
  if (/CEMENTO|ARENA|GRAVA|GRAVILLA|RECEBO|BALASTO|ACERO|VARILLA|LADRILLO|BLOQUE|ALAMBRE|PUNTILLA|CLAVO|AGUA|CAL |ADITIVO|CONCRETO|MALLA|FORMALETA|TABLA|POLISOMBRA|PLASTICO/.test(N)) return 'OBRA GRIS';
  if (/TUBO|TUBERIA|CODO|TEE|ADAPTADOR|UNION|BUJE|REDUCCION|SOLDADURA PVC|LIMPIADOR|VALVULA|REGISTRO|SIFON|PVC|CPVC/.test(N)) return 'HIDROSANITARIOS';
  if (/CABLE|ALAMBRE CU|TOMA|INTERRUPTOR|BREAKER|CAJA|EMT|TABLERO|LUMINARIA|LED|CINTA AISLANTE/.test(N)) return 'ELÉCTRICOS';
  if (/PINTURA|VINILO|ESTUCO|ESMALTE|THINNER|LIJA|SELLADOR/.test(N)) return 'PINTURAS Y ESTUCOS';
  if (/CERAMICA|PORCELANATO|PEGACOR|BOQUILLA|GRANITO|MARMOL/.test(N)) return 'PISOS Y ENCHAPES';
  if (/DRYWALL|SUPERBOARD|PERFIL|PARAL|CANAL|TORNILLO|MASILLA/.test(N)) return 'DRYWALL Y LIVIANOS';
  if (/MADERA|GUADUA|LISTON|VARENGA|TRIPLEX|MDF/.test(N)) return 'MADERAS';
  if (/TEJA|CABALLETE|FLANCHE|CANAL/.test(N)) return 'CUBIERTAS';
  return 'FERRETERÍA GENERAL';
}

// ─── Bandas de validación (COP/unidad, Pasto 2026, costo directo) ───
export const BANDAS = {
  'PRELIMINARES': { M2: [1500, 60000], ML: [3000, 80000] },
  'MOVIMIENTO DE TIERRAS': { M3: [15000, 160000], M2: [2000, 40000] },
  'CIMENTACIÓN': { M3: [350000, 1200000], M2: [15000, 120000], ML: [40000, 400000] },
  'ESTRUCTURA EN CONCRETO': { M3: [600000, 1600000], M2: [60000, 450000], ML: [30000, 350000], KG: [5000, 12000] },
  'ESTRUCTURA METÁLICA': { KG: [9000, 25000], ML: [20000, 700000], M2: [60000, 450000] },
  'MAMPOSTERÍA': { M2: [35000, 160000], ML: [15000, 120000] },
  'PAÑETES': { M2: [12000, 70000], ML: [5000, 40000] },
  'PISOS Y ENCHAPES': { M2: [25000, 260000], ML: [6000, 80000] },
  'CUBIERTAS': { M2: [35000, 320000], ML: [15000, 180000] },
  'DRYWALL Y CIELOS': { M2: [35000, 180000], ML: [10000, 90000] },
  'ESTUCO Y PINTURA': { M2: [6000, 60000], ML: [3000, 30000] },
  'BÁSICOS': { M3: [250000, 1100000] },
};
export function evaluarBanda(capitulo, unidad, costo) {
  const b = BANDAS[capitulo]?.[String(unidad || '').toUpperCase()];
  if (!b) return { estado: 'SIN BANDA', banda: '' };
  const [lo, hi] = b;
  const banda = `${lo.toLocaleString('es-CO')} – ${hi.toLocaleString('es-CO')}`;
  if (costo > hi * 1.4) return { estado: 'ALTO', banda };
  if (costo < lo * 0.6) return { estado: 'BAJO', banda };
  return { estado: 'OK', banda };
}
