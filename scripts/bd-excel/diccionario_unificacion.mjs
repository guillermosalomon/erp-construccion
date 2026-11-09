/**
 * Diccionario Maestro de Unificación, Nomenclatura Técnica, Taxonomía de 28 Capítulos (00–27),
 * 26 Categorías de Almacén y Categorización de Mano de Obra por Disciplina (21 Disciplinas) — Kalarti ERP 2026.
 */

// ═══════════════════════════════════════════════════════════════════════════
// 1. UTILIDADES DE TEXTO, MOJIBAKE Y UNIDADES ESTÁNDAR
// ═══════════════════════════════════════════════════════════════════════════

export function fixMojibake(s) {
  let str = String(s || '');
  if (/[ÃÂ]/.test(str)) {
    try {
      const bytes = Uint8Array.from([...str].map((c) => c.charCodeAt(0) & 0xff));
      str = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      // mantener cadena original si no era doble UTF-8 puro
    }
  }
  return str
    .replace(/\uFFFD/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function norm(s) {
  return fixMojibake(s)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/["'´`“”]/g, '')
    .replace(/[^A-Z0-9/.+-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const MAPA_UNIDADES = {
  M2: 'M2', 'M²': 'M2', MT2: 'M2', MTS2: 'M2',
  M3: 'M3', 'M³': 'M3', MT3: 'M3', MTS3: 'M3',
  ML: 'ML', M: 'ML', MT: 'ML', MTS: 'ML', METRO: 'ML',
  UND: 'UND', UN: 'UND', U: 'UND', UNIDAD: 'UND', PZA: 'UND', PIEZA: 'UND', CAPS: 'UND', TUBO: 'UND', PLIEGO: 'UND', VAR: 'UND', PELD: 'UND',
  PAR: 'PAR', JGO: 'JGO', JUEGO: 'JGO', KIT: 'KIT',
  KG: 'KG', KGS: 'KG', KL: 'KG', KILO: 'KG',
  TON: 'TON', T: 'TON',
  LB: 'LB', LBS: 'LB', LIBRA: 'LB',
  BTO: 'BTO', BULTO: 'BTO', SACO: 'BTO', BOLSA: 'BOLSA',
  GAL: 'GAL', GLN: 'GAL', GL: 'GAL', GALON: 'GAL',
  '1/4 GAL': 'CUARTO_GAL', '1/4GAL': 'CUARTO_GAL', CUARTO: 'CUARTO_GAL',
  LT: 'LT', LTS: 'LT', L: 'LT', LITRO: 'LT',
  CJA: 'CAJA', CAJA: 'CAJA', CUÑETE: 'CUNETE', CUNETE: 'CUNETE',
  ROLLO: 'ROLLO', RLL: 'ROLLO',
  GLB: 'GLB', GLOBAL: 'GLB',
  HORA: 'HORA', HR: 'HORA', HRS: 'HORA', H: 'HORA', HH: 'HORA', 'H-H': 'HORA', 'H -H': 'HORA',
  DIA: 'DIA', 'DÍA': 'DIA', JORNAL: 'DIA', JORNADA: 'DIA',
  MES: 'MES',
  VIAJE: 'VIAJE', FLETE: 'VIAJE',
  'M3/KM': 'M3-KM', 'M3-KM': 'M3-KM', 'M3KM': 'M3-KM',
  'KG-KM': 'KG-KM', 'KG/KM': 'KG-KM',
  PTO: 'PTO', PUNTO: 'PTO', SAL: 'SAL', SALIDA: 'SAL',
  '%': '%',
};

/**
 * Normaliza unidad técnica diferenciando `GL` (galón en líquidos/pinturas vs global en servicios).
 */
export function normalizarUnidad(uRaw, contextoNombre = '') {
  const clean = fixMojibake(uRaw).toUpperCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
  if (!clean) return 'UND';
  if (clean === 'GL') {
    const N = norm(contextoNombre);
    if (/PINTURA|VINILO|ESMALTE|LIMPIADOR|SOLDADURA|ADITIVO|SIKA|THINNER|ACPM|GASOLINA|ACEITE|IMPRIMANTE|SELLADOR|EPOXICO|BARNIZ|\bLACA\b|COLBON|PEGANTE|EMULSION/.test(N)) {
      return 'GAL';
    }
    return 'GLB';
  }
  return MAPA_UNIDADES[clean] || clean;
}

const ACRONIMOS = new Set((
  'PVC CPVC EMT IMC RCI LED HF LS AWG THHN THWN SCH PSI NTC RETIE UTP FTP STP CAT CAT6 CAT6A VRF VRV UPS TDG UDC IPE HEA HEB PHR A500 A500C NFPA PTAR PETAR FAFA MDF RH PEAD HDPE AC DC BT MT AT SDS WC II III IV HP KW KVA KV GPM ' +
  'UG ASTM ACPM DPS TVSS ICONTEC IP65 IP66 IP67 IP68 RJ45 POE ABS EPS XPS NEMA TW SPT SDR RDE CCTV PPR CU AL AISI INOX UV MPA GF HD HG UL FM FPLR LSZH SHD N2 O2 CO2 VAC AGSS WPC MTC TMI NVR PDU'
).split(' '));

const UNIDADES_INLINE = {
  M2: 'm²', M3: 'm³', ML: 'ml', KG: 'kg', CM: 'cm', MM: 'mm', MTS: 'm', MT: 'm', GLN: 'gal', LTS: 'L', LT: 'L', MPA: 'MPa', PSI: 'psi',
};

export function sentenceCaseTecnico(txt) {
  let s = fixMojibake(txt).replace(/\s+/g, ' ').trim();
  if (!s) return '';

  // Separar únicamente 'cm' o 'mm' seguidos directamente de palabra pegada (ej. "14 CMIncluye" -> "14 CM Incluye")
  // NUNCA partir 'm' seguida de letras para no romper: minutos, metros, muro, manos, matecsa, mtc, mil, Mini-Com, MPa
  s = s.replace(/(\d+\s*(?:[cC][mM]|[mM][mM]))([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ]{2,})/g, '$1 $2');
  s = s.replace(/(\d+)\s*MIL\b/gi, '$1 mil');
  s = s.replace(/(\d+(?:[.,]\d+)?)MTC\b/gi, '$1 m MTC');
  s = s.replace(/(\d+(?:[.,]\d+)?)\s*MM(?=[xX*×\s,.;:)]|$)/gi, '$1 mm');
  s = s.replace(/(\d+(?:[.,]\d+)?)\s*CM(?=[xX*×\s,.;:)]|$)/gi, '$1 cm');
  s = s.replace(/(\d+(?:[.,]\d+)?)\s*MTS?(?=[xX*×\s,.;:)]|$)/gi, '$1 m');
  s = s.replace(/(\d+(?:[.,]\d+)?)\s*(mm|cm|m)\s*[xX×]\s*(\d)/gi, '$1 $2 x $3');
  s = s.replace(/(\d+(?:[.,]\d+)?)M(?=\s|$|[),.;:])/g, '$1 m');
  s = s.replace(/\)([A-Za-zÁÉÍÓÚÑáéíóúñ])/g, ') $1');
  s = s.replace(/([a-záéíóúñ])(Todo costo)/g, '$1 $2');

  const letters = s.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '');
  const upperRatio = letters ? letters.replace(/[^A-ZÁÉÍÓÚÑ]/g, '').length / letters.length : 0;

  let words = s.split(' ');
  if (upperRatio > 0.52) {
    words = words.map((w) => {
      const core = w.replace(/[^A-Za-z0-9ÁÉÍÓÚÑáéíóúñ-]/g, '');
      const up = norm(core).replace(/\s+/g, '');
      if (ACRONIMOS.has(up)) return w.replace(core, up === 'MPA' ? 'MPa' : up === 'PSI' ? 'psi' : core.toUpperCase());
      if (UNIDADES_INLINE[up] && core === core.toUpperCase()) return w.replace(core, UNIDADES_INLINE[up]);
      if (/^F'C=/i.test(w)) return w.toLowerCase();
      if (/\d/.test(w)) {
        return w
          .replace(/(\d)X(\d)/g, '$1x$2')
          .replace(/(\d)MTS?\b/gi, '$1 m')
          .replace(/(\d)CM\b/gi, '$1 cm')
          .replace(/(\d)MM\b/gi, '$1 mm')
          .replace(/(\d)KG\b/gi, '$1 kg');
      }
      return w.toLowerCase();
    });
  } else {
    words = words.map((w) => {
      const core = w.replace(/[^A-Za-z0-9ÁÉÍÓÚÑáéíóúñ-]/g, '');
      const up = norm(core).replace(/\s+/g, '');
      if (ACRONIMOS.has(up) && core.length >= 2) {
        if (up === 'MPA') return w.replace(core, 'MPa');
        if (up === 'PSI') return w.replace(core, 'psi');
        return w.replace(core, core.toUpperCase());
      }
      return w;
    });
  }

  let out = words.join(' ')
    .replace(/\b(\d+(?:[.,]\d+)?)\s*[xX*×]\s*(\d+(?:[.,]\d+)?)/g, '$1x$2')
    .replace(/\bmanposteria\b/gi, 'mampostería')
    .replace(/\bfomaleta\b/gi, 'formaleta')
    .replace(/\b(?:alumino|alumnio)\b/gi, 'aluminio')
    .replace(/\bpeado\b/gi, 'pesado')
    .replace(/\bfigutado\b/gi, 'figurado')
    .replace(/\btrapezoidadl\b/gi, 'trapezoidal')
    .replace(/\bloza\b/gi, 'losa')
    .replace(/\bgris calro\b/gi, 'gris claro')
    .replace(/\brepizas\b/gi, 'repisas')
    .replace(/\bf'c\s*=\s*/gi, "f'c=")
    .replace(/\bd\s*=\s*(\d+)/gi, 'Ø $1')
    .replace(/\be\s*=\s*(\d+)/gi, 'e=$1')
    .replace(/\bh\s*=\s*(\d+)/gi, 'h=$1')
    .replace(/\s+,/g, ',')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\s+/g, ' ')
    .trim();

  return out ? out.charAt(0).toUpperCase() + out.slice(1) : '';
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. TAXONOMÍA DE 28 CAPÍTULOS (00 A 27) Y DISCIPLINAS INDEPENDIZADAS DEL ERP
// ═══════════════════════════════════════════════════════════════════════════

export const CAPITULOS_BD = [
  { codigo: '00', nombre: 'BÁSICOS', disciplina: 'CIV', cuadrilla: 'CUA-CIV', hm_pct: 0, alcance: 'Morteros, concretos preparados en obra, concreto ciclópeo y formaletería base' },
  { codigo: '01', nombre: 'PRELIMINARES', disciplina: 'TOP', cuadrilla: 'CUA-TOP', hm_pct: 5, alcance: 'Localización, replanteo topográfico, cerramientos provisionales, campamentos, demoliciones y desmontes' },
  { codigo: '02', nombre: 'MOVIMIENTO DE TIERRAS', disciplina: 'MOV', cuadrilla: 'CUA-MOV', hm_pct: 5, alcance: 'Descapote, excavaciones manuales y mecánicas, rellenos compactados, cargue y retiro' },
  { codigo: '03', nombre: 'CIMENTACIÓN', disciplina: 'CIV', cuadrilla: 'CUA-CIV', hm_pct: 5, alcance: 'Solados, mejoramientos, zapatas, vigas de cimentación, pedestales, ciclópeos y sobrecimientos' },
  { codigo: '04', nombre: 'ESTRUCTURA EN CONCRETO', disciplina: 'CIV', cuadrilla: 'CUA-CIV', hm_pct: 5, alcance: 'Columnas, vigas aéreas, placas macizas y aligeradas, muros de contención, escaleras y acero de refuerzo' },
  { codigo: '05', nombre: 'ESTRUCTURA METÁLICA Y CERRAJERÍA', disciplina: 'MET', cuadrilla: 'CUA-MET', hm_pct: 5, alcance: 'Perfilería estructural IPE/HEA/PHR/A500, correas, platinas, puertas/ventanas metálicas, rejas y barandas' },
  { codigo: '06', nombre: 'MAMPOSTERÍA', disciplina: 'MAM', cuadrilla: 'CUA-MAM', hm_pct: 5, alcance: 'Muros en ladrillo común, estructural, bloque de arcilla y concreto, dinteles, alfajías e hidrófugos de fachada' },
  { codigo: '07', nombre: 'PAÑETES', disciplina: 'MAM', cuadrilla: 'CUA-MAM', hm_pct: 5, alcance: 'Pañetes y revoques lisos, rústicos e impermeabilizados en muros, cielos, filos y dilataciones' },
  { codigo: '08', nombre: 'PISOS Y ENCHAPES', disciplina: 'PIS', cuadrilla: 'CUA-PIS', hm_pct: 5, alcance: 'Alistados, porcelanatos, cerámicas, vinilos hospitalarios, granitos, mármoles, piedras y guardaescobas' },
  { codigo: '09', nombre: 'CUBIERTAS', disciplina: 'MAM', cuadrilla: 'CUA-MAM', hm_pct: 5, alcance: 'Tejas termoacústicas, fibrocemento, caballetes, canales pluviales, vigas canales en lámina, bajantes y flanches' },
  { codigo: '10', nombre: 'HIDROSANITARIAS Y PETAR', disciplina: 'HID', cuadrilla: 'CUA-HID', hm_pct: 5, alcance: 'Redes de agua potable fría/caliente, desagües sanitarios, aguas lluvias, válvulas, cajas de inspección, bombeo y PETAR' },
  { codigo: '11', nombre: 'REDES DE GAS DOMICILIARIO', disciplina: 'GAS', cuadrilla: 'CUA-GAS', hm_pct: 5, alcance: 'Tuberías PE-AL-PE, cobre y acero para gas, reguladores, medidores, válvulas de corte, puntos y calentadores a gas NTC 2505' },
  { codigo: '12', nombre: 'ELÉCTRICAS', disciplina: 'ELE', cuadrilla: 'CUA-ELE', hm_pct: 5, alcance: 'Canalizaciones EMT/IMC/PVC, conductores, salidas eléctricas, tableros, iluminación LED, apantallamiento y SPT RETIE' },
  { codigo: '13', nombre: 'VOZ Y DATOS', disciplina: 'VYD', cuadrilla: 'CUA-VYD', hm_pct: 5, alcance: 'Cableado estructurado Cat 6/6A, fibra óptica, gabinetes/racks, equipos activos, CCTV y certificación de puntos' },
  { codigo: '14', nombre: 'AIRE ACONDICIONADO', disciplina: 'AA', cuadrilla: 'CUA-AA', hm_pct: 5, alcance: 'Sistemas VRF/VRV, unidades condensadoras/evaporadoras, fancoils, UMA, tubería de cobre aislada, ductos y ventilación' },
  { codigo: '15', nombre: 'RED CONTRA INCENDIO (EXTINCIÓN)', disciplina: 'RCI', cuadrilla: 'CUA-RCI', hm_pct: 5, alcance: 'Tubería acero SCH 10/40 ranurada, rociadores, válvulas UL/FM, gabinetes clase III, siamesa y cuartos de bombas' },
  { codigo: '16', nombre: 'DETECCIÓN Y ALARMA DE INCENDIO', disciplina: 'DET', cuadrilla: 'CUA-DET', hm_pct: 5, alcance: 'Paneles inteligentes NFPA 72, detectores direccionables, estaciones manuales, sirenas estrobo y cable FPLR' },
  { codigo: '17', nombre: 'DRYWALL Y CIELOS', disciplina: 'DRY', cuadrilla: 'CUA-DRY', hm_pct: 5, alcance: 'Muros y fachadas livianas en placa de yeso/fibrocemento Superboard, cielos rasos, protección radiológica y acústica' },
  { codigo: '18', nombre: 'ESTUCO Y PINTURA', disciplina: 'PIN', cuadrilla: 'CUA-PIN', hm_pct: 5, alcance: 'Estucos plásticos e interiores/exteriores, vinilos tipo 1, asepsia/epóxicas, esmaltes, anticorrosivos, lacas y barnices' },
  { codigo: '19', nombre: 'CARPINTERÍA EN MADERA', disciplina: 'CMA', cuadrilla: 'CUA-CMA', hm_pct: 5, alcance: 'Puertas entamboradas, macizas y hospitalarias en melamina RH, cocinas integrales, muebles de baño, closets y repisas' },
  { codigo: '20', nombre: 'CARPINTERÍA EN ALUMINIO Y VIDRIO', disciplina: 'CAL', cuadrilla: 'CUA-CAL', hm_pct: 5, alcance: 'Ventanería y puertas-ventanas en aluminio arquitectónico, puertas y divisiones en vidrio templado/laminado y espejos' },
  { codigo: '21', nombre: 'APARATOS SANITARIOS', disciplina: 'HID', cuadrilla: 'CUA-HID', hm_pct: 5, alcance: 'Sanitarios, lavamanos, orinales, duchas, griferías, lavaplatos, mesones INOX, lavatraperos, incrustaciones y accesorios' },
  { codigo: '22', nombre: 'CONSTRUCCIÓN EN GUADUA', disciplina: 'GUA', cuadrilla: 'CUA-GUA', hm_pct: 5, alcance: 'Preservación e inmunizado, columnas, vigas, correas y diagonales en guadua estructural, bahareque encementado y acabados' },
  { codigo: '23', nombre: 'CONSTRUCCIÓN EN MADERA', disciplina: 'MAD', cuadrilla: 'CUA-MAD', hm_pct: 5, alcance: 'Preservación, columnas en madera rolliza, vigas, entramados y estructuras de cubierta en madera aserrada y laminada' },
  { codigo: '24', nombre: 'EXTERIORES Y VÍAS', disciplina: 'CIV', cuadrilla: 'CUA-CIV', hm_pct: 5, alcance: 'Subbases y bases granulares, pavimentos rígidos/adoquín, sardineles, andenes, cerramientos viales y empradizados' },
  { codigo: '25', nombre: 'PISCINAS', disciplina: 'CIV', cuadrilla: 'CUA-CIV', hm_pct: 5, alcance: 'Vaso estanco, recubrimiento vítreo, playa atérmica, equipos de filtración, recirculación e iluminación subacuática' },
  { codigo: '26', nombre: 'GASES MEDICINALES', disciplina: 'GM', cuadrilla: 'CUA-GM', hm_pct: 5, alcance: 'Tubería cobre tipo K/L oxigenada NFPA 99, tomas QC/DISS Chemetron, cajas de corte, alarmas y evacuación de gases' },
  { codigo: '27', nombre: 'ASEO Y ENTREGA', disciplina: 'MOV', cuadrilla: 'CUA-MOV', hm_pct: 3, alcance: 'Aseo permanente de obra, clasificación de residuos, limpieza general fina y entrega final' },
];

export const CAPITULO_MAP = new Map(CAPITULOS_BD.map((c) => [c.nombre, c]));

// ═══════════════════════════════════════════════════════════════════════════
// 3. CATEGORIZACIÓN DE MANO DE OBRA POR DISCIPLINA (20 OPERATIVAS + 1 ADM)
// ═══════════════════════════════════════════════════════════════════════════

export const DISCIPLINAS_MO = {
  TOP: 'Topografía y Replanteo',
  MOV: 'Movimiento de Tierras y Demoliciones',
  CIV: 'Obra Civil, Cimentación y Concreto',
  MAM: 'Mampostería, Pañetes y Cubiertas',
  PIS: 'Pisos, Enchapes y Piedra Natural',
  DRY: 'Sistemas Livianos, Drywall y Cielos',
  PIN: 'Estuco, Pintura y Acabados Murales',
  MET: 'Estructura Metálica y Cerrajería',
  CMA: 'Carpintería en Madera y Mobiliario Arquitectónico',
  CAL: 'Carpintería en Aluminio y Vidriería Arquitectónica',
  GUA: 'Construcción en Guadua',
  MAD: 'Construcción Estructural en Madera',
  HID: 'Redes Hidrosanitarias y PETAR',
  GAS: 'Redes de Gas Domiciliario y Comercial NTC 2505',
  ELE: 'Redes Eléctricas e Iluminación RETIE',
  VYD: 'Voz, Datos y Telecomunicaciones',
  RCI: 'Red Contra Incendio (Extinción)',
  DET: 'Detección y Alarma de Incendio',
  AA: 'Climatización y Ventilación HVAC/VRF',
  GM: 'Redes de Gases Medicinales NFPA 99',
  ADM: 'Dirección Técnica, SST y Administración de Obra',
};

/**
 * Niveles prestacionales vinculados a 00_PARAMETROS_Y_RESUMEN:
 *  - NIVEL_1     -> FP_NIVEL_1 (1.77)
 *  - NIVEL_1_5   -> FP_NIVEL_1_5 (1.71)
 *  - NIVEL_2     -> FP_NIVEL_2 (1.68)
 *  - PROFESIONAL -> FP_PROFESIONAL (1.58)
 */
export const CARGOS_MO_BD = [
  // TOP — Topografía
  { codigo: 'MO-TOP-01', nombre: 'Topógrafo profesional / tecnólogo', disciplina: 'TOP', tipo: 'ESPECIALISTA_TECNICO', nivel: 'NIVEL_2', smlv: 2.0 },
  { codigo: 'MO-TOP-02', nombre: 'Cadenero primero de topografía', disciplina: 'TOP', tipo: 'OPERATIVO_CAMPO', nivel: 'NIVEL_1_5', smlv: 1.5 },
  { codigo: 'MO-TOP-03', nombre: 'Cadenero segundo / auxiliar topografía', disciplina: 'TOP', tipo: 'OPERATIVO_CAMPO', nivel: 'NIVEL_1', smlv: 1.0 },

  // MOV — Movimiento de tierras y demoliciones
  { codigo: 'MO-MOV-01', nombre: 'Maestro encargado de excavación y explanación', disciplina: 'MOV', tipo: 'OPERATIVO_CAMPO', nivel: 'NIVEL_2', smlv: 2.0 },
  { codigo: 'MO-MOV-02', nombre: 'Oficial de excavación, entibado y demolición', disciplina: 'MOV', tipo: 'OPERATIVO_CAMPO', nivel: 'NIVEL_1_5', smlv: 1.5 },
  { codigo: 'MO-MOV-03', nombre: 'Ayudante práctico de excavación y retiro', disciplina: 'MOV', tipo: 'OPERATIVO_CAMPO', nivel: 'NIVEL_1', smlv: 1.0 },

  // CIV — Obra civil y concreto
  { codigo: 'MO-CIV-01', nombre: 'Maestro de obra civil y estructuras', disciplina: 'CIV', tipo: 'OPERATIVO_CAMPO', nivel: 'NIVEL_2', smlv: 2.0 },
  { codigo: 'MO-CIV-02', nombre: 'Oficial concretero / armador / formaletero', disciplina: 'CIV', tipo: 'OPERATIVO_CAMPO', nivel: 'NIVEL_1_5', smlv: 1.5 },
  { codigo: 'MO-CIV-03', nombre: 'Ayudante de obra civil y concreto', disciplina: 'CIV', tipo: 'OPERATIVO_CAMPO', nivel: 'NIVEL_1', smlv: 1.0 },

  // MAM — Mampostería, pañetes y cubiertas
  { codigo: 'MO-MAM-01', nombre: 'Maestro de mampostería y envolventes', disciplina: 'MAM', tipo: 'OPERATIVO_CAMPO', nivel: 'NIVEL_2', smlv: 2.0 },
  { codigo: 'MO-MAM-02', nombre: 'Oficial mampostero, pañetador y techador', disciplina: 'MAM', tipo: 'OPERATIVO_CAMPO', nivel: 'NIVEL_1_5', smlv: 1.5 },
  { codigo: 'MO-MAM-03', nombre: 'Ayudante de mampostería y pañetes', disciplina: 'MAM', tipo: 'OPERATIVO_CAMPO', nivel: 'NIVEL_1', smlv: 1.0 },

  // PIS — Pisos, enchapes y piedra natural
  { codigo: 'MO-PIS-01', nombre: 'Maestro de pisos y acabados pétreos', disciplina: 'PIS', tipo: 'OPERATIVO_CAMPO', nivel: 'NIVEL_2', smlv: 2.0 },
  { codigo: 'MO-PIS-02', nombre: 'Oficial enchapador / instalador de mármol y porcelanato', disciplina: 'PIS', tipo: 'OPERATIVO_CAMPO', nivel: 'NIVEL_1_5', smlv: 1.5 },
  { codigo: 'MO-PIS-03', nombre: 'Ayudante de pisos y enchapes', disciplina: 'PIS', tipo: 'OPERATIVO_CAMPO', nivel: 'NIVEL_1', smlv: 1.0 },

  // DRY — Sistemas livianos y cielos
  { codigo: 'MO-DRY-01', nombre: 'Maestro de obra liviana e interiores', disciplina: 'DRY', tipo: 'OPERATIVO_CAMPO', nivel: 'NIVEL_2', smlv: 2.0 },
  { codigo: 'MO-DRY-02', nombre: 'Oficial instalador drywall, Superboard y cielos', disciplina: 'DRY', tipo: 'OPERATIVO_CAMPO', nivel: 'NIVEL_1_5', smlv: 1.5 },
  { codigo: 'MO-DRY-03', nombre: 'Ayudante de sistemas livianos', disciplina: 'DRY', tipo: 'OPERATIVO_CAMPO', nivel: 'NIVEL_1', smlv: 1.0 },

  // PIN — Estuco y pintura
  { codigo: 'MO-PIN-01', nombre: 'Maestro pintor y acabados especiales', disciplina: 'PIN', tipo: 'OPERATIVO_CAMPO', nivel: 'NIVEL_2', smlv: 2.0 },
  { codigo: 'MO-PIN-02', nombre: 'Oficial estucador y pintor arquitectónico/epóxico', disciplina: 'PIN', tipo: 'OPERATIVO_CAMPO', nivel: 'NIVEL_1_5', smlv: 1.5 },
  { codigo: 'MO-PIN-03', nombre: 'Ayudante preparador de superficies y pintura', disciplina: 'PIN', tipo: 'OPERATIVO_CAMPO', nivel: 'NIVEL_1', smlv: 1.0 },

  // MET — Estructura metálica y cerrajería
  { codigo: 'MO-MET-01', nombre: 'Maestro soldador calificado AWS y armador estructural', disciplina: 'MET', tipo: 'ESPECIALISTA_TECNICO', nivel: 'NIVEL_2', smlv: 2.0 },
  { codigo: 'MO-MET-02', nombre: 'Oficial cerrajero y montador de estructura metálica', disciplina: 'MET', tipo: 'ESPECIALISTA_TECNICO', nivel: 'NIVEL_1_5', smlv: 1.5 },
  { codigo: 'MO-MET-03', nombre: 'Auxiliar de estructura metálica y cerrajería', disciplina: 'MET', tipo: 'OPERATIVO_CAMPO', nivel: 'NIVEL_1', smlv: 1.0 },

  // CMA — Carpintería en madera y mobiliario arquitectónico (independizado)
  { codigo: 'MO-CMA-01', nombre: 'Maestro ebanista y carpintero arquitectónico', disciplina: 'CMA', tipo: 'ESPECIALISTA_TECNICO', nivel: 'NIVEL_2', smlv: 2.0 },
  { codigo: 'MO-CMA-02', nombre: 'Oficial carpintero instalador de madera y mobiliario RH', disciplina: 'CMA', tipo: 'ESPECIALISTA_TECNICO', nivel: 'NIVEL_1_5', smlv: 1.5 },
  { codigo: 'MO-CMA-03', nombre: 'Auxiliar de carpintería en madera', disciplina: 'CMA', tipo: 'OPERATIVO_CAMPO', nivel: 'NIVEL_1', smlv: 1.0 },

  // CAL — Carpintería en aluminio y vidriería arquitectónica (independizado)
  { codigo: 'MO-CAL-01', nombre: 'Maestro técnico en carpintería de aluminio y fachadas', disciplina: 'CAL', tipo: 'ESPECIALISTA_TECNICO', nivel: 'NIVEL_2', smlv: 2.0 },
  { codigo: 'MO-CAL-02', nombre: 'Oficial aluminiero e instalador de vidrio templado', disciplina: 'CAL', tipo: 'ESPECIALISTA_TECNICO', nivel: 'NIVEL_1_5', smlv: 1.5 },
  { codigo: 'MO-CAL-03', nombre: 'Auxiliar de carpintería en aluminio y vidriería', disciplina: 'CAL', tipo: 'OPERATIVO_CAMPO', nivel: 'NIVEL_1', smlv: 1.0 },

  // GUA — Construcción en guadua (independizado, sin término bioconstrucción)
  { codigo: 'MO-GUA-01', nombre: 'Maestro constructor especializado en estructuras de guadua', disciplina: 'GUA', tipo: 'ESPECIALISTA_TECNICO', nivel: 'NIVEL_2', smlv: 2.0 },
  { codigo: 'MO-GUA-02', nombre: 'Oficial armador e inmunizador en construcción con guadua', disciplina: 'GUA', tipo: 'ESPECIALISTA_TECNICO', nivel: 'NIVEL_1_5', smlv: 1.5 },
  { codigo: 'MO-GUA-03', nombre: 'Ayudante práctico de construcción en guadua', disciplina: 'GUA', tipo: 'OPERATIVO_CAMPO', nivel: 'NIVEL_1', smlv: 1.0 },

  // MAD — Construcción estructural en madera (independizado)
  { codigo: 'MO-MAD-01', nombre: 'Maestro carpintero de estructuras y cubiertas en madera', disciplina: 'MAD', tipo: 'ESPECIALISTA_TECNICO', nivel: 'NIVEL_2', smlv: 2.0 },
  { codigo: 'MO-MAD-02', nombre: 'Oficial armador de estructuras en madera aserrada y rolliza', disciplina: 'MAD', tipo: 'ESPECIALISTA_TECNICO', nivel: 'NIVEL_1_5', smlv: 1.5 },
  { codigo: 'MO-MAD-03', nombre: 'Ayudante práctico de construcción en madera', disciplina: 'MAD', tipo: 'OPERATIVO_CAMPO', nivel: 'NIVEL_1', smlv: 1.0 },

  // HID — Redes hidrosanitarias y PETAR (independizado de gas domiciliario)
  { codigo: 'MO-HID-01', nombre: 'Maestro hidrosanitario y sistemas PETAR', disciplina: 'HID', tipo: 'ESPECIALISTA_TECNICO', nivel: 'NIVEL_2', smlv: 2.0 },
  { codigo: 'MO-HID-02', nombre: 'Oficial plomero e instalador hidrosanitario', disciplina: 'HID', tipo: 'OPERATIVO_CAMPO', nivel: 'NIVEL_1_5', smlv: 1.5 },
  { codigo: 'MO-HID-03', nombre: 'Auxiliar de plomería e instalaciones hidrosanitarias', disciplina: 'HID', tipo: 'OPERATIVO_CAMPO', nivel: 'NIVEL_1', smlv: 1.0 },

  // GAS — Redes de gas domiciliario y comercial (independizado)
  { codigo: 'MO-GAS-01', nombre: 'Maestro técnico en redes de gas domiciliario NTC 2505', disciplina: 'GAS', tipo: 'ESPECIALISTA_TECNICO', nivel: 'NIVEL_2', smlv: 2.0 },
  { codigo: 'MO-GAS-02', nombre: 'Oficial instalador certificado de gas domiciliario', disciplina: 'GAS', tipo: 'ESPECIALISTA_TECNICO', nivel: 'NIVEL_1_5', smlv: 1.5 },
  { codigo: 'MO-GAS-03', nombre: 'Auxiliar de instalaciones de gas domiciliario', disciplina: 'GAS', tipo: 'OPERATIVO_CAMPO', nivel: 'NIVEL_1', smlv: 1.0 },

  // ELE — Redes eléctricas RETIE
  { codigo: 'MO-ELE-01', nombre: 'Maestro / supervisor técnico electricista CONTE', disciplina: 'ELE', tipo: 'ESPECIALISTA_TECNICO', nivel: 'NIVEL_2', smlv: 2.0 },
  { codigo: 'MO-ELE-02', nombre: 'Oficial técnico electricista instalador RETIE', disciplina: 'ELE', tipo: 'ESPECIALISTA_TECNICO', nivel: 'NIVEL_1_5', smlv: 1.5 },
  { codigo: 'MO-ELE-03', nombre: 'Auxiliar electricista de obra', disciplina: 'ELE', tipo: 'OPERATIVO_CAMPO', nivel: 'NIVEL_1', smlv: 1.0 },

  // VYD — Voz, datos y telecomunicaciones
  { codigo: 'MO-VYD-01', nombre: 'Maestro especialista telecomunicaciones y fibra óptica', disciplina: 'VYD', tipo: 'ESPECIALISTA_TECNICO', nivel: 'NIVEL_2', smlv: 2.0 },
  { codigo: 'MO-VYD-02', nombre: 'Oficial técnico de cableado estructurado Cat 6A', disciplina: 'VYD', tipo: 'ESPECIALISTA_TECNICO', nivel: 'NIVEL_1_5', smlv: 1.5 },
  { codigo: 'MO-VYD-03', nombre: 'Auxiliar de voz, datos y corrientes débiles', disciplina: 'VYD', tipo: 'OPERATIVO_CAMPO', nivel: 'NIVEL_1', smlv: 1.0 },

  // RCI — Red contra incendio (extinción)
  { codigo: 'MO-RCI-01', nombre: 'Maestro especialista red contra incendio NFPA 13/14', disciplina: 'RCI', tipo: 'ESPECIALISTA_TECNICO', nivel: 'NIVEL_2', smlv: 2.0 },
  { codigo: 'MO-RCI-02', nombre: 'Oficial tubero ranurador / soldador RCI SCH 10-40', disciplina: 'RCI', tipo: 'ESPECIALISTA_TECNICO', nivel: 'NIVEL_1_5', smlv: 1.5 },
  { codigo: 'MO-RCI-03', nombre: 'Auxiliar de montaje red contra incendio', disciplina: 'RCI', tipo: 'OPERATIVO_CAMPO', nivel: 'NIVEL_1', smlv: 1.0 },

  // DET — Detección y alarma de incendio
  { codigo: 'MO-DET-01', nombre: 'Maestro especialista detección y programación NFPA 72', disciplina: 'DET', tipo: 'ESPECIALISTA_TECNICO', nivel: 'NIVEL_2', smlv: 2.0 },
  { codigo: 'MO-DET-02', nombre: 'Oficial técnico en detección y electrónica de incendio', disciplina: 'DET', tipo: 'ESPECIALISTA_TECNICO', nivel: 'NIVEL_1_5', smlv: 1.5 },
  { codigo: 'MO-DET-03', nombre: 'Auxiliar de canalización y cableado detección', disciplina: 'DET', tipo: 'OPERATIVO_CAMPO', nivel: 'NIVEL_1', smlv: 1.0 },

  // AA — Climatización y ventilación mecánica
  { codigo: 'MO-AA-01', nombre: 'Maestro técnico frigorista y sistemas VRF/HVAC', disciplina: 'AA', tipo: 'ESPECIALISTA_TECNICO', nivel: 'NIVEL_2', smlv: 2.0 },
  { codigo: 'MO-AA-02', nombre: 'Oficial técnico en aire acondicionado y ductería', disciplina: 'AA', tipo: 'ESPECIALISTA_TECNICO', nivel: 'NIVEL_1_5', smlv: 1.5 },
  { codigo: 'MO-AA-03', nombre: 'Auxiliar de climatización y ventilación mecánica', disciplina: 'AA', tipo: 'OPERATIVO_CAMPO', nivel: 'NIVEL_1', smlv: 1.0 },

  // GM — Gases medicinales
  { codigo: 'MO-GM-01', nombre: 'Maestro especialista redes de gases medicinales NFPA 99', disciplina: 'GM', tipo: 'ESPECIALISTA_TECNICO', nivel: 'NIVEL_2', smlv: 2.0 },
  { codigo: 'MO-GM-02', nombre: 'Oficial soldador oxiacetileno / plata en cobre tipo K-L', disciplina: 'GM', tipo: 'ESPECIALISTA_TECNICO', nivel: 'NIVEL_1_5', smlv: 1.5 },
  { codigo: 'MO-GM-03', nombre: 'Auxiliar técnico de gases medicinales', disciplina: 'GM', tipo: 'OPERATIVO_CAMPO', nivel: 'NIVEL_1', smlv: 1.0 },

  // ADM — Dirección técnica, SST y administración de obra (para AIU y Nómina ERP)
  { codigo: 'MO-ADM-01', nombre: 'Director general de obra (ingeniero civil / arquitecto)', disciplina: 'ADM', tipo: 'ADMINISTRATIVO_OBRA', nivel: 'PROFESIONAL', smlv: 4.5 },
  { codigo: 'MO-ADM-02', nombre: 'Ingeniero / arquitecto residente de obra', disciplina: 'ADM', tipo: 'ADMINISTRATIVO_OBRA', nivel: 'PROFESIONAL', smlv: 3.0 },
  { codigo: 'MO-ADM-03', nombre: 'Ingeniero residente de instalaciones MEP / RCI', disciplina: 'ADM', tipo: 'ADMINISTRATIVO_OBRA', nivel: 'PROFESIONAL', smlv: 3.2 },
  { codigo: 'MO-ADM-04', nombre: 'Profesional / tecnólogo SST en obra', disciplina: 'ADM', tipo: 'ADMINISTRATIVO_OBRA', nivel: 'PROFESIONAL', smlv: 2.2 },
  { codigo: 'MO-ADM-05', nombre: 'Maestro general de obra', disciplina: 'ADM', tipo: 'ADMINISTRATIVO_OBRA', nivel: 'NIVEL_2', smlv: 2.5 },
  { codigo: 'MO-ADM-06', nombre: 'Almacenista / controlador de materiales en obra', disciplina: 'ADM', tipo: 'ADMINISTRATIVO_OBRA', nivel: 'NIVEL_1_5', smlv: 1.5 },
  { codigo: 'MO-ADM-07', nombre: 'Celador / guarda de seguridad de campamento', disciplina: 'ADM', tipo: 'ADMINISTRATIVO_OBRA', nivel: 'NIVEL_1', smlv: 1.2 },
];

export const CUADRILLAS_MO_BD = [
  {
    codigo: 'CUA-TOP',
    nombre: 'Cuadrilla topografía y replanteo',
    disciplina: 'TOP',
    integrantes: [['MO-TOP-01', 1.0], ['MO-TOP-02', 1.0], ['MO-TOP-03', 1.0]],
    descripcion: '1.0 Topógrafo + 1.0 Cadenero 1° + 1.0 Cadenero 2°',
  },
  {
    codigo: 'CUA-MOV',
    nombre: 'Cuadrilla movimiento de tierras y demoliciones',
    disciplina: 'MOV',
    integrantes: [['MO-MOV-01', 0.2], ['MO-MOV-02', 1.0], ['MO-MOV-03', 2.0]],
    descripcion: '0.2 Maestro Excavación + 1.0 Oficial + 2.0 Ayudantes',
  },
  {
    codigo: 'CUA-CIV',
    nombre: 'Cuadrilla obra civil y estructura en concreto',
    disciplina: 'CIV',
    integrantes: [['MO-CIV-01', 0.3], ['MO-CIV-02', 1.0], ['MO-CIV-03', 2.0]],
    descripcion: '0.3 Maestro Civil + 1.0 Oficial Concretero + 2.0 Ayudantes',
  },
  {
    codigo: 'CUA-MAM',
    nombre: 'Cuadrilla mampostería, pañetes y cubiertas',
    disciplina: 'MAM',
    integrantes: [['MO-MAM-01', 0.3], ['MO-MAM-02', 1.0], ['MO-MAM-03', 1.5]],
    descripcion: '0.3 Maestro Mampostería + 1.0 Oficial Mampostero + 1.5 Ayudantes',
  },
  {
    codigo: 'CUA-PIS',
    nombre: 'Cuadrilla pisos, enchapes y piedra natural',
    disciplina: 'PIS',
    integrantes: [['MO-PIS-01', 0.3], ['MO-PIS-02', 1.5], ['MO-PIS-03', 2.0]],
    descripcion: '0.3 Maestro Pisos + 1.5 Oficiales Enchapadores + 2.0 Ayudantes',
  },
  {
    codigo: 'CUA-DRY',
    nombre: 'Cuadrilla sistemas livianos, drywall y cielos',
    disciplina: 'DRY',
    integrantes: [['MO-DRY-01', 0.5], ['MO-DRY-02', 1.0], ['MO-DRY-03', 3.0]],
    descripcion: '0.5 Maestro Livianos + 1.0 Oficial Drywall + 3.0 Ayudantes',
  },
  {
    codigo: 'CUA-PIN',
    nombre: 'Cuadrilla estuco, pintura y recubrimientos',
    disciplina: 'PIN',
    integrantes: [['MO-PIN-01', 0.2], ['MO-PIN-02', 1.0], ['MO-PIN-03', 1.0]],
    descripcion: '0.2 Maestro Pintor + 1.0 Oficial Estucador/Pintor + 1.0 Ayudante',
  },
  {
    codigo: 'CUA-MET',
    nombre: 'Cuadrilla estructura metálica y cerrajería',
    disciplina: 'MET',
    integrantes: [['MO-MET-01', 0.5], ['MO-MET-02', 1.0], ['MO-MET-03', 1.5]],
    descripcion: '0.5 Maestro Soldador AWS + 1.0 Oficial Cerrajero + 1.5 Auxiliares',
  },
  {
    codigo: 'CUA-CMA',
    nombre: 'Cuadrilla carpintería en madera y mobiliario',
    disciplina: 'CMA',
    integrantes: [['MO-CMA-01', 0.3], ['MO-CMA-02', 1.0], ['MO-CMA-03', 1.5]],
    descripcion: '0.3 Maestro Ebanista + 1.0 Oficial Carpintero Madera + 1.5 Auxiliares',
  },
  {
    codigo: 'CUA-CAL',
    nombre: 'Cuadrilla carpintería en aluminio y vidrio',
    disciplina: 'CAL',
    integrantes: [['MO-CAL-01', 0.3], ['MO-CAL-02', 1.0], ['MO-CAL-03', 1.5]],
    descripcion: '0.3 Maestro Aluminio/Fachadas + 1.0 Oficial Aluminiero/Vidriero + 1.5 Auxiliares',
  },
  {
    codigo: 'CUA-GUA',
    nombre: 'Cuadrilla construcción en guadua',
    disciplina: 'GUA',
    integrantes: [['MO-GUA-01', 0.3], ['MO-GUA-02', 1.0], ['MO-GUA-03', 1.0]],
    descripcion: '0.3 Maestro Guadua + 1.0 Oficial Armador Guadua + 1.0 Ayudante Guadua',
  },
  {
    codigo: 'CUA-MAD',
    nombre: 'Cuadrilla construcción en madera',
    disciplina: 'MAD',
    integrantes: [['MO-MAD-01', 0.3], ['MO-MAD-02', 1.0], ['MO-MAD-03', 1.0]],
    descripcion: '0.3 Maestro Estructuras Madera + 1.0 Oficial Armador Madera + 1.0 Ayudante',
  },
  {
    codigo: 'CUA-HID',
    nombre: 'Cuadrilla instalaciones hidrosanitarias y PETAR',
    disciplina: 'HID',
    integrantes: [['MO-HID-01', 0.3], ['MO-HID-02', 1.0], ['MO-HID-03', 1.5]],
    descripcion: '0.3 Maestro Hidro/PETAR + 1.0 Oficial Plomero + 1.5 Auxiliares',
  },
  {
    codigo: 'CUA-GAS',
    nombre: 'Cuadrilla instalaciones de gas domiciliario',
    disciplina: 'GAS',
    integrantes: [['MO-GAS-01', 0.3], ['MO-GAS-02', 1.0], ['MO-GAS-03', 1.0]],
    descripcion: '0.3 Maestro Gas NTC 2505 + 1.0 Oficial Instalador Gas + 1.0 Auxiliar',
  },
  {
    codigo: 'CUA-ELE',
    nombre: 'Cuadrilla instalaciones eléctricas RETIE',
    disciplina: 'ELE',
    integrantes: [['MO-ELE-01', 0.3], ['MO-ELE-02', 1.0], ['MO-ELE-03', 1.5]],
    descripcion: '0.3 Maestro Eléctrico + 1.0 Técnico Electricista + 1.5 Auxiliares',
  },
  {
    codigo: 'CUA-VYD',
    nombre: 'Cuadrilla voz, datos y cableado estructurado',
    disciplina: 'VYD',
    integrantes: [['MO-VYD-01', 0.2], ['MO-VYD-02', 0.5], ['MO-VYD-03', 1.0]],
    descripcion: '0.2 Maestro Telecom. + 0.5 Oficial Cableado + 1.0 Auxiliar VyD',
  },
  {
    codigo: 'CUA-RCI',
    nombre: 'Cuadrilla red contra incendio (extinción)',
    disciplina: 'RCI',
    integrantes: [['MO-RCI-01', 0.5], ['MO-RCI-02', 1.0], ['MO-RCI-03', 3.0]],
    descripcion: '0.5 Maestro RCI + 1.0 Oficial Tubero RCI + 3.0 Auxiliares RCI',
  },
  {
    codigo: 'CUA-DET',
    nombre: 'Cuadrilla detección y alarma de incendio',
    disciplina: 'DET',
    integrantes: [['MO-DET-01', 0.3], ['MO-DET-02', 1.0], ['MO-DET-03', 2.0]],
    descripcion: '0.3 Maestro Detección + 1.0 Oficial Electrónico + 2.0 Auxiliares',
  },
  {
    codigo: 'CUA-AA',
    nombre: 'Cuadrilla aire acondicionado y ventilación HVAC',
    disciplina: 'AA',
    integrantes: [['MO-AA-01', 1.0], ['MO-AA-02', 0.5], ['MO-AA-03', 2.0]],
    descripcion: '1.0 Maestro HVAC + 0.5 Oficial Refrigeración + 2.0 Auxiliares',
  },
  {
    codigo: 'CUA-GM',
    nombre: 'Cuadrilla redes de gases medicinales NFPA 99',
    disciplina: 'GM',
    integrantes: [['MO-GM-01', 1.0], ['MO-GM-02', 1.0], ['MO-GM-03', 1.0]],
    descripcion: '1.0 Maestro Gases Med. + 1.0 Oficial Soldador Plata + 1.0 Auxiliar',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 4. MODERNIZACIÓN Y CLASIFICACIÓN DE INSUMOS (26 CATEGORÍAS DE ALMACÉN)
// ═══════════════════════════════════════════════════════════════════════════

const MARMOLES_NACIONALES_SOLOS = new Set([
  'ROSA HUILA', 'NEGRO CARACOL', 'GRIS PUTUMAYO', 'GRIS PERLA', 'ROSA TACUEYO', 'RIO CLARO', 'TRAVERTINO',
]);
const MARMOLES_IMPORTADOS_SOLOS = new Set([
  'MULATA CAMPINA', 'VERDE ANDES', 'CAFE PINTO', 'TRAV. PERUANO', 'TRAV PERUANO', 'CREMA MARFIL',
]);
const GRANITOS_IMPORTADOS_SOLOS = new Set([
  'GHIANDONE', 'ROSSAPORRINO', 'VERDE UBATUBA', 'ROJO GUAYANA', 'NEGRO ABSOLUTO',
  'LABRADOR CLARO', 'LABRADOR OSCURO', 'JASPE', 'CAFE BALTICO', 'GRIS GUAYANA',
  'SIERRA CHICA', 'GIALLO SAN FCO.', 'GIALLO SAN FCO',
]);

/**
 * Sinónimos canónicos de insumos base repetidos entre Hospital, Ricaurte, Detección y APEU.
 */
const INSUMOS_CANONICOS = [
  {
    test: (N) => /^(CEGRIS|CEMENTO\s*GRIS)\b/.test(N) && !/BLANCO/.test(N),
    clave: 'MAT_CEMENTO_GRIS_50KG',
    nombre: 'Cemento gris Portland tipo UG bulto x 50 kg',
    unidad: 'BTO',
    categoria: 'OBRA GRIS Y AGREGADOS',
    disciplina: 'CIV',
  },
  {
    test: (N) => /^(CEBLANCO|CEMENTO\s*BLANCO)/.test(N),
    clave: 'MAT_CEMENTO_BLANCO_40KG',
    nombre: 'Cemento blanco uso general bulto x 40 kg',
    unidad: 'BTO',
    categoria: 'OBRA GRIS Y AGREGADOS',
    disciplina: 'PIS',
  },
  {
    test: (N) => /^AGUA(\s+POTABLE(\s+PARA\s+CONSTRUCCION)?)?$/.test(N),
    clave: 'MAT_AGUA_POTABLE',
    nombre: 'Agua potable para construcción',
    unidad: 'LT',
    categoria: 'OBRA GRIS Y AGREGADOS',
    disciplina: 'CIV',
  },
  {
    test: (N) => /^ARENA (LAVADA|DE CONCRETO|LAVADA DE RIO)/.test(N),
    clave: 'MAT_ARENA_LAVADA_CONCRETO',
    nombre: 'Arena lavada de río para concreto',
    unidad: 'M3',
    categoria: 'OBRA GRIS Y AGREGADOS',
    disciplina: 'CIV',
  },
  {
    test: (N) => /^ARENA (NEGRA|DE PENA)/.test(N),
    clave: 'MAT_ARENA_PENA_MORTERO',
    nombre: 'Arena negra de peña seleccionada para mortero',
    unidad: 'M3',
    categoria: 'OBRA GRIS Y AGREGADOS',
    disciplina: 'MAM',
  },
  {
    test: (N) => /^(GRAVILLA 3\/4|GRAVILLA \/ TRITURADO SELECCIONADO DE 3\/4|TRITURADO SELEC|GRAVA 3\/4)/.test(N),
    clave: 'MAT_TRITURADO_3_4',
    nombre: 'Triturado / grava seleccionada de 3/4" para concreto',
    unidad: 'M3',
    categoria: 'OBRA GRIS Y AGREGADOS',
    disciplina: 'CIV',
  },
  {
    test: (N) => /^TRITURADO COMUN$/.test(N),
    clave: 'MAT_TRITURADO_COMUN',
    nombre: 'Triturado común para concreto',
    unidad: 'M3',
    categoria: 'OBRA GRIS Y AGREGADOS',
    disciplina: 'CIV',
  },
  {
    test: (N) => /^RAJON$|^PIEDRA RAJON/.test(N),
    clave: 'MAT_PIEDRA_RAJON',
    nombre: 'Piedra rajón seleccionada para cimiento ciclópeo',
    unidad: 'M3',
    categoria: 'OBRA GRIS Y AGREGADOS',
    disciplina: 'CIV',
  },
  {
    test: (N) => /^RECEBO(\s+COMUN|\s+COMPACTADO)?$/.test(N),
    clave: 'MAT_RECEBO_GRANULAR',
    nombre: 'Recebo granular seleccionado para afirmado y relleno',
    unidad: 'M3',
    categoria: 'OBRA GRIS Y AGREGADOS',
    disciplina: 'MOV',
  },
  {
    test: (N) => /^SUB-?BASE(\s+GRANULAR)?$/.test(N),
    clave: 'MAT_SUBBASE_GRANULAR',
    nombre: 'Subbase granular seleccionada norma INVIAS',
    unidad: 'M3',
    categoria: 'OBRA GRIS Y AGREGADOS',
    disciplina: 'CIV',
  },
  {
    test: (N) => /^BASE\s+GRANULAR$/.test(N),
    clave: 'MAT_BASE_GRANULAR',
    nombre: 'Base granular clase A norma INVIAS',
    unidad: 'M3',
    categoria: 'OBRA GRIS Y AGREGADOS',
    disciplina: 'CIV',
  },
  {
    test: (N) => /^ALAMBRE (DE AMARRE|NEGRO RECOCIDO)/.test(N),
    clave: 'MAT_ALAMBRE_AMARRE_18',
    nombre: 'Alambre negro recocido Cal. 18 para amarre',
    unidad: 'KG',
    categoria: 'FERRETERÍA',
    disciplina: 'CIV',
  },
  {
    test: (N) => /^ACERO (FIGURADO|CORRUGADO FIGURADO|DE REFUERZO)/.test(N) && !/INOXIDABLE/.test(N),
    clave: 'MAT_ACERO_FIGURADO_60000',
    nombre: 'Acero corrugado figurado fy=420 MPa (60.000 psi)',
    unidad: 'KG',
    categoria: 'ACEROS DE REFUERZO',
    disciplina: 'CIV',
  },
  {
    test: (N) => /^SOLDADURA PVC$/.test(N),
    clave: 'MAT_SOLDADURA_PVC_LIQ',
    nombre: 'Soldadura líquida para tubería PVC',
    unidad: 'LT',
    categoria: 'QUÍMICOS',
    disciplina: 'HID',
  },
  {
    test: (N) => /^LIMPIADOR PVC|^LIMPIADOR REMOVEDOR PVC/.test(N),
    clave: 'MAT_LIMPIADOR_PVC',
    nombre: 'Limpiador acondicionador para tubería y accesorios PVC',
    unidad: 'GAL',
    categoria: 'QUÍMICOS',
    disciplina: 'HID',
  },
  {
    test: (N) => /^TRANSPORTE Y MANEJO DE EQUIPOS Y MATERIALES EN OBRA$/.test(N),
    clave: 'TRN_MANEJO_EQUIPOS_OBRA',
    nombre: 'Transporte y manejo técnico de equipos especiales en obra (índice base)',
    unidad: 'UND',
    categoria: 'TRANSPORTE Y LOGÍSTICA',
    disciplina: 'AA',
    esIndiceMil: true,
  },
  {
    test: (N) => /^TRANSPORTE\s*GASES INDUSTRIALES DE PURGA/.test(N),
    clave: 'TRN_GASES_PURGA_NITROGENO',
    nombre: 'Transporte, nitrógeno industrial de purga e insumos de soldadura medicinal (índice base)',
    unidad: 'UND',
    categoria: 'TRANSPORTE Y LOGÍSTICA',
    disciplina: 'GM',
    esIndiceMil: true,
  },
];

const REEMPLAZOS_INSUMO = [
  [/\bCegr[ií]s\s*50\s*kg\b/gi, 'Cemento gris Portland tipo UG bulto x 50 kg'],
  [/\bCeblanco\s*50\s*kg\b/gi, 'Cemento blanco uso general bulto x 40 kg'],
  [/\bCONCRETO PREMEZCLADO 35000 PSI\b/gi, 'Concreto premezclado 3500 psi'],
  [/\bTriturado selec\.?\b/gi, 'Triturado seleccionado de 3/4"'],
  [/\bTriturado comun\b/gi, 'Triturado común para concreto'],
  [/\bTubo PVC San\b/gi, 'Tubería PVC sanitaria Ø'],
  [/\bTubo PVC ALL\b/gi, 'Tubería PVC aguas lluvias Ø'],
  [/\bTubo PVC Pr\b/gi, 'Tubería PVC presión Ø'],
  [/\bTee San\b/gi, 'Tee sanitaria PVC Ø'],
  [/\bCod(?:o)?\s+(?:PVC\s+)?San\b/gi, 'Codo sanitario PVC 90° Ø'],
  [/\bTee Presion\b/gi, 'Tee PVC presión Ø'],
  [/\bCodo Presion\b/gi, 'Codo PVC presión 90° Ø'],
  [/\bARM Pres\b/gi, 'Adaptador macho PVC presión Ø'],
  [/\bARH Pres\b/gi, 'Adaptador hembra PVC presión Ø'],
  [/\bLlave PD\b/gi, 'Llave de paso pesada directa Ø'],
  [/\bLlave [Bb]ola\b/gi, 'Válvula de bola en bronce Ø'],
  [/\bNiple HG\s*([\d/"]+)\s*10\b/gi, 'Niple hierro galvanizado Ø $1 x 10 cm'],
  [/\bCodo HG\b/gi, 'Codo hierro galvanizado 90° Ø'],
  [/\bCodo cem\b/gi, 'Codo en concreto Ø'],
  [/\bTubo cement\b/gi, 'Tubería de concreto simple Ø'],
  [/\bTubo cemento\b/gi, 'Tubería de concreto simple Ø'],
  [/\bTubo gress\s*(\d+)(?!")/gi, 'Tubería gres vitrificado Ø $1"'],
  [/\bCodo gress\b/gi, 'Codo gres vitrificado Ø'],
  [/\bPVC conduit\b/gi, 'Tubería conduit PVC eléctrica Ø'],
  [/\bConduit met\b/gi, 'Tubería conduit metálica galvanizada Ø'],
  [/\bUn cond PVC\s*/gi, 'Unión conduit PVC Ø '],
  [/\bUn cond met\s*/gi, 'Unión conduit metálica Ø '],
  [/\bCur cond met\s*/gi, 'Curva conduit metálica 90° Ø '],
  [/\bCurva 90\b/gi, 'Curva conduit PVC 90° Ø'],
  [/\bAdapt Term\b/gi, 'Adaptador terminal conduit PVC Ø'],
  [/\bCaja galv oct\b/gi, 'Caja metálica galvanizada octogonal'],
  [/\bCaja galv\b/gi, 'Caja metálica galvanizada rectangular'],
  [/\bCaja Toma espec\b/gi, 'Caja metálica galvanizada 4x4" para toma especial'],
  [/\bToma sencillo\b/gi, 'Tomacorriente sencillo 15A 125V'],
  [/\bToma doble\b/gi, 'Tomacorriente doble con polo a tierra 15A 125V'],
  [/\bToma tripolar20a\b/gi, 'Tomacorriente trifásico especial 50A 250V'],
  [/\bInterruptor senc\b/gi, 'Interruptor sencillo 10A 125V'],
  [/\bInterruptor conm\b/gi, 'Interruptor conmutable 10A 125V'],
  [/\bTablero 4 circuit\b/gi, 'Tablero de distribución monofásico 4 circuitos'],
  [/\bBreacker\s*(\d+)\s*amp\b/gi, 'Interruptor termomagnético (breaker) monopolar $1A'],
  [/\bBreacker\b/gi, 'Interruptor termomagnético (breaker)'],
  [/\bAlam alum cal\s*(\d+)/gi, 'Conductor monopolar en aluminio calibre $1 AWG'],
  [/\bAlam cob cal\s*(\d+)/gi, 'Conductor de cobre aislado THHN/THWN calibre $1 AWG'],
  [/\bGuardaes bald\b/gi, 'Guardaescoba en baldosa de cemento'],
  [/\bGuardaesc\.?madera\b/gi, 'Guardaescoba en madera inmunizada'],
  [/\bRev ceram\b/gi, 'Revestimiento cerámico de pared'],
  [/\bPav ceram\b/gi, 'Piso cerámico tráfico residencial'],
  [/\bCeram\s+(\d)/gi, 'Cerámica esmaltada $1'],
  [/\bPegacor pegadit\b/gi, 'Adhesivo cerámico tipo Pegacor gris'],
  [/\bWinn aluminio\b/gi, 'Perfil dilatación / remate tipo Win en aluminio'],
  [/\bWinn plastico\b/gi, 'Perfil dilatación / remate tipo Win en PVC'],
  [/\bEstuco profesion\b/gi, 'Estuco plástico acrílico profesional interior'],
  [/\bPuerta met\s*([\d.]+)\s*2\s*ho\b/gi, 'Puerta metálica en lámina Cold Rolled $1 m (2 hojas)'],
  [/\bPuerta met\s*([\d.]+)\s*(cm)?\b/gi, 'Puerta metálica en lámina Cold Rolled ancho $1 $2'],
  [/\bPuerta entamb\s*(\d+)\b/gi, 'Puerta entamborada en madera ancho 0.$1 m'],
  [/\bList\.?\s*achapo\s*(\d+x\d+)\b/gi, 'Listón de madera achapo cepillado $1 cm'],
  [/\bVig\s+achapo\s*(\d+x\d+)\b/gi, 'Viga de madera achapo cepillada $1 cm'],
  [/^Eucalipto\s+D\s*=\s*(\d+)\s*cm$/gi, 'Madera rolliza de eucalipto inmunizada Ø $1 cm'],
  [/^Ac\s+([\d.]+)\s*mm\s*x\s*6\s*mt$/gi, 'Varilla de acero figurado Ø $1 mm x 6 m'],
  [/^Acero\s+(\d+(?:[.,]\d+)?)\s*mm\s*[xX]\s*6\s*mt$/gi, 'Varilla de acero corrugado Ø $1 mm x 6 m'],
  [/^Acero\s+([\d/." ]+)\s*[xX]\s*6\s*mt$/gi, 'Varilla de acero corrugado Ø $1 x 6 m'],
  [/\bAros HF Alcantar\b/gi, 'Aro y tapa en hierro fundido para alcantarillado'],
  [/\bAsfalto sol T190\b/gi, 'Asfalto sólido oxidado tipo T-190 para juntas'],
  [/\bTierra veg \+ trans\b/gi, 'Tierra negra orgánica vegetal (incluye transporte)'],
  [/\bCera plast emulsi\b/gi, 'Cera plástica emulsionada antideslizante para pisos'],
  [/\bTab Gress\b/gi, 'Tableta de gres vitrificado'],
  [/\bBloq esmeril\b/gi, 'Bloque abrasivo de esmeril grano'],
  [/\bTromp esmer\b/gi, 'Trompo abrasivo de esmeril grano'],
  [/\bPiedra pulid\b/gi, 'Piedra abrasiva para pulidora grano'],
  [/\bTeja AC Num\s*(\d+)\b/gi, 'Teja ondulada de fibrocemento perfil 7 N.° $1'],
  [/\bClaraboya AC\s*(\d+)\b/gi, 'Claraboya traslúcida para teja fibrocemento N.° $1'],
  [/\bTej ventilac AC\s*(\d+)\b/gi, 'Teja con ventilación en fibrocemento N.° $1'],
  [/\bUnion Canal Bajan\b/gi, 'Unión bajante a canal pluvial PVC'],
  [/\bRejilla alum\b/gi, 'Rejilla de piso en aluminio con sosco Ø'],
  [/\bValv pozuelo\b/gi, 'Válvula desagüe tipo canastilla para pozuelo Ø'],
  [/\bRaj marmol rosad\b/gi, 'Retal / rajón de mármol rosado para grano'],
  [/\bRaj marmol\b/gi, 'Retal / rajón de mármol seleccionado'],
  [/\bIncrustac\.\s*/gi, 'Juego de incrustaciones sanitarias línea '],
  [/\bRemates\s+Porcel\.?(?=\s|$)/gi, 'Perfil remate media caña en porcelana'],
  [/\bRemates Tracia\b/gi, 'Perfil remate media caña metálico línea Tracia'],
  [/\bTubo cort\.?\s*Ducha\b/gi, 'Tubo extensible en aluminio para cortina de ducha'],
  [/\bViniltex int y ext\.?\b/gi, 'Pintura vinilo acrílico tipo 1 interior/exterior'],
  [/\bTintilla p\/\s*madera\b/gi, 'Tintilla concentrada para inmunizado y tono de madera'],
  [/\bPintura P\s*\/Trafico\b/gi, 'Pintura acrílica reflectiva para demarcación vial (tráfico)'],
  [/\b(?:Disolvente\s+Thiner|Solvente\s+thinner(?:\s+est[aá]ndar\s+industrial)?)\b/gi, 'Solvente thinner estándar industrial'],
  [/\bBaldosa guad\s*(\d+x\d+)\b/gi, 'Baldosa laminada de guadua prensada $1 cm'],
  [/\bLija P\/\s*metal\b/gi, 'Pliego de lija esmeril para metal granos'],
  [/^Andamios\s+20\s*u$/gi, 'Sección de andamio tubular metálico certificado (20 usos)'],
  [/\bEquipo topograf\b/gi, 'Comisión de equipo topográfico (estación total + nivel)'],
  [/\bRana compactad\b/gi, 'Compactador vibratorio tipo rana a gasolina'],
  [/\bBloqueadora vivr\b/gi, 'Máquina bloqueadora vibrocompactadora'],
  [/\bCompres y soplete\b/gi, 'Compresor de aire con pistola/soplete de pintura'],
  [/\bPulid Granit agua\b/gi, 'Máquina pulidora de terrazo y granito en húmedo'],
  [/\bPulidor disc diam\b/gi, 'Pulidora manual industrial con disco diamantado'],
  [/\bDesvastadora para madera\b/gi, 'Máquina devastadora y lijadora de banda para madera'],
  [/\bVibrador\b$/gi, 'Vibrador de concreto a gasolina / eléctrico'],
  [/\bMezcladora\b$/gi, 'Mezcladora de concreto tipo trompo 1 bulto'],
  [/\bTransporte \(Ton\)\b/gi, 'Transporte local de materiales y agregados por tonelada'],
  [/\(sin pantalla\)hasta/gi, '(sin pantalla) hasta'],
];

/**
 * Clasificador estricto de Categoría de Almacén (evalúa el nombre técnico `N` primero, sin contaminarse
 * por la hoja/categoría cruda `catOrigen`, y usa bordes de palabra `\b`).
 *Nota: `norm()` convierte Ñ -> N y elimina tildes.
 */
export function clasificarCategoriaInsumo(catOrigen, nombreModerno, tipo = 'MATERIAL') {
  if (tipo === 'EQUIPO') return { categoria: 'EQUIPOS Y HERRAMIENTAS', disciplina: 'CIV' };
  if (tipo === 'TRANSPORTE') return { categoria: 'TRANSPORTE Y LOGÍSTICA', disciplina: 'MOV' };

  const C = norm(catOrigen);
  const N = norm(nombreModerno);

  // 1. QUÍMICOS (inmunizantes bórax/ácido bórico, aceites, solventes, aditivos concretos, epóxicos, sellantes, soldaduras líquidas)
  const excluirDeQuimicos = /ESTUCO|KORAZA|PEGACOR|SIKACERAM|SIKAWALL|SIKAESTUCO|SIKA JOINT|MULTI ?SEAL|CINTA SIKA|CORDON DE SOLDADURA|SOLDADURA EXOTERMICA|SOLDADURA E[67]0|SOLDADURA TIG|CONSUMIBLES SOLDADURA|ADHESIVO CERAMICO|ADHESIVO ESPECIAL PARA PORCELANATO|PEGA ENCHAPE|PEGANTE PARA CERAMICA|PEGANTE PARA PORCELANATO|PEGAMENTO GYPLAC|MASILLA.*(DRYWALL|JUNTA|GYPLAC|ESTUCOMASTIC)|SELLAPANEL|SELLAFLEX|PINTURA|IMPRIMANTE|WASH PRIMER|BARNIZ|\bLACA\b|ESMALTE|VINILO|ANTICORROSIV|TINTILLA|TAPAPOROS/.test(N);
  if (
    !excluirDeQuimicos && (
      /\bBORAX\b|ACIDO BORICO|PENTABORATO|ACIDO MURIATICO|ACIDO OXALICO|ACIDO DESINCRUSTANTE|ACEITE DE LINAZA|ACEITE QUEMADO|TREMENTINA|THINNER|DISOLVENTE|\bSOLVENTE\b|\bGLICOL\b|CATALIZADOR/.test(N) ||
      /DESMOLDANTE|CURADOR PARA CONCRETO|\bANTISOL\b|ANCLAJE QUIMICO|EPOXICO BI-?COMPONENTE|ADHESIVO EPOXICO|RESINA EPOXICA/.test(N) ||
      /\bSIKADUR\b|\bSIKA[- ]?1(?:\b|X\d)|\bSIKALATEX\b|\bSIKASET\b|\bSIKACRETE\b|\bSIKAFLOOR\b|\bSIKATOP\b|\bSIKAFILL\b|\bSIKA\s*FLEX\b|\bSIKASIL\b|\bSIKA BOOM\b|\bSIKA MASTIC\b|\bSIKA ROD\b|\bIGAS\b/.test(N) ||
      /HIDROFUGO|IMPERMEABILIZANTE ACRILICO|ADITIVO (ACELERANTE|PLASTIFICANTE|IMPERMEABILIZANTE)|EMULSION ASFALTICA|ASFALTO SOLIDO/.test(N) ||
      /\bSILICONA\b|POLIURETANO SELLANTE|SELLADOR (ELASTICO|ACRILICO|DE POLIURETANO|SANITARIO|DE JUNTAS)|ESPUMA DE POLIURETANO|ESPUMA EXPANSIVA/.test(N) ||
      /\bCOLBON\b|PEGANTE (?:PARA )?(AMARILLO|BOXER|DE CONTACTO|PLOMO|PVA|PVC|CPVC|TUBERIA PVC|LIQUIDO|BITUMINOS|XL)|BASE (BITUMINOSA|PVA) PEGANTE|ADHESIVO CONDUCTIVO|ADHESIVO ACRILICO PARA PISO|ADHESIVO PARA PISO PVC/.test(N) ||
      /SOLDADURA LIQUIDA|SOLDADURA PVC|SOLDADURA CPVC|LIMPIADOR.*PVC|FUERZA ALTA SOLDADURA|TRABARROSCAS|LUBRICANTE SILICON|CERA PLASTICA EMULSIONADA|\bCARBURO\b|AEROSOL PRUEBA DETECTOR/.test(N)
    )
  ) {
    return { categoria: 'QUÍMICOS', disciplina: 'CIV' };
  }

  // 2. FERRETERÍA (abrasivos/lijas, tuercas, arandelas, varillas roscadas, tornillería, fijaciones, herrajes, consumibles manuales)
  const excluirDeFerreteria = /CONTRATUERCA (CONDUIT|EMT|IMC)|VARILLA COBRE|COPPERWELD|PRENSA ESTOPA|SOPORTES?.*TUBERIA|TAPA SANITARIA|TRAMPA DE GRASA|ACCESORIOS HIDRAULICOS|^(PUERTA|VENTANA|MUEBLE|CLOSET|GABINETE|DIVISION)\b/.test(N);
  if (
    !excluirDeFerreteria && (
      /\bLIJA\b|PLIEGO DE LIJA|BLOQUE ABRASIVO|TROMPO ABRASIVO|PIEDRA ABRASIVA|INSUMOS DE PULIDO|DISCO (DE CORTE|DIAMANTADO|ABRASIVO|PULIR)|SEGUETA|\bBROCA\b/.test(N) ||
      /\bTUERCA\b|\bTUERCAS\b|\bARANDELA\b|\bARANDELAS\b|VARILLA ROSCADA|PERNO|CHAZO|TORNILLO|SET FIJACION|FIJACIONES|CLAVO|PUNTILLA|GRAPA PARA CERCA|REMACHE|CARGA VERDE|FULMINANTE/.test(N) ||
      /ALAMBRE (NEGRO|DE AMARRE|GALVANIZADO|DE PUAS)|GUAYA DE ACERO|AMARRA PLASTICA|AMARRAS|GANCHOS? (PARA )?TEJA/.test(N) ||
      /\bBISAGRA\b|\bCERRADURA\b|\bCHAPA\b|\bMANIJA\b|\bPASADOR\b|\bPICAPORTE\b|CORREDERA TELESCOPICA|CIERRAPUERTA|BRAZO HIDRAULICO|TOPE PARA PUERTA/.test(N) ||
      /\bBROCHA\b|\bRODILLO\b|BANDEJA PARA PINTURA|\bESPATULA\b|\bLLANA\b|BALDE PLASTICO|\bESCOBA\b|\bESTOPA\b|TRAPO INDUSTRIAL/.test(N) ||
      /CINTA (DE )?ENMASCARAR|^ENMASCARAR\b|CINTA DOBLE FAZ|CINTA DE PELIGRO|CINTA ANTIDESLIZANTE|CINTA METRICA|CINTA TEFLON|\bTEFLON\b/.test(N) ||
      /PLASTICO DE PROTECCION|PLASTICO NEGRO|POLIETILENO|POLISOMBRA|CARTON CORRUGADO|PAPEL PERIODICO|COSTAL|LONA DE EMPAQUE|MALLA CON VENA|MALLA GALLINERO|MALLA ESLABONADA|MALLA ZARANDA|VALLA INFORMATIVA/.test(N)
    )
  ) {
    return { categoria: 'FERRETERÍA', disciplina: 'CIV' };
  }

  // 3. GUADUA (exclusivamente guadua, esterilla, latilla y baldosa de guadua; sin bioconstrucción)
  if (/\bGUADUA\b|\bESTERILLA\b|LATILLA DE GUADUA/.test(N)) {
    return { categoria: 'GUADUA', disciplina: 'GUA' };
  }

  // 4. GASES MEDICINALES
  if (/GASES MEDICINAL|OXIGENO MEDICINAL|VACIO MEDICINAL|AIRE MEDICINAL|NFPA 99|TOMA DISS|TOMA QC|CHEMETRON|CAJA DE CORTE.*GASES|ALARMA.*GASES|EVACUACION DE GASES|RACORES.*GASES/.test(N) || (/COBRE TIPO [KL]/.test(N) && !/RUBATEX|REFRIGERACION|VRF|VRV/.test(N))) {
    return { categoria: 'GASES MEDICINALES', disciplina: 'GM' };
  }

  // 5. GAS DOMICILIARIO (independizado de hidrosanitarios)
  if (/CALENTADOR.*A\s+GAS|KIT DE INSTALACION A GAS|DUCTO EVACUACION|^PE-AL-PE\b|TUBERIA PE-AL-PE|REGULADOR.*GAS|MEDIDOR DE GAS|VALVULA.*PARA GAS|TUBERIA.*PARA GAS/.test(N)) {
    return { categoria: 'GAS DOMICILIARIO', disciplina: 'GAS' };
  }

  // 6. DETECCIÓN DE INCENDIO
  if (/DETECTOR DE HUMO|DETECTOR INTELIGENTE|DETECTOR TERMICO|HUMO FOTOELECTRICO|ESTACION MANUAL|SIRENA.*ESTROBO|ESTROBOSCOPICA|ANUNCIADOR REMOTO|MODULO MONITOR|MODULO DE CONTROL|MODULO AISLADOR|PANEL.*INCENDIO|\bFPLR\b|CABLE DE INCENDIO|CABLE FLP|SINTOX|SALIDA DETECTOR|SALIDA ESTACION MANUAL|SALIDA MODULO|SALIDA PANEL EMT|SALIDA SIRENA|PRUEBAS DISPOSITIVOS.*CAPACITACION|BATERIA.*12\s*V\s*7/.test(N)) {
    return { categoria: 'DETECCIÓN DE INCENDIO', disciplina: 'DET' };
  }

  // 7. RED CONTRA INCENDIO (EXTINCIÓN)
  if (/\bRCI\b|CONTRA INCENDIO|CONTRA INCENDIOS|ROCIADOR|SPRINKLER|SIAMESA|EXTINTOR|GABINETE TIPO [123]|GABINETE CLASE|ESTACION DE CONTROL|ESTACION DE PRUEBA Y DRENAJE|UL\/FM|TUBERIA AC SCH|SCH 10|SCH 40.*RANURAD|RANURAD|TEE MECANICA|CODO ROSCADO|TEE ROSCADA|REDUCCION ROSCADA|SOPORTE SISMO RESISTENTE|SOPORTE TIPO PERA|VALVULA REGULADORA DE PRESION (2 1\/2|4)|TABLERO DE MEDIDA INDIRECTA/.test(N)) {
    return { categoria: 'RED CONTRA INCENDIO', disciplina: 'RCI' };
  }

  // 8. CLIMATIZACIÓN Y HVAC
  if (/\bVRF\b|\bVRV\b|CLIMATIZACION|AIRE ACONDICIONADO|REFRIGERACION|REFRIGERANTE|RUBATEX|EVAPORADORA|CONDENSADORA|FAN ?COIL|UNIDAD MANEJADORA|MANEJADORA DE AIRE|UNIDAD DE EXTRACCION|UNIDAD DE VENTILACION(?!.*(GABINETE|RACK))|PORTAFILTROS|DUCTO FLEXIBLE|CONDUCTOS EN LAMINA|DIFUSOR DE (FLUJO|SUMINISTRO)|DIFUSOR LINEAL|ESQUINEROS PARA DIFUSOR|REJILLA DE (EXTRACCION|RETORNO|SUMINISTRO)|\bL-AV\b|REFNET|EEV KIT|AHUKIT|TERMOSTATO|CONTROLADOR REMOTO|CONTROL CENTRALIZADO|TARJETA DE (CONTROL|COMUNICACION)|TAA\s*-?\s*01|SOPORTES ANTIVIBRATORIOS|DESAGUE.*AISLAMIENTO TERMICO|SENSORES EQUIPOS VENTILADORES|CABLE.*UNIDADES INTERNAS|CABLE BLINDADO.*3X22|CABLE DE CONTROL.*EQUIPOS|PROGRAMACION DE PLATAFORMA/.test(N)) {
    return { categoria: 'CLIMATIZACIÓN Y HVAC', disciplina: 'AA' };
  }

  // 9. VOZ Y DATOS
  if (/VOZ Y DATOS|CABLEADO ESTRUCTURADO|\bUTP\b|CAT ?6|CATEGORIA 6|FIBRA OPTICA|PATCH PANEL|PATCH CORD|\bJACK\b|RJ-?45|FACE ?PLATE|PLACA DE PARED.*\bPUERTOS?\b|\bRACK\b|GABINETE DE PISO CERRADO|GABINETE DE PARED.*UR|ORGANIZADOR.*CABLE|BANDEJA.*(RACK|DISTRIBUCION)|BANDEJA PORTACABLE|CANALETA METALICA CON DIVISION|\bSWITCH\b|ACCESS POINT|CAMARA IP|GRABADOR DE VIDEO|\bNVR\b|DISCO DURO SATA|\bSFP\+?|\bDAC\b|REGLETA MULTITOMA|\bPDU\b|UNIDAD DE VENTILACION.*(GABINETE|RACK)/.test(N)) {
    return { categoria: 'VOZ Y DATOS', disciplina: 'VYD' };
  }

  // 10. ILUMINACIÓN LED (excluyendo lámpara sumergible de piscina si aplica; lámparas arquitectónicas van aquí)
  if (/ILUMINACION|LUMINARIA|PANEL LED|MARCO PARA (PANEL|LUMINARIA)|BALA LED|REFLECTOR|\bLAMPARA\b(?!.*SUMERGIBLE)|BOMBILLO|\bAPLIQUE\b|CINTA LED|FOTOCELDA|SENSOR DE MOVIMIENTO|SENAL LUMINOSA|AVISO DE SALIDA|PLAFON/.test(N)) {
    return { categoria: 'ILUMINACIÓN LED', disciplina: 'ELE' };
  }

  // 11. ELÉCTRICOS Y RETIE
  if (
    /CONDUIT|\bEMT\b|\bIMC\b|DUCTO TELEF|\bTHHN\b|\bTHWN\b|\bAWG\b|CABLE COBRE|CABLE DE COBRE|CABLE ENCAUCHETADO|CABLEADO ENTRE UPS|CONDUCTOR (DE COBRE|MONOPOLAR|EN ALUMINIO)|ALIMENTADOR|ALAMBRE COBRE|COBRE DESNUDO/.test(N) ||
    /\bBREAKER\b|TERMOMAGNETICO|INTERRUPTOR|TOTALIZADOR|TOMACORRIENTE|\bTOMA (DOBLE|SENCILL|TRIFASIC|ESPECIAL|ELECTRIC|POLO A TIERRA|INDUSTRIAL|NARANJA|REGULADA|HOSPITAL)|MEDIDOR (DE ENERGIA|TRIFASICO|MONOFASICO|BIFASICO)|CONTADOR ELECTRONICO|TRANSFORMADOR|\bUPS\b|BANCO DE BATERIAS|NETCARD|\bEXM\b|BARRAJE|\bBORNA\b|BORNERA|\bDPS\b/.test(N) ||
    /PUESTA A TIERRA|COPPERWELD|VARILLA COBRE|SOLDADURA EXOTERMICA|TRATAMIENTO PARA MEJORAR LA TIERRA|PUNTA CAPTADORA|ALAMBRON|GRAPA UNIVERSAL|SOPORTE ANILLO|CAPACETE|CORAZA METALICA|CINTA AISLANTE|PRENSA ESTOPA|RIEL CHANNEL|ABRAZADERA.*(EMT|IMC|CONDUIT|UNISTRUT|CHAPA)|CONTRATUERCA (CONDUIT|EMT|IMC)|SUPLEMENTO.*CAJA|TAPA (CIEGA|METALICA|GALVANIZADA)|TIMBRE|ZUMBADOR|BOTON TIMBRE|MATRICULA ELECTRICA|CERTIFICACION RETIE/.test(N) ||
    /CAJA (METALICA|GALVANIZADA|OCTOGONAL|RAWELT|DE PASO|ELECTRICA|CONTADOR|POLIMERICA|TOTALIZADOR|PARA MEDIDOR|CUADRADA|RECTANGULAR|INSPECCION.*TIERRA)|GABINETE AUTOSOPORTADO/.test(N) ||
    /CURVA.*(EMT|IMC|CONDUIT)|TERMINAL (EMT|IMC|CONDUIT)|UNION (EMT|IMC|CONDUIT)|CONECTOR (EMT|IMC|CURVO|RECTO|RESORTE|AUTODESFORRE|TIERRA)/.test(N) ||
    (/\bTABLERO\b/.test(N) && !/FORMALETA|PINO|MELAMIN|MADERA|AGLOMERADO|TRIPLEX|SUPERBOARD|YESO|\bRH\b|GUADUA/.test(N))
  ) {
    return { categoria: 'ELÉCTRICOS Y RETIE', disciplina: 'ELE' };
  }

  // 12. MADERAS Y ASERRADERO (eucalipto, madera rolliza, vigas/listones/tablas/varengas, formaleta en madera)
  if (
    !/PUERTA|MUEBLE|CLOSET|GABINETE|COCINA|VENTANA/.test(N) &&
    (/EUCALIPTO|MADERA ROLLIZA|MADERA PARA FORMALETA|TABLERO FORMALETA|LAMINA SUPER T FORMALETA|TABLA (BURRA|COMUN|ORDINARIA|CHAPA|DE MADERA)|TABLON DE MADERA|LISTON|VARENGA|CUARTON|VIGA DE MADERA|COLUMNA DE MADERA|CERCHA DE MADERA|BARREDERA EN MADERA|GUARDAESCOBA EN MADERA|MADERA (ASERRADA|INMUNIZADA|ORDINARIA|COMUN)|ACHAPO|SAJO|CHANUL|ABARCO|ORDINARIO/.test(N))
  ) {
    return { categoria: 'MADERAS Y ASERRADERO', disciplina: 'MAD' };
  }

  // 13. CARPINTERÍA EN MADERA
  if (
    !/^MESON.*ACERO INOX/.test(N) &&
    /PUERTA.*(MADERA|ENTAMBORADA|MELAMIN|MDF|TAMBORADA|MACIZA|CONTRAENCHAPADA)|MARCO EN MADERA|JAMBAS|CARTERAS|MUEBLE|CLOSET|GABINETE (DE COCINA|SERVICIO|SUPERIOR|INFERIOR|FLOTANTE|MADERA|MELAMIN)|COCINA INTEGRAL|REPISA.*(MADERA|MELAMIN)|ZOCALO EN MELAMINA|MELAMINA|\bMDF\b|TABLEX|TRIPLEX|TABLERO AGLOMERADO|TABLERO MELAMINICO|CINTA DE CANTO|FORMICA/.test(N)
  ) {
    return { categoria: 'CARPINTERÍA EN MADERA', disciplina: 'CMA' };
  }

  // 14. CARPINTERÍA EN ALUMINIO Y VIDRIO
  if (
    /\b(VENTANA|VENTANERIA|PUERTA|PUERTA-VENTANA|DIVISION.*BANO|FACHADA|CELOSIA|CORTASOL)\b.*(ALUMINIO|VIDRIO|SISTEMA|CORREDIZA|PROYECTANTE)/.test(N) ||
    /\bPUERTA\b.*VIDRIO TEMPLADO|DIVISION.*VIDRIO TEMPLADO|VIDRIO (PLANO|TEMPLADO|LAMINADO|PLOMADO|ESMERILADO|CRUDO|BRONCE|OPALIZADO|DE SEGURIDAD|INCOLORO)|\bVIDRIO\b.*\bMM\b|\bESPEJO\b/.test(N) ||
    (/PERFIL.*ALUMINIO|ANGULO.*ALUMINIO|TUBO.*ALUMINIO/.test(N) && !/WIN|CIELO|DRYWALL|CORTINA DE DUCHA|LED|DIFUSOR/.test(N)) ||
    /ACCESORIOS.*VIDRIO TEMPLADO|FELPA.*VENTANA|RODAMIENTO.*VENTANA/.test(N)
  ) {
    return { categoria: 'CARPINTERÍA EN ALUMINIO Y VIDRIO', disciplina: 'CAL' };
  }

  // 15. ACEROS DE REFUERZO
  if (/^ACERO \d|ACERO (CORRUGADO|FIGURADO|DE REFUERZO|LISO)|VARILLA DE ACERO|MALLA ELECTROSOLDADA|GRAFIL/.test(N)) {
    return { categoria: 'ACEROS DE REFUERZO', disciplina: 'CIV' };
  }

  // 16. ESTRUCTURA METÁLICA Y CERRAJERÍA
  if (
    /\bIPE\b|\bHEA\b|\bHEB\b|CORREA PHR|\bPHR\b|PERFIL CAJON|PERFIL C GALVANIZADO|PERFIL ESTRUCTURAL|PERFIL TUBULAR|PERFIL RECTANGULAR|PERFIL METALICO/.test(N) ||
    /TUBERIA CUADRADA.*ESTRUCTURAL|TUBO (CUADRADO|RECTANGULAR|REDONDO.*ACERO|REDONDO.*INOX|ESTRUCTURAL|GALVANIZADO.*CERRAMIENTO|METALICO)|PLATINA|PLACA BASE EN ACERO|ANTEPECHO|REJA|BARANDA.*(METALIC|ACERO|INOX)|PASAMANOS.*(METALIC|ACERO|INOX)|PUERTA METALICA|VENTANA.*LAMINA|MARCO.*ANGULO/.test(N) ||
    /LAMINA (COLD ROLLED|HOT ROLLED|METALICA CAL|GALVANIZADA CAL|ALFAJOR|COLABORANTE)|CORPALOSA|STEEL DECK|ELECTRODO|SOLDADURA E[67]0|SOLDADURA TIG|CONSUMIBLES SOLDADURA/.test(N) ||
    (/\bANGULO\b/.test(N) && !/PERIMETRAL|CIELO|0[., ]3[568]|0[., ]40|\bADL\b|\bPF\b|LIVIAN|DRYWALL|PVC|PLASTICO|ALUMINIO/.test(N))
  ) {
    return { categoria: 'ESTRUCTURA METÁLICA Y CERRAJERÍA', disciplina: 'MET' };
  }

  // 17. CUBIERTAS
  if (/\bTEJA\b|CUBIERTA TIPO SANDWICH|PANEL CUBIERTA|PANEL EXTERIOR.*WPC|\bWPC\b|CABALLETE|CUMBRERA|CLARABOYA|FLANCHE|FLASHING|MANTO ASFALTICO|MULTI ?SEAL|VIGA CANAL|CANAL (PLUVIAL|PVC|AMAZON\w*)|BAJANTE|CODO BAJANTE|UNION BAJANTE|SOPORTES? (BAJANTE|CANAL)|TAPA CANAL|UNION CANAL/.test(N)) {
    return { categoria: 'CUBIERTAS', disciplina: 'MAM' };
  }

  // 18. DRYWALL Y SISTEMAS LIVIANOS
  if (
    /DRYWALL|SUPERBOARD|GYPLAC|GYPSUM|PLACABOARD|DENSGLASS|PLACA DE YESO|PANEL DE YESO|PLACA FIBRO|CIELO ?RASO|CIELO PVC|DUELA MACHIHEMBRADA|MARCO CIELO RASO|ESCOTILLA DE INSPECCION|FRESCASA|FIBRA DE VIDRIO|LANA MINERAL|LAMINA DE PLOMO/.test(N) ||
    /\bPARAL\b|CANAL (60|90|3 5\/8|MURO|LIVIAN)|\bOMEGA\b|VIGUETA.*(CIELO|DRYWALL|ALUMINIO|GALVANIZADA)|ANGULO.*(PERIMETRAL|CIELO|0[., ]3[568]|0[., ]40|\bADL\b|\bPF\b|LIVIAN)|PERFIL DE UNION.*PVC|PERFIL (CORNISA|UNION|PRINCIPAL|SECUNDARIO|\bJ\b)|PERFILERIA METALICA PARA SUPERBOARD/.test(N) ||
    /CINTA (DE )?PAPEL|CINTA MALLA|CINTA FILO|SIKA JOINT|MASILLA.*(DRYWALL|JUNTA|GYPLAC)|SELLAPANEL|PEGAMENTO GYPLAC|ESQUINERO|DILATACION PLAST|ESTRIA PLAST|MEDIA CANA.*(PVC|MICROPERFORADA|LIVIANA)/.test(N)
  ) {
    return { categoria: 'DRYWALL Y SISTEMAS LIVIANOS', disciplina: 'DRY' };
  }

  // 19. APARATOS SANITARIOS Y GRIFERÍAS
  const esTuberiaSanitaria = /\b(TUBO|TUBERIA|CODO|TEE|YEE|SIFON|UNION|REDUCCION|ADAPTADOR|BUJE|TAPON|PUNTO|COLECTOR|RED|CAJA|TAPA|REJILLA DE PISO|VALVULA CHECK|VALVULA ANTIRREFLUJO)\b/.test(N);
  if (
    (!esTuberiaSanitaria && /\b(SANITARIO|INODORO)\b/.test(N)) ||
    /LAVAMANOS|BRAZOS.*LAVAMANOS|ORINAL|DUCHA|GRIFERIA|MEZCLADOR|MONOCONTROL|LAVAPLATOS|LAVATRAPERO|LAVADERO|POCETA|MESON.*ACERO INOX|INCRUSTACION|ACCESORIOS PARA BANO|BARRA DE APOYO|DISPENSADOR DE (JABON|PAPEL|TOALLA)|SECADOR DE MANOS|GABINETE DE BANO/.test(N)
  ) {
    return { categoria: 'APARATOS SANITARIOS Y GRIFERÍAS', disciplina: 'HID' };
  }

  // 20. HIDROSANITARIOS Y PETAR
  if (
    !/ENCHAPE VITROCERAMICO|MOSAICO VENECIANO/.test(N) && (
      /TUBERIA|TUBO (PVC|CPVC|SANITARIO|CONCRETO|GRES|HG|GALVANIZADO)|CODO|TEE |YEE|SIFON|UNION (PVC|CPVC|DRESSER|UNIVERSAL|PRESION|SANITARI)|REDUCCION|ADAPTADOR|BUJE|TAPON|NIPLE|ACCESORIOS HIDRAULICOS/.test(N) ||
      /REJILLA (DE PISO|TRAGANTE|SOSCO|X \d|PLASTICA|VENTILACION)|VALVULA|CHEQUE|\bREGISTRO\b|LLAVE DE (PASO|JARDIN|CHORRO)|GRIFO|HIDRANTE|PUNTO HIDRAULICO|ACOMETIDA HIDRAULICA|MEDIDOR DE AGUA|CALENTADOR.*(220\s*V|ELECTRICO)/.test(N) ||
      /BOMBA|HIDRONEUMATICO|SUCCION|TANQUE|SISTEMA SEPTICO|\bPTAR\b|\bPETAR\b|\bFAFA\b|BIODIGESTOR|MEDIO FILTRANTE|ROSETAS PLASTICAS|TRAMPA DE GRASA|GEOTEXTIL|DRENAJE|ARO Y TAPA.*ALCANTARILLADO|CONO DE VENTILACION|TAPA (SANITARIA|DE INSPECCION|30X30|REGISTRO)|SOPORTES?.*TUBERIA|PISCINA|SKIMMER|DESNATADOR|FILTRO DE ARENA|LAMPARA.*SUMERGIBLE/.test(N)
    )
  ) {
    return { categoria: 'HIDROSANITARIOS Y PETAR', disciplina: 'HID' };
  }

  // 21. PINTURAS Y ESTUCOS
  if (!/\bPISO\b|VINILO PISOS|GUARDAESCOBA/.test(N) && /PINTURA|VINILO|ESMALTE|ANTICORROSIV|IMPRIMANTE|WASH PRIMER|KORAZA|CORAZA.*FACHADA|REVESTIMIENTO ACRILICO|GRAFIADO|GRANIPLAST|BARNIZ|\bLACA\b|TINTILLA|TAPAPOROS|ESTUCO|STUCCO|SIKAWALL|SIKAESTUCO|RELLENO LISTO|ESTUCOMASTIC|SELLAFLEX|YESO PARA ESTUCO|CAOLIN|MINERAL COLOR|COLOR MINERAL/.test(N)) {
    return { categoria: 'PINTURAS Y ESTUCOS', disciplina: 'PIN' };
  }

  // 22. PISOS, ENCHAPES Y PIEDRA
  if (!/PIEDRA RAJON|PIEDRA SELECCIONADA DE RIO|CIMIENTO/.test(N) && /MARMOL|MARMOLINA|GRANITO|PORCELANATO|CERAMIC|ENCHAPE|ESPACATTO|PIEDRA (BLANCA|BOGOTANA|CORALINA|MUNECA|NATURAL|LAJA|DE ENCHAPE)|BALDOSA|TABLETA|TABLON|ADOQUIN|GUARDAESCOBA|\bPISO\b|VINILO PISOS|MEDISTEP|TARALAY|HAUSYS|VITROCERAMICA|MOSAICO VENECIANO|CORDON DE SOLDADURA.*PVC|PERFIL (DE TRANSICION|DILATACION|REMATE)|DILATACION (EN )?(PVC|BRONCE|ALUMINIO|PLASTICO)|PEGACOR|SIKACERAM|ADHESIVO CERAMICO|ADHESIVO ESPECIAL PARA PORCELANATO|PEGA ENCHAPE|PEGANTE PARA (CERAMICA|PORCELANATO)|BINDA EXTRA|BOQUILLA|CONCOLOR|NIVELADORES|DISTANCIADORES|CRUCETAS/.test(N)) {
    return { categoria: 'PISOS, ENCHAPES Y PIEDRA', disciplina: 'PIS' };
  }

  // 23. MAMPOSTERÍA
  if (/LADRILLO|\bBLOQUE\b(?!.*(ABRASIVO|ADORA))|CALADOS? EN/.test(N)) {
    return { categoria: 'MAMPOSTERÍA', disciplina: 'MAM' };
  }

  // 24. OBRA GRIS Y AGREGADOS
  if (/CEMENTO|CONCRETO|MORTERO|\bARENA\b|\bGRAVA\b|GRAVILLA|TRITURADO|RECEBO|SUB-?BASE|BASE GRANULAR|PIEDRA RAJON|\bRAJON\b|PIEDRA SELECCIONADA DE RIO|BALASTO|CRUDO DE RIO|AGUA POTABLE|\bCAL APAGADA\b|\bCAL AGRICOLA\b|\bCAL\b|CANALETA PREINPAL|CASETON|ICOPOR.*LOSA|COLUMNA O VIGA EN CONCRETO|PREFABRICAD.*CONCRETO|BORDILLO|SARDINEL|LOSETA|CINTA.*(SIKA PVC|WATERSTOP|WATERBAR)|HIDROSELLO|TIERRA NEGRA|TIERRA VEGETAL|PRADO EN CAPOTE|GRAMA|EMPRADIZADO/.test(N)) {
    return { categoria: 'OBRA GRIS Y AGREGADOS', disciplina: 'CIV' };
  }

  // 25. Respaldo controlado por categoría de origen (para códigos comerciales puros de marcas MEP/VRF/Datos)
  if (/GASES MEDICINAL/.test(C)) return { categoria: 'GASES MEDICINALES', disciplina: 'GM' };
  if (/CLIMATIZACION|AIRE ACOND/.test(C)) return { categoria: 'CLIMATIZACIÓN Y HVAC', disciplina: 'AA' };
  if (/DETECCION/.test(C)) return { categoria: 'DETECCIÓN DE INCENDIO', disciplina: 'DET' };
  if (/EXTINCION|CONTRA INCENDIO|\bRCI\b/.test(C)) return { categoria: 'RED CONTRA INCENDIO', disciplina: 'RCI' };
  if (/VOZ Y DATOS|TELECOM|CABLEADO ESTRUCTURADO/.test(C)) return { categoria: 'VOZ Y DATOS', disciplina: 'VYD' };
  if (/ILUMINACION/.test(C)) return { categoria: 'ILUMINACIÓN LED', disciplina: 'ELE' };
  if (/ELECTRIC/.test(C)) return { categoria: 'ELÉCTRICOS Y RETIE', disciplina: 'ELE' };
  if (/HIDROSANIT|HIDRAUL|SANITARI|ALCANTARILL/.test(C)) return { categoria: 'HIDROSANITARIOS Y PETAR', disciplina: 'HID' };
  if (/DRYWALL|LIVIAN/.test(C)) return { categoria: 'DRYWALL Y SISTEMAS LIVIANOS', disciplina: 'DRY' };
  if (/PISOS|ENCHAP|MARMOL/.test(C)) return { categoria: 'PISOS, ENCHAPES Y PIEDRA', disciplina: 'PIS' };
  if (/PINTURA|ESTUCO/.test(C)) return { categoria: 'PINTURAS Y ESTUCOS', disciplina: 'PIN' };
  if (/CUBIERTA/.test(C)) return { categoria: 'CUBIERTAS', disciplina: 'MAM' };
  if (/ALUMINIO|VIDRIO/.test(C)) return { categoria: 'CARPINTERÍA EN ALUMINIO Y VIDRIO', disciplina: 'CAL' };
  if (/CARPINTERIA/.test(C)) return { categoria: 'CARPINTERÍA EN MADERA', disciplina: 'CMA' };
  if (/MADERA/.test(C)) return { categoria: 'MADERAS Y ASERRADERO', disciplina: 'MAD' };
  if (/METALIC|CERRAJ/.test(C)) return { categoria: 'ESTRUCTURA METÁLICA Y CERRAJERÍA', disciplina: 'MET' };

  return { categoria: 'FERRETERÍA', disciplina: 'CIV' };
}

export function modernizarInsumo(descRaw, catOrigen = '', unidadRaw = 'UND', tipoRaw = 'MATERIAL') {
  let clean = fixMojibake(descRaw);
  const N0 = norm(clean);

  // Filtrar subencabezados vacíos o fórmulas auxiliares de APEU (ej. "Andamios = Rend * M")
  if (!N0 || N0 === 'NACIONALES' || N0 === 'IMPORTADOS' || /^ANDAMIOS\s+REND\b/.test(N0)) {
    return null;
  }

  // Reclasificar Transporte (Ton) y Andamios 20u de APEU a su tipo real
  let tipo = tipoRaw;
  if (/^TRANSPORTE\b/.test(N0) && tipo !== 'TRANSPORTE') tipo = 'TRANSPORTE';
  if (/^ANDAMIOS\s+20\s*U\b/.test(N0) && tipo === 'MATERIAL') tipo = 'EQUIPO';

  // Chequear sinónimos canónicos primero
  for (const can of INSUMOS_CANONICOS) {
    if (can.test(N0)) {
      return {
        claveCanonica: can.clave,
        nombre: can.nombre,
        unidad: can.unidad,
        tipo: can.clave.startsWith('TRN_') ? 'TRANSPORTE' : tipo,
        categoria: can.categoria,
        disciplina: can.disciplina,
        esIndiceMil: !!can.esIndiceMil,
      };
    }
  }

  // Mármoles y granitos de una sola palabra en APEU
  const C0 = norm(catOrigen);
  if (C0.includes('MARMOLES NACIONALES') && MARMOLES_NACIONALES_SOLOS.has(N0)) {
    clean = `Mármol nacional ${sentenceCaseTecnico(clean)} en placa`;
  } else if (C0.includes('MARMOLES IMPORTADOS') && MARMOLES_IMPORTADOS_SOLOS.has(N0)) {
    clean = `Mármol importado ${sentenceCaseTecnico(clean.replace(/Trav\.\s*/i, 'Travertino '))} en placa`;
  } else if (C0.includes('MARMOLES IMPORTADOS') && GRANITOS_IMPORTADOS_SOLOS.has(N0)) {
    clean = `Granito natural importado ${sentenceCaseTecnico(clean.replace(/San Fco\.?/i, 'San Francisco'))} en placa`;
  } else {
    for (const [re, rep] of REEMPLAZOS_INSUMO) {
      clean = clean.replace(re, rep);
    }
  }

  let nombre = sentenceCaseTecnico(clean)
    .replace(/\s+/g, ' ')
    .replace(/Ø\s*Ø/g, 'Ø')
    .trim();

  let unidad = normalizarUnidad(unidadRaw, nombre);
  let factorPrecio = 1;
  if (unidad === 'CUARTO_GAL') {
    unidad = 'GAL';
    factorPrecio = 4; // 1 Galón = 4 cuartos de galón
  }

  const { categoria, disciplina } = clasificarCategoriaInsumo(catOrigen, nombre, tipo);
  const claveCanonica = `${tipo}|${norm(nombre)}|${unidad}`;

  return {
    claveCanonica,
    nombre,
    unidad,
    tipo,
    categoria,
    disciplina,
    factorPrecio,
    esIndiceMil: false,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. MODERNIZACIÓN DE NOMBRES DE BÁSICOS Y UNITARIOS (APUs)
// ═══════════════════════════════════════════════════════════════════════════

const REEMPLAZOS_APU = [
  // Normalización y deduplicación de estructuras en guadua y madera rolliza (APEU + Ricaurte)
  [/^COLUMNA\s+EN\s+ROLLIZA\s+(?:D\s*=\s*|Ø\s*)(\d+)\s*CM.*$/gi, 'Columna en madera rolliza de eucalipto Ø $1 cm sin anclaje (L tipo 3.40 m)'],
  [/^COLUMNA\s+EN\s+GUADUA\s+(?:D\s*=\s*|Ø\s*)(\d+)\s*CM.*$/gi, 'Columna en guadua Ø $1 cm con anclaje (L tipo 3.40 m)'],
  [/^CORREA\s+EN\s+GUADUA\s+(?:D\s*=\s*|Ø\s*)(\d+)\s*CM.*$/gi, 'Correa en guadua Ø $1 cm con herrajes (L tipo 2.00 m)'],
  [/^DIAGONAL\s+EN\s+GUADUA\s+(?:D\s*=\s*|Ø\s*)(\d+)\s*CM.*$/gi, 'Diagonal en guadua Ø $1 cm con herrajes (L tipo 3.00 m)'],
  [/^VIGA\s+EN\s+GUADUA\s+(?:D\s*=\s*|Ø\s*)(\d+)\s*CM.*$/gi, 'Viga en guadua Ø $1 cm con herrajes (L tipo 3.00 m)'],

  // Errores tipográficos y estandarizaciones puntuales
  [/\bESTUCO\s+INERIOR\b/gi, 'Estuco plástico interior sobre muro o cielo'],
  [/\bPinturas\s+Deralladas\b/gi, 'Pinturas detalladas'],
  [/\bCONCRETO PREMEZCLADO 35000 PSI\b/gi, 'Concreto premezclado 3500 psi'],
  [/^IPE\s+(\d+)$/gi, 'Viga / perfil estructural en acero laminado IPE $1'],
  [/^Vigas\s+IPE\s+(\d+)$/gi, 'Viga estructural en acero laminado IPE $1'],
  [/^TERRACEO$/gi, 'Conformación de terrazas y explanación manual en talud'],
  [/^CORTES\s+VIAS$/gi, 'Corte y excavación mecánica de banca para vías'],
  [/^RELLENO\s+VIAS$/gi, 'Terraplén y relleno compactado para estructura vial'],
  [/^SEPARADOR$/gi, 'Separador vial con bordillo en concreto y zona verde'],
  [/^GABINETE\s+BA[ÑN]O$/gi, 'Gabinete de baño con espejo para incrustar o sobreponer'],
  [/^PISO\s+VINILO$/gi, 'Piso arquitectónico en vinilo flexible instalado con adhesivo'],

  // Preliminares, tierras y vías APEU
  [/^CONTR\s+TOPOG$/gi, 'Control y replanteo topográfico lineal con comisión'],
  [/^DESCAPOTE\s+A\s+MAQUINA$/gi, 'Descapote y limpieza mecánica de terreno'],
  [/^DESCAPOTE\s+A\s+MANO$/gi, 'Descapote y limpieza manual de terreno'],
  [/^MEJORAMIENT\s+PARA\s+CIMIENT$/gi, 'Mejoramiento de subrasante en recebo compactado para cimentación'],
  [/^CIMIEN\s+CICLOP$/gi, 'Cimiento en concreto ciclópeo (60% concreto 14 MPa + 40% piedra rajón)'],
  [/^CCTO\s+ZAPATAS$/gi, 'Zapatas aisladas o corridas en concreto 21 MPa (3000 psi)'],
  [/^SOBRECIM\s+LAD\s+E=(\d+)\s*CM$/gi, 'Sobrecimiento en ladrillo tolete recocido e=$1 cm impermeabilizado'],
  [/^SOBREC\s+BLOQ\s+MACIZ\s+E=(\d+)\s*CM$/gi, 'Sobrecimiento en bloque macizo de cemento e=$1 cm'],
  [/^EXC\s+MECANICA\s+chambas\s+Cargue\s+y\s+retiro$/gi, 'Excavación mecánica de zanjas (incluye cargue y retiro de sobrantes)'],
  [/^RELLENO\s+COMP\s+Material\s+del\s+sitio\s+90%\s*Proctor\s*M$/gi, 'Relleno compactado con material seleccionado del sitio al 90% Proctor Modificado'],
  [/^COMF,\s*COMPAC\s+SUBRASANTE\s+90%\s*Proctor\s*M$/gi, 'Conformación y compactación de subrasante al 90% Proctor Modificado'],
  [/^RETIRO\s+SOBRA\s+Cargue\s+retroexc$/gi, 'Cargue mecánico con retroexcavadora y retiro de material sobrante'],
  [/^RETIRO\s+SOBRA\s+A\s+mano$/gi, 'Cargue manual y retiro de material sobrante en volqueta'],
  [/^EMPRADIZ\s+direc$/gi, 'Empradizado directo en capote de grama (incluye tierra vegetal)'],
  [/^SARDINEL\s+vehic\s+12\s*-\s*18\s*x\s*50\s*cm$/gi, 'Sardinel vehicular en concreto sección 12-18x50 cm'],
  [/^SUB-?BASE$/gi, 'Subbase granular compactada norma INVIAS'],
  [/^BASE\s+granular$/gi, 'Base granular clase A compactada norma INVIAS'],
  [/^AC\s+5\/8"\s+transfer$/gi, 'Acero liso de transferencia (dovelas) Ø 5/8" para pavimento rígido'],
  [/^PAVIM\s+CCTO\s+E=(\d+)\s*cm$/gi, 'Pavimento rígido en concreto hidráulico e=$1 cm'],
  [/^PAV\s+CONCRETO\s+(\d+)\s*CM\s*\(([^)]+)\)\s*Csuelo=\s*4Kg\/cm2$/gi, 'Pavimento rígido en concreto MR e=$1 cm ($2)'],

  // Estructuras en concreto y madera APEU
  [/^CCTO\s+VIGA\s+CIM\s+(\d+[xX]\d+)\s*CM$/gi, 'Viga de cimentación en concreto 21 MPa sección $1 cm'],
  [/^VIGUETA\s+CIMEN\s+(\d+[xX]\d+)\s*CM$/gi, 'Vigueta de amarre en cimentación concreto 21 MPa sección $1 cm'],
  [/^CCTO\s+COLUMNA\s+(\d+[xX]\d+)\s*CM$/gi, 'Columna estructural en concreto 21 MPa sección $1 cm'],
  [/^COLUMNETA\s+(\d+[xX]\d+)\s*CM$/gi, 'Columneta de confinamiento en concreto 21 MPa sección $1 cm'],
  [/^CCTO\s+VIGA\s+AER\s+(\d+[xX]\d+)\s*CM$/gi, 'Viga aérea estructural en concreto 21 MPa sección $1 cm'],
  [/^VIGUETA\s+(\d+[xX]\d+)\s*CM$/gi, 'Vigueta aérea de confinamiento en concreto 21 MPa sección $1 cm'],
  [/^CCTO\s+V\s+CANAL\s+(\d+[xX]\d+)\s*CM$/gi, 'Viga canal en concreto impermeabilizado 21 MPa sección $1 cm'],
  [/^VIGA\s+DINTEL\s+(\d+[xX]\d+)\s*CM$/gi, 'Dintel en concreto reforzado sección $1 cm'],
  [/^ESTR\s+MADERA\s+(\d+[xX]\d+)\s*CM$/gi, 'Estructura de cubierta en madera aserrada achapo sección $1 cm'],
  [/^GRADAS\s+90\s*CM\s+HUELLA\s+27\s*CM$/gi, 'Peldaño de escalera en concreto ancho 0.90 m huella 27 cm'],
  [/^ALFAJIA\s+(\d+)\s*CM$/gi, 'Alfajía cortagotera en concreto reforzado ancho $1 cm'],
  [/^CCTO\s+LOSA\s+MACIZA\s+(\d+)\s*CM$/gi, 'Losa maciza de entrepiso en concreto 21 MPa e=$1 cm'],
  [/^LOSA\s+PRE\s*IN\s*PAL$/gi, 'Losa aligerada prefabricada sistema canaleta Preinpal'],
  [/^LOSA\s+PREFABR\s+7\s*CM$/gi, 'Plaqueta prefabricada en concreto reforzado e=7 cm'],
  [/^PISO\s+PRIMARIO\s+E=(\d+)\s*CM$/gi, 'Placa de contrapiso en concreto simple 17.5 MPa e=$1 cm'],

  // Muros y cubiertas APEU
  [/^MURO\s+SOGA\s+CUADRILONGO$/gi, 'Muro en ladrillo cuadrilongo en soga e=12 cm'],
  [/^MURO\s+SOGA\s+ADOBON$/gi, 'Muro en ladrillo adobón común en soga e=15 cm'],
  [/^MURO\s+TIZON\s+CUADRILONGO$/gi, 'Muro en ladrillo cuadrilongo en tizón e=20 cm'],
  [/^MURO\s+TIZON\s+ADOBON$/gi, 'Muro en ladrillo adobón común en tizón e=25 cm'],
  [/^MURO\s+PAPELILLO\s+CUADRILONGO$/gi, 'Muro divisorio en ladrillo cuadrilongo en pandereta (papelillo) e=7 cm'],
  [/^MURO\s+SOGA\s+BLOQUE\s+MACIZ$/gi, 'Muro en bloque macizo de cemento en soga'],
  [/^MURO\s+SOGA\s+BLOQUE\s+HUECO$/gi, 'Muro en bloque hueco de cemento N.° 4 en soga'],
  [/^TEJA\s+AC\s+No\s*(\d+)$/gi, 'Cubierta en teja ondulada de fibrocemento perfil 7 N.° $1'],
  [/^CABALLET\s+FIJO$/gi, 'Caballete fijo en fibrocemento para cubierta'],
  [/^CLARABOYA\s+(\d+)$/gi, 'Claraboya traslúcida en cubierta de fibrocemento N.° $1'],
  [/^T\s+VENTILA\s+No\s*(\d+)$/gi, 'Teja con ventilación en fibrocemento N.° $1'],
  [/^CANAL\s+PVC$/gi, 'Canal pluvial aérea en PVC tipo Amazonas (incluye soportes)'],
  [/^BAJANTE\s+PVC$/gi, 'Bajante de aguas lluvias en PVC (incluye accesorios de fijación)'],

  // Hidrosanitarias y alcantarillado APEU
  [/^DESAG\s+CEM\s+(\d+)"?\s+EN\s+TIERRA$/gi, 'Tubería subterránea de desagüe en concreto simple Ø $1"'],
  [/^CODO\s+CEM\s+(\d+)"?$/gi, 'Codo subterráneo en concreto simple Ø $1"'],
  [/^DESAG\s+GRESS\s+(\d+)"?\s+EN\s+TIERRA$/gi, 'Tubería subterránea de alcantarillado en gres vitrificado Ø $1"'],
  [/^CODO\s+GRESS\s+(\d+)"?$/gi, 'Codo de alcantarillado en gres vitrificado Ø $1"'],
  [/^DESAG\s+PVC\s+(\d+)"?\s+EN\s+TIERRA$/gi, 'Red sanitaria subterránea en tubería PVC sanitaria Ø $1"'],
  [/^DESAG\s+PVC\s+(\d+)"?\s+ENTREPISOS$/gi, 'Red sanitaria descolgada/entrepiso en tubería PVC sanitaria Ø $1"'],
  [/^AG\s+LLUV\s+PVC\s+(\d+)"?\s+EN\s+TIERRA$/gi, 'Colector subterráneo de aguas lluvias en tubería PVC Ø $1"'],
  [/^AG\s+LLUV\s+PVC\s+(\d+)"?\s+ENTREPISOS$/gi, 'Red de aguas lluvias en entrepiso tubería PVC Ø $1"'],
  [/^TEE\s+PVC\s+SAN\s+(\d+)"?$/gi, 'Tee sanitaria en PVC Ø $1" instalada'],
  [/^COD\s+PVC\s+SAN\s+(\d+)"?$/gi, 'Codo sanitario 90° en PVC Ø $1" instalado'],
  [/^SIFON\s+PVC\s+(\d+)"?$/gi, 'Sifón sanitario en PVC Ø $1" instalado'],
  [/^REJILL\s+ALUMI\s+(\d+)"?$/gi, 'Rejilla de piso en aluminio con sosco Ø $1"'],
  [/^VALV\s+POZUE\s+(\d+)"?$/gi, 'Válvula canastilla de desagüe para pozuelo Ø $1"'],
  [/^CAJ\s+INSP\s+(\d+[xX]\d+)\s+H=(\d+)\s*cm$/gi, 'Caja de inspección sanitaria en mampostería $1 cm h=$2 cm con tapa'],
  [/^ALCANTARILL\s+TUB\s+CEM\s+(\d+)"$/gi, 'Colector de alcantarillado en tubería de concreto Ø $1"'],
  [/^SUMIDERO\s+A\.LL$/gi, 'Sumidero lateral/calzada para captación de aguas lluvias'],
  [/^BASE\+CA[ÑN]UELA\s+CAM\.\s*INSPECC$/gi, 'Base y cañuela en concreto para cámara de inspección de alcantarillado'],
  [/^ANILLO\s+CAMAR\s+INSPECCION$/gi, 'Cilindro / anillo en concreto para cámara de inspección vial'],
  [/^TAPA\s*\+\s*BASES\s+CAM\s+INSPECC\s+(.+)$/gi, 'Cono reductor, aro y tapa HF para cámara de inspección ($1)'],
  [/^INSTALAC\s+HCA\s+PVC\s+PRES\s+([\d/"]+)$/gi, 'Red hidráulica en tubería PVC presión RDE 21 Ø $1'],
  [/^TEE\s+PRES\s+([\d/"]+)$/gi, 'Tee PVC presión Ø $1 instalada'],
  [/^CODO\s+PRES\s+([\d/"]+)$/gi, 'Codo 90° PVC presión Ø $1 instalado'],
  [/^ARM\s+([\d/"]+)$/gi, 'Adaptador macho PVC presión Ø $1 instalado'],
  [/^ARH\s+([\d/"]+)$/gi, 'Adaptador hembra con inserto PVC presión Ø $1 instalado'],
  [/^REGISTRO\s+([\d/"]+)$/gi, 'Registro de corte en bronce Ø $1 instalado'],
  [/^LLAVE\s+PD\s+([\d/"]+)$/gi, 'Llave de paso pesada directa Ø $1 instalada'],
  [/^LLAV\s+BOLA\s+([\d/"]+)$/gi, 'Válvula de bola en bronce Ø $1 instalada'],
  [/^CHEQUE\s+([\d/"]+)$/gi, 'Válvula cheque horizontal en bronce Ø $1 instalada'],
  [/^GRIFO\s+([\d/"]+)$/gi, 'Llave terminal / grifo cromado de jardín Ø $1'],
  [/^NIPLE\s+HG\s+([\d/"]+)$/gi, 'Niple en hierro galvanizado Ø $1 x 10 cm instalado'],
  [/^CODO\s+HG\s+([\d/"]+)$/gi, 'Codo 90° en hierro galvanizado Ø $1 instalado'],
  [/^PUNTO\s+HCO\s+PVC\s+([\d/"]+)\s+TERMINADO$/gi, 'Punto hidráulico agua fría en PVC presión Ø $1'],
  [/^PTO\s+HCO\s+CPVC\s+([\d/"]+)\s+TERMINADO$/gi, 'Punto hidráulico agua caliente en CPVC Ø $1'],
  [/^Punto\s+SANITARIO\s+PVC\s+([\d/"]+)\s+terminado$/gi, 'Punto sanitario de desagüe en PVC Ø $1'],

  // Eléctricas APEU
  [/^DUCTO\s+ELECTR\s+PVC\s+([\d/"]+)$/gi, 'Canalización eléctrica en tubería conduit PVC Ø $1'],
  [/^DUCTO\s+ELECTR\s+COND\s+MET\s+([\d/"]+)$/gi, 'Canalización eléctrica en tubería conduit metálica Ø $1'],
  [/^CAJILLA\s+GALVA\s+2X4"$/gi, 'Caja eléctrica metálica galvanizada rectangular 2x4"'],
  [/^CAJILLA\s+GALVA\s+OCTOGON\s+4X4"$/gi, 'Caja eléctrica metálica galvanizada octogonal 4x4"'],
  [/^CAJILLA\s+GALVA\s+TOMA\s+ESPEC$/gi, 'Caja eléctrica metálica galvanizada cuadrada 4x4" para toma especial'],
  [/^TOMACORREN\s+SENCILLO$/gi, 'Aparato tomacorriente sencillo 15A 125V instalado'],
  [/^TOMACORREN\s+DOBLE$/gi, 'Aparato tomacorriente doble con polo a tierra 15A 125V instalado'],
  [/^TOMACORREN\s+ESPECIAL\s+tripol$/gi, 'Aparato tomacorriente trifásico especial 50A 250V instalado'],
  [/^PLAFON\s+PORCE$/gi, 'Portalampara / plafón en porcelana E27 instalado'],
  [/^CAJ\s+CONTADOR$/gi, 'Caja metálica con visor para medidor de energía monofásico'],
  [/^TABL\s+CONTROL(\s+4\s+CIRCUITOS)?$/gi, 'Tablero de distribución eléctrica monofásico 4 circuitos con breakers'],
  [/^DUCTO\s+ACOME\s+METAL\s+([\d/"]+)\s*4\s*mt$/gi, 'Mástil / ducto de acometida eléctrica en tubo metálico Ø $1 (L=4.0 m)'],
  [/^CABLEADO\s+EN\s+ALUMINIO\s+cal\s*(\d+)$/gi, 'Acometida en conductor de aluminio aislado calibre $1 AWG'],
  [/^CABLEADO\s+EN\s+COBRE\s+cal\s*(\d+)$/gi, 'Cableado eléctrico en conductor de cobre THHN/THWN calibre $1 AWG'],
  [/^PTO\s+ELECTRICO\s+110\s*V\s+TERMINADO$/gi, 'Salida eléctrica general a 120V terminada'],
  [/^CAMP\s+TIMBRE\s+Luminex$/gi, 'Zumbador / campana para timbre residencial'],
  [/^BOTON\s+TIMBRE\s+Luminex$/gi, 'Pulsador para timbre residencial'],
  [/^SALIDA\s+ELECTR\s+E\s+INTERR\s+sencillo\s*Todo\s+costo\s+Long\s+prom\s+4\.50m$/gi, 'Salida de iluminación con interruptor sencillo en PVC (L prom. 4.5 m)'],
  [/^SALIDA\s+ELECTR\s+E\s+INTERR\s+doble\s+Todo\s+costo\s+Long\s+prom\s+4\.50m$/gi, 'Salida de iluminación con interruptor doble en PVC (L prom. 4.5 m)'],
  [/^SALIDA\s+ELECTR\s+E\s+INTERR\s+conmut\s+Todo\s+costo\s+Long\s+prom\s+4\.50m$/gi, 'Salida de iluminación con interruptor conmutable en PVC (L prom. 4.5 m)'],
  [/^SALIDA\s+ELECTR\s+Y\s+TOMAC\s+sencill\s+Todo\s+costo\s+Long\s+prom\s+4\.50m$/gi, 'Salida de tomacorriente sencillo 15A en PVC (L prom. 4.5 m)'],
  [/^SALIDA\s+ELECTR\s+Y\s+TOMAC\s+doble\s+Todo\s+costo\s+Long\s+prom\s+4\.50m$/gi, 'Salida de tomacorriente doble 15A polo a tierra en PVC (L prom. 4.5 m)'],
  [/^SALIDA\s+ELECTR\s+Y\s+TOMA\s+estufa\s+Todo\s+costo\s+Long\s+prom\s+4\.50m$/gi, 'Salida especial trifásica 220V para estufa (L prom. 4.5 m)'],
  [/^SALIDA\s+ELECTR\s+Y\s+PLAFON\s+porce\s+Todo\s+costo\s+Long\s+prom\s+4\.50m$/gi, 'Salida de iluminación con plafón de porcelana en PVC (L prom. 4.5 m)'],

  // Pisos, enchapes, mármoles y revoques APEU
  [/^PAV\s+BALDOSA$/gi, 'Piso en baldosa de cemento tradicional sobre mortero'],
  [/^GUARDAESCOB\s+BALDOSA$/gi, 'Guardaescoba en baldosa de cemento'],
  [/^GUARDAESCOB\s+MADERA$/gi, 'Guardaescoba en madera inmunizada h=8 cm'],
  [/^WING\s+ALUMINIO$/gi, 'Remate / dilatación de enchape tipo Win en aluminio'],
  [/^WING\s+PLASTICO$/gi, 'Remate / dilatación de enchape tipo Win en PVC'],
  [/^REV\s+CER\s+(\d+[xX]\d+)\s+pegacor\s+concolor$/gi, 'Enchape cerámico de muro $1 cm con adhesivo Pegacor y boquilla'],
  [/^REV\s+CER\s+(\d+[xX]\d+)\s+pega\s+tradicional$/gi, 'Enchape cerámico de muro $1 cm con mortero tradicional'],
  [/^PAV\s+CER\s+(\d+[xX]\d+)\s+pegacor\s+concolor$/gi, 'Piso en cerámica esmaltada $1 cm con adhesivo Pegacor y boquilla'],
  [/^PAV\s+CER\s+(\d+[xX]\d+)\s+pega\s+tradicional$/gi, 'Piso en cerámica esmaltada $1 cm con mortero tradicional'],
  [/^ENCH\s+CER\s+([\d.,]+\s*[xX]\s*[\d.,]+)\s+(Piso|Pared)$/gi, 'Enchape cerámico de $2 formato $1 cm'],
  [/^GUARD\s+CERAM\s+H=10\s*cm\s+(.+)$/gi, 'Guardaescoba en cerámica h=10 cm ($1)'],
  [/^GUARDAESCOB\s+GRAVILLA\s+LAV\s+Recta\s+H\s*=\s*10\s*cm$/gi, 'Guardaescoba recto en gravilla lavada h=10 cm'],
  [/^G\/ESC\s+con\s+cenef\s+GRAVILLA\s+LAV\s+M\/ca[ñn]a\s+10x10cm$/gi, 'Guardaescoba media caña con cenefa en gravilla lavada 10x10 cm'],
  [/^GUARDAESCOB\s+GRANITO\s+(pulido|lavado)\s+Recta\s+H\s*=\s*10\s*cm$/gi, 'Guardaescoba recto en granito $1 h=10 cm'],
  [/^G\/ESC\s+con\s+cenefa\s+GRANITO\s+(pulido|lavado)\s+M\/Ca[ñn]a\s+10x10cm$/gi, 'Guardaescoba media caña con cenefa en granito $1 10x10 cm'],
  [/^G\/ESCOBAS\s+0[.,]10\s*MT\s+(.+?)\.?$/gi, 'Guardaescoba en piedra natural ($1) h=10 cm'],
  [/^BALDOS\s+granito\s+(.+)$/gi, 'Piso en baldosa de granito prefabricada $1'],
  [/^PELDA[ÑN]O\s+grada\s+GRANIT\s+PULIDO$/gi, 'Enchape de peldaño en granito vaciado y pulido en sitio'],
  [/^MARMOL\s+travert\s+VILLA\s+DE\s+LEIVA$/gi, 'Piso / enchape en mármol nacional Travertino Villa de Leyva'],
  [/^MARMOL\s+(.+)$/gi, 'Piso / enchape en mármol natural $1'],
  [/^PLACA\s+GRANITO\s+(.+)$/gi, 'Piso / mesón en placa de granito natural $1'],
  [/^ESPACATTO\s+(.+?)\.?$/gi, 'Revestimiento mural en piedra tipo espacato $1'],
  [/^PIEDRA\s+(CORALINA|MU[ÑN]ECA|BLANCA|BOGOTANA)$/gi, 'Enchape arquitectónico en piedra natural $1'],
  [/^REMATES\s+REDOND\s+(.+)$/gi, 'Perfil remate media caña redondeado ($1)'],
  [/^REV\s+RUSTICO\s+EN\s+(MUROS|PISOS)$/gi, 'Pañete / revoque rústico en mortero 1:4 sobre $1'],
  [/^REV\s+REFINADO\s+EN\s+(MUROS|PISOS)$/gi, 'Pañete / revoque liso afinado en mortero 1:4 sobre $1'],
  [/^REV\s+AFINA\s+CAL\s+EN\s+MUROS$/gi, 'Pañete afinado con cal sobre muros interiores'],
  [/^FILOS\s+Y\s+REMAT$/gi, 'Filos y dilataciones en pañete de muros y columnas'],
  [/^PERLA\s+PLATACH$/gi, 'Acabado perlado platachado en fachada / cielo'],
  [/^PERLA\s+RUSTICA$/gi, 'Acabado perlado rústico en mortero sobre muro'],

  // Estuco, pintura y carpintería APEU
  [/^IMPRIM\s+VINILO\s+RODILLO\s+2\s+manos$/gi, 'Imprimación acrílica con rodillo sobre muros (2 manos)'],
  [/^IMPRIM\s+COLB\s+RODILLO\s+2\s+manos$/gi, 'Sellado imprimante PVA con rodillo sobre pañete (2 manos)'],
  [/^PINT\s+VINILO\s+EXT\s+(RODILLO|BROCHA)\s+2\s+manos$/gi, 'Pintura vinilo acrílico exterior aplicación con $1 (2 manos)'],
  [/^PINT\s+ESMALTE\s+VENTANAS\s+2\s*m$/gi, 'Pintura en esmalte sintético sobre ventanería metálica (2 manos)'],
  [/^PINT\s+ESMALTE\s+Rejas\s+antep\s+2\s*man$/gi, 'Pintura en esmalte sintético sobre rejas y antepechos (2 manos)'],
  [/^PINT\s+ESMALTE\s+PUERTAS\s+2\s*man$/gi, 'Pintura en esmalte sintético sobre puertas metálicas/madera (2 manos)'],
  [/^PINT\s+EN\s+LACA\s+SOPLETE\s+2\s*man$/gi, 'Acabado en laca catalizada aplicada con soplete (2 manos)'],
  [/^ESTUC\s+TRADIC$/gi, 'Estuco tradicional en yeso y caolín sobre pañete interior'],
  [/^ESTUC\s+PROFES$/gi, 'Estuco plástico acrílico profesional listo para pintura'],
  [/^ANTICORROSIVA\s+S\/\s*Lamina\s+(lineal|llena)$/gi, 'Aplicación de pintura anticorrosiva sobre lámina metálica ($1)'],
  [/^ESMALTE\s+S\/\s*(.+)$/gi, 'Pintura en esmalte sintético sobre $1'],
  [/^BARNIZ\s+S\/\s*(.+)$/gi, 'Aplicación de barniz transparente sobre $1'],
  [/^BARNIZ\s+PISOS\s+Madera$/gi, 'Barniz de poliuretano de alto tráfico sobre pisos de madera'],
  [/^TINTILLA\s+S\/\s*(.+)$/gi, 'Aplicación de tintilla inmunizante y decorativa sobre $1'],
  [/^VINILO\s+S\/(REPELLO|RUSTICO|ESTUCO)\s+2\s*MANOS$/gi, 'Pintura en vinilo acrílico sobre $1 (2 manos)'],
  [/^WASH\s+PRIMER\s+S\/\s*Metal$/gi, 'Imprimante adherente Wash Primer sobre superficie metálica galvanizada'],
  [/^LINEAS\s+TRAFICO\s+A\s*=0\.10\s*mt$/gi, 'Demarcación vial horizontal con pintura de tráfico ancho 10 cm'],
  [/^PTA\s+LAMINA\s+CAL\s*18\s+([\d.]+)\s*[xX]\s*([\d.]+)\s*mt$/gi, 'Puerta metálica en lámina Cold Rolled Cal. 18 de $1x$2 m'],
  [/^PTA\s+LAMINA\s+CAL\s*([\d.]+[xX][\d.]+),\s*2\s*hoj$/gi, 'Puerta metálica doble hoja en lámina Cal. 18 de $1 m'],
  [/^PTA\s+ENTAMBO\s+([\d.]+[xX][\d.]+)\s*MT$/gi, 'Puerta entamborada en madera con marco de $1 m'],
  [/^VENTANA\s+LAM\s+CAL\s*22\s+(sin|con)\s+antep$/gi, 'Ventana en lámina doblada Cal. 22 ($1 antepecho)'],
  [/^VIDRIOS\s+(\d+)\s*MM$/gi, 'Suministro e instalación de vidrio plano transparente e=$1 mm'],
  [/^MURO\s+TENDINOSO\s+MALLA\s+C\/\s*VENA\s*\(([^)]+)\)$/gi, 'Muro bahareque encementado con malla con vena ($1)'],
  [/^MURO\s+TENDINOSO\s+EN\s+ESTERILLA\s*\(([^)]+)\)$/gi, 'Muro bahareque encementado en esterilla de guadua ($1)'],
  [/^LACA\s+DE\s+POLIURETANO\s+DE\s+2\s+COMPONENTES\s+S\/\s*GUADUA\s+D=(\d+)\s*CM$/gi, 'Acabado en laca poliuretano 2 componentes sobre guadua Ø $1 cm'],
  [/^LINAZA\/TREMENTINA\s+GUADUA\s+D=(\d+)\s*CM$/gi, 'Protección natural aceite de linaza y trementina sobre guadua Ø $1 cm'],
  [/^ROLLIZA\s+EUCALIPTO\s+PRESERV\s+POR\s+INMERSION.*$/gi, 'Preservación por inmersión (24 h) de madera rolliza de eucalipto'],
  [/^GUADUA\s+PRESERVADA\s+POR\s+INMERSION.*$/gi, 'Preservación por inmersión en pentaborato (24 h) de guadua rolliza'],
  [/^PRESERVADO\s+POR\s+INYECCION$/gi, 'Preservación e inmunizado de guadua en pie/obra por inyección'],
];

const PREFIJOS_VERBOSOS = /^(suministro,?\s*(transporte\s*)?(e|y)\s*instalaci[oó]n\s+(de\s+|del\s+)?|suministro\s+(y|e)\s+(aplicaci[oó]n|colocaci[oó]n|montaje|construcci[oó]n)\s+(de\s+)?|construcci[oó]n\s+y\s+suministro\s+de\s+|s\s*[ye]\s*i\s+de\s+)/i;

export function modernizarNombreApu(descRaw) {
  let full = fixMojibake(descRaw)
    .replace(/\s*\(copia\)\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let expandido = full;
  for (const [re, rep] of REEMPLAZOS_APU) {
    expandido = expandido.replace(re, rep);
  }

  const descripcionTecnica = sentenceCaseTecnico(expandido);

  let corto = expandido
    .replace(PREFIJOS_VERBOSOS, '')
    .replace(/\(\s*(?:seg[uú]n\s+[^)]*|cota\s+[^)]*|dim\.\s*int\.[^)]*|ball\s+1[^)]*|\d+\s+de\s+\d[^)]*|\d+\s+(?:sanitarios|duchas|lavamanos|meses)[^)]*|parqueadero\s+cubierto[^)]*|5\s*m\s+en\s+ba[ñn]os[^)]*)\)/gi, '')
    .replace(/\s+en\s+nivel\s+N[+-][\d.,]+\s*m\b/gi, '')
    .replace(/\s+siguiendo\s+pendientes.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  const cortesSuaves = [
    /,\s*(incluye|incluido|incl\.|seg[uú]n\s+dise[ñn]o|seg[uú]n\s+plano|de\s+acuerdo\s+con|todo\s+costo|conformad[ao]\s+por|dotado\s+con|con\s+chapa\b|acabado\s+a\s+base)/i,
    /\.\s+(Incluye|Seg[uú]n|Se\s+debe|Medida|Nota|Tr[aá]fico)/i,
    /\s+incluye\s+(accesorios|transporte|andamios|elementos\s+de\s+fijaci[oó]n|corte,\s*figurado|retiro\s+de\s+capa|traslapos|tapas)/i,
  ];
  if (corto.length > 76) {
    for (const re of cortesSuaves) {
      const m = corto.match(re);
      if (m && m.index >= 18) {
        corto = corto.slice(0, m.index).trim();
        break;
      }
    }
  }
  if (corto.length > 105) {
    const openPar = corto.lastIndexOf('(');
    const closePar = corto.lastIndexOf(')');
    if (openPar >= 42 && (closePar < openPar || (corto.length > 105 && openPar > 55))) {
      corto = corto.slice(0, openPar).trim();
    } else {
      const idx = corto.lastIndexOf(' ', 102);
      corto = corto.slice(0, idx > 35 ? idx : 102);
    }
  }
  while ((corto.match(/\(/g) || []).length > (corto.match(/\)/g) || []).length) {
    const lastOpen = corto.lastIndexOf('(');
    if (lastOpen > 18) corto = corto.slice(0, lastOpen).trim();
    else corto = `${corto})`;
  }
  while ((corto.match(/\)/g) || []).length > (corto.match(/\(/g) || []).length) {
    const firstClose = corto.indexOf(')');
    corto = (corto.slice(0, firstClose) + corto.slice(firstClose + 1)).replace(/\s+/g, ' ').trim();
  }
  const CONECTORES_FINALES = /\s+\b(de|del|en|con|por|para|a|al|y|e|o|u|sin|sobre|bajo|hacia|hasta|seg[uú]n|siguiendo|incluye|incluido|espesor|acabado|base|tapa|[xX×])\s*$/i;
  while (CONECTORES_FINALES.test(corto)) {
    corto = corto.replace(CONECTORES_FINALES, '').replace(/[,;:\-\s]+$/, '').trim();
  }

  const nombre = sentenceCaseTecnico(corto.replace(/[,;:\-\s]+$/, ''));
  return {
    nombre,
    descripcionTecnica,
    fueRenombrado: norm(nombre) !== norm(full),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. CLASIFICADOR DE CAPÍTULO, DISCIPLINA Y CUADRILLA TITULAR (27 OPERATIVOS)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Nota: `norm()` convierte Ñ -> N y elimina tildes, por lo que todas las expresiones
 * regulares sobre `NM`, `N`, `C`, `SF` usan `N` (ej. `PANETE`, `CANA`, `BANO`, `PELDANO`, `SENAL`).
 */
export function clasificarApu({ nombreModerno, nombreOriginal = '', categoriaOrigen = '', fuente = '', subfuente = '', itemCode = '' }) {
  const NM = norm(nombreModerno);
  const N = norm(`${nombreModerno} ${nombreOriginal}`);
  const C = norm(categoriaOrigen);
  const SF = norm(subfuente);

  const pick = (nombreCap, overrideCuadrilla = null) => {
    const cap = CAPITULO_MAP.get(nombreCap) || CAPITULO_MAP.get('PRELIMINARES');
    const cua = overrideCuadrilla || cap.cuadrilla;
    const disc = overrideCuadrilla
      ? (CUADRILLAS_MO_BD.find((q) => q.codigo === overrideCuadrilla)?.disciplina || cap.disciplina)
      : cap.disciplina;
    return {
      codigoCapitulo: cap.codigo,
      capitulo: cap.nombre,
      disciplina: disc,
      cuadrilla: cua,
      hm_pct: cap.hm_pct,
    };
  };

  // 1. Demoliciones, desmontes, retiros y cerramientos provisionales PRIMERO (evita que "cerramiento en guadua" o "desmontaje de puertas/ventanería/cielo raso/hidrosanitarios" se fuguen)
  if (/^(DEMOLICION|DESMONTAJE|DESMONTE|RETIRO DE (CUBIERTA|GABINETE|CIELO|ACCESORIOS|VENTANERIA|PUERTA)|ROTURA DE MURO|APERTURA DE ESCOTILLA TEMPORAL|CAMPAMENTO|CERRAMIENTO (PROVISIONAL|DE OBRA)|VALLA INFORMATIVA|SENALIZACION PROVISIONAL)/.test(NM)) {
    return pick('PRELIMINARES', 'CUA-MOV');
  }
  if (/TOPOGRAF|LOCALIZACION.*REPLANTEO|^LOCALIZACION$/.test(NM)) {
    return pick('PRELIMINARES', 'CUA-TOP');
  }
  // Muros de adecuación en Superboard/Drywall antes de subfuente RCI
  if (/^CONFORMACION DE MURO.*GABINETE/.test(NM)) {
    return pick('DRYWALL Y CIELOS');
  }

  // 2. Subfuentes explícitas de RCI Extinción vs Detección
  if (SF.includes('APU DETECCION') || C.includes('DETECCION')) {
    return pick('DETECCIÓN Y ALARMA DE INCENDIO');
  }
  if (SF.includes('APU EXTINCION')) {
    return pick('RED CONTRA INCENDIO (EXTINCIÓN)');
  }

  // 3. Especialidades MEP, Gas Domiciliario y Hospitalarias
  if (/GASES MEDICINAL|OXIGENO MEDICINAL|VACIO MEDICINAL|AIRE MEDICINAL|NFPA 99|TOMA DISS|TOMAS? QC|CAJAS? DE CORTE.*VALVULA|EVACUACION DE GASES|MANIFOLD/.test(N)) {
    return pick('GASES MEDICINALES');
  }
  if (/CALENTADOR.*A\s+GAS|RED DE GAS|PUNTO DE GAS|TUBERIA.*PE-AL-PE|REGULADOR DE GAS|MEDIDOR DE GAS|INSTALACION.*GAS DOMICILIARIO|NTC 2505/.test(NM)) {
    return pick('REDES DE GAS DOMICILIARIO');
  }
  if (/PANEL.*INCENDIO|SENSOR FOTOELECTRICO|DETECTOR DE HUMO|DETECTOR TERMICO|DETECTOR INTELIGENTE|ESTACION MANUAL|SIRENA.*ESTROBO|MODULO MONITOR|MODULO DE CONTROL|LAZO SLC|FPLR|NFPA 72/.test(NM)) {
    return pick('DETECCIÓN Y ALARMA DE INCENDIO');
  }
  if (/\bRCI\b|CONTRA INCENDIO|CONTRA INCENDIOS|EXTINCION|ROCIADOR|SPRINKLER|SIAMESA|GABINETE.*INCENDIO|GABINETE CLASE|GABINETES? TIPO 3|SCH 10.*RANURAD|SCH 40.*RANURAD|TUBERIA AC SCH|VALVULA.*UL\/FM|EXTINTOR/.test(NM)) {
    return pick('RED CONTRA INCENDIO (EXTINCIÓN)');
  }
  if (/VOZ Y DATOS|CATEGORIA 6|CAT ?6A?|\bUTP\b|PATCH PANEL|PATCH CORD|RACK|FIBRA OPTICA|JACK RJ45|FACE ?PLATE|CABLEADO ESTRUCTURADO|CERTIFICACION.*DATOS|SALIDA PARA DATOS|ACCESS POINT|CAMARA IP|GRABADOR DE VIDEO|\bNVR\b|DISCO DURO SATA|SWITCH (ACTIVO|ADMINISTRABLE)|CANALETA METALICA CON DIVISION|BANDEJA PORTACABLE/.test(NM)) {
    return pick('VOZ Y DATOS');
  }
  if (/\bVRF\b|\bVRV\b|AIRE ACONDICIONADO|VENTILACION MECANICA|UNIDAD CONDENSADORA|CONDENSADORA|UNIDAD EVAPORADORA|RUBATEX|FAN ?COIL|MANEJADORA DE AIRE|UNIDAD MANEJADORA|UNIDAD DE EXTRACCION|UNIDAD DE VENTILACION|PORTAFILTROS|DIFUSOR DE (FLUJO|SUMINISTRO)|DIFUSOR LINEAL|ESQUINEROS PARA DIFUSOR|REJILLA DE (RETORNO|EXTRACCION)|\bL-AV\b|DUCTO FLEXIBLE|CONDUCTOS EN LAMINA|EXTRACTOR DE AIRE|CONTROL CENTRALIZADO.*UNIDADES|CONTROLADOR REMOTO|TERMOSTATO|REFNET|EEV KIT|AHUKIT|TAA\s*-?\s*01|TARJETA DE (CONTROL|COMUNICACION)|TUBERIA DE REFRIGERACION/.test(NM)) {
    return pick('AIRE ACONDICIONADO');
  }

  // 4. Separación estricta Construcción en Guadua (Cap 22) vs Construcción en Madera (Cap 23)
  if (/\bGUADUA\b|BAHAREQUE|\bESTERILLA\b|LATILLA DE GUADUA|BALDOSA DE GUADUA|PENTABORATO/.test(NM)) {
    return pick('CONSTRUCCIÓN EN GUADUA');
  }
  if (/MADERA ROLLIZA|COLUMNA EN ROLLIZA|EUCALIPTO|ESTRUCTURA DE CUBIERTA EN MADERA|ESTRUCTURA EN MADERA|CERCHA EN MADERA|ENTRAMADO EN MADERA/.test(NM)) {
    return pick('CONSTRUCCIÓN EN MADERA');
  }

  // 5. Piscinas vs Iluminación general
  if (/^(CINTA LED|LUMINARIA|PANEL LED|BALA LED|REFLECTOR LED|LAMPARA|APLIQUE|AVISO DE SALIDA)/.test(NM) && !/SUMERGIBLE|SUBACUAT/.test(NM)) {
    return pick('ELÉCTRICAS');
  }
  if (/PISCINA|SKIMMER|DESNATADOR|BOQUILLA DE RETORNO.*PISCINA|CLORADOR|FILTRO DE ARENA DE SILICE|SUMERGIBLE/.test(NM)) {
    return pick('PISCINAS');
  }

  // 6. Reglas quirúrgicas para evitar falsos positivos cruzados detectados en auditoría
  if (/LINEAS TRAFICO|DEMARCACION VIAL/.test(NM)) {
    return pick('EXTERIORES Y VÍAS', 'CUA-PIN');
  }
  if (/LAVADO ACIDO DESINCRUSTANTE.*HIDROFUGO/.test(NM)) {
    return pick('MAMPOSTERÍA');
  }
  if (/^FILOS(,|\s+Y)\s+DILATACIONES|^DILATACIONES$|IMPERMEABILIZACION DE PISOS Y MUROS DE DUCHAS.*SIKATOP/.test(NM)) {
    return pick('PAÑETES');
  }
  if (/CAJAS? DE INSPECCION ELECTRICA|DUCTO PARA MEDIA TENSION|PROTECCION CONTRA RAYOS|^TABLERO (DE DISTRIBUCION|GENERAL|DE AISLAMIENTO)|SALIDA DE TOMACORRIENTE.*CALENTADOR ELECTRICO/.test(NM)) {
    return pick('ELÉCTRICAS');
  }
  if (/ACOMETIDA HIDRAULICA|CAJAS? DE INSPECCION SANITARIA|CONO DE VENTILACION/.test(NM)) {
    return pick('HIDROSANITARIAS Y PETAR');
  }
  if (/LAVAMANOS CON PEDESTAL|MESON EN ACERO INOX|JUEGO DE ACCESORIOS PARA BANO|LAVATRAPERO/.test(NM)) {
    return pick('APARATOS SANITARIOS');
  }
  if (/VIGA CANAL.*LAMINA GALVANIZADA|CANAL EN LAMINA GALVANIZADA/.test(NM)) {
    return pick('CUBIERTAS');
  }
  if (/^COLUMNAS Y VIGAS.*TUBO CUADRADO|^CORREAS (EN TUBO|METALICAS)|^DESCANSOS DE 1[.,]20|^ESCALONES DE 1[.,]20/.test(NM)) {
    return pick('ESTRUCTURA METÁLICA Y CERRAJERÍA');
  }
  if (/^PISO (HOSPITALARIO|ARQUITECTONICO EN VINILO|CONTINUO|VINILO)|^MORTERO DE NIVELACION/.test(NM)) {
    return pick('PISOS Y ENCHAPES');
  }
  if (/^(APLICACION DE )?(PINTURA|ANTICORROSIVA|ESMALTE|BARNIZ|TINTILLA|VINILO|WASH PRIMER|CARBURO SOBRE|ESTUCO|SIKAESTUCO|IMPRIMACION|SELLADO IMPRIMANTE|ACABADO EN LACA)|^RESANE,\s*ESTUCO/.test(NM)) {
    return pick('ESTUCO Y PINTURA');
  }
  if (/^(RED SANITARIA|COLECTOR|TUBERIA SUBTERRANEA|TEE SANITARIA|CODO SANITARIO|CODO DE ALCANTARILLADO|CODO SUBTERRANEO|SIFON SANITARIO|REJILLA DE PISO|VALVULA CANASTILLA|CAJA DE INSPECCION|PUNTO HIDRAULICO|PUNTOS HIDRAULICOS|PUNTO SANITARIO|PUNTOS SANITARIOS|PUNTO DE AGUAS LLUVIAS)/.test(NM)) {
    return pick('HIDROSANITARIAS Y PETAR');
  }

  // 7. Prefijos de capítulos puros del Hospital Civil Ipiales
  if (fuente === 'HOSPITAL' && itemCode) {
    const p = String(itemCode).split('.').map(Number);
    if (p[0] === 7 || p[0] === 8) return pick('RED CONTRA INCENDIO (EXTINCIÓN)');
    if (p[0] === 11) return pick('VOZ Y DATOS');
    if (p[0] === 12) return pick('AIRE ACONDICIONADO');
    if (p[0] === 13) return pick('GASES MEDICINALES');
  }

  // 8. Reglas generales por actividad constructiva
  if (/ASEO|LIMPIEZA FINAL|LIMPIEZA GENERAL|LAVADO DE FACHADA|ENTREGA DE OBRA/.test(NM)) {
    return pick('ASEO Y ENTREGA');
  }
  if (/^DESCAPOTE|EXCAVACION|RELLENO.*COMPACTA|CONFORMACION Y COMPACTACION|CONFORMACION DE TERRAZAS|EXPLANACION|CORTE Y EXCAVACION|TERRAPLEN|CARGUE.*TRANSPORTE|CARGUE.*RETIRO|DISPOSICION FINAL|BOTE DE MATERIAL/.test(NM)) {
    return pick('MOVIMIENTO DE TIERRAS');
  }
  if (/CERRAMIENTO EN MARCO.*MALLA ESLABONADA/.test(NM)) {
    return pick('EXTERIORES Y VÍAS', 'CUA-MET');
  }
  // Sistemas livianos y cielos ANTES de estructura metálica
  if (/DRYWALL|SUPERBOARD|CIELO ?RASO|CIELORRASO|PLACA DE YESO|PANEL DE YESO|MURO LIVIANO|FACHADA LIVIANA|ESCOTILLA DE INSPECCION|RESANE DE CIELO|LAMINA DE PLOMO|MEDIA CANA MICROPERFORADA|DUELA MACHIHEMBRADA/.test(NM)) {
    return pick('DRYWALL Y CIELOS');
  }
  if (/SOLADO|SUB-?CIMIENTO|MEJORAMIENTO.*CIM|ZAPATA|CIMIENTO|CICLOPEO|VIGAS? DE CIMENTACION|VIGUETA DE AMARRE EN CIM|PEDESTAL|SOBRECIMIENTO|PILOTE|CAISSON/.test(NM)) {
    return pick('CIMENTACIÓN');
  }
  // Estructura metálica y cerrajería (incluye puertas/ventanas metálicas, rejas, antepechos, pasamanos metálicos)
  if (/\bIPE\b|\bHEA\b|\bPHR\b|PERFIL METALICO|PERFIL ESTRUCTURAL|PERFIL TUBULAR|ACERO ESTRUCTURAL A500|ESTRUCTURA METALICA|PLATINA DE ANCLAJE|CORREAS? METALICAS?|CERCHA METALICA|PUERTA METALICA|PUERTA EN MARCO EN ANGULO|VENTANA EN LAMINA|REJA|ANTEPECHO|BARANDA.*(METALIC|ACERO)|PASAMANOS.*(METALIC|ACERO)/.test(NM)) {
    return pick('ESTRUCTURA METÁLICA Y CERRAJERÍA');
  }
  if (/TEJA |CUBIERTA EN TEJA|CUBIERTA TEJA|PANEL EXTERIOR.*WPC|CABALLETE|CLARABOYA|CANAL PLUVIAL|CANAL PVC|CANAL AMAZONAS|BAJANTE DE AGUAS|FLANCHE|MANTO ASFALTICO/.test(NM)) {
    return pick('CUBIERTAS');
  }
  // Carpintería en aluminio y vidrio (independizada de carpintería en madera)
  if (
    /DIVISIONES? DE BANO.*VIDRIO|PUERTAS?-VENTANAS?.*ALUMINIO|VENTANAS?.*ALUMINIO|VENTANERIA.*ALUMINIO|PUERTAS?.*(ALUMINIO|VIDRIO TEMPLADO)|^VIDRIO\b|ESPEJO.*MARCO EN ALUMINIO/.test(NM)
  ) {
    return pick('CARPINTERÍA EN ALUMINIO Y VIDRIO');
  }
  // Carpintería en madera y mobiliario (independizada)
  if (/PUERTAS?.*(MADERA|ENTAMBORADA|MELAMIN|\bRH\b)|MUEBLES?|CLOSET|REPISAS|COCINA INTEGRAL|CERRADURA/.test(NM)) {
    return pick('CARPINTERÍA EN MADERA');
  }
  if (/SANITARIO|LAVAMANOS|ORINAL|CONJUNTO DE DUCHA|DUCHA|GRIFERIA|LAVAPLATOS|LAVADERO|INCRUSTACION|GABINETE DE BANO|TUBO.*CORTINA DE DUCHA|DISPENSADOR|ESPEJO FLOTADO|BARRA DE APOYO|POCETA/.test(NM)) {
    return pick('APARATOS SANITARIOS');
  }
  if (/RED HIDRAULICA|RED DE AGUAS LLUVIAS|RED DE DESCOLE|BAJANTES? DE AGUAS LLUVIAS|TUBERIA PVC|TUBERIA CPVC|TUBERIA DE (VENTILACION|SUCCION)|TUBERIA \d.*" PARA RED|VALVULA|REGISTRO DE CORTE|LLAVES? DE PASO|LLAVE TERMINAL|CHEQUE|GRIFO|NIPLE|CAJA DE INSPECCION|CAMARA DE INSPECCION|CILINDRO.*CAMARA DE INSPECCION|CONO REDUCTOR.*CAMARA|BASE Y CANUELA|CONEXION A RED|DESCOC?LE DE AGUAS|SUMIDERO|ALCANTARILLADO|SISTEMA SEPTICO|TANQUE SEPTICO|FAFA|PTAR|PETAR|LECHO FILTRANTE|TRAMPA DE GRASA|BOMBA CENTRIFUGA|EQUIPO HIDRONEUMATICO|EQUIPO DE BOMBEO|TANQUE DE ALMACENAMIENTO|CALENTADOR/.test(NM)) {
    return pick('HIDROSANITARIAS Y PETAR');
  }
  if (/CANALIZACION ELECTRICA|TUBERIA ELECTRICA|TUBERIA CONDUIT|FUNDICION DE TUBERIA ELECTRICA|CONDUIT|CAJA ELECTRICA|CAJA METALICA CON VISOR|CAJA PARA TOTALIZADOR|TOMACORRIENTE|APARATO TOMACORRIENTE|INTERRUPTOR|SALIDA ELECTRICA|SALIDAS ELECTRICAS|SALIDA DE (ILUMINACION|INTERRUPTOR|SENSOR|TOMACORRIENTE)|SALIDA ESPECIAL|LUMINARIA|PANEL LED|BALA LED|REFLECTOR|TABLERO|BASE PARA TABLEROS|TRANSFORMADOR|UPS ON LINE|\bUPS\b|PRUEBAS ELECTRICAS|CERTIFICACION RETIE|MATRICULA ELECTRICA|ACOMETIDA|ALIMENTADOR EN BAJA TENSION|MASTIL.*ACOMETIDA|CABLEADO ELECTRICO|PUESTA A TIERRA|APANTALLAMIENTO|DPS|CAPACETE|TIMBRE|PULSADOR PARA TIMBRE|ZUMBADOR|PLAFON|PORTALAMPARA/.test(NM)) {
    return pick('ELÉCTRICAS');
  }
  if (/PANETE|REVOQUE|REPELLO|PERLADO|IMPERMEABILIZACION INTEGRAL DE MURO/.test(NM)) {
    return pick('PAÑETES');
  }
  if (/MURO EN LADRILLO|MURO EN BLOQUE|MURO DIVISORIO EN LADRILLO|MURO EN MAMPOSTERIA|MAMPOSTERIA|ALFAJIA/.test(NM)) {
    return pick('MAMPOSTERÍA');
  }
  if (/PAVIMENTO RIGIDO|SARDINEL|ANDEN|SUB-?BASE GRANULAR|BASE GRANULAR|ADOQUIN|EMPRADIZADO|ZONA VERDE|SEPARADOR VIAL|ACERO LISO DE TRANSFERENCIA/.test(NM)) {
    return pick('EXTERIORES Y VÍAS');
  }
  if (/\bPISO\b|ENCHAPE|PORCELANATO|CERAMICA|GUARDAESCOBA|GRANITO|GRAVILLA LAVADA|MARMOL|ESPACATO|PIEDRA NATURAL|TABLETA|TABLON|CONTRAPISO|BARRERA DE VAPOR|MALLA ELECTROSOLDADA.*CONTRAPISO|ALISTADO DE PISO|PULIDO FINAL|DILATACION EN BRONCE|REMATE.*WIN|PERFIL REMATE/.test(NM)) {
    return pick('PISOS Y ENCHAPES');
  }
  if (/ESTUCO|PINTURA|VINILO|ESMALTE|ANTICORROSIV|IMPRIMANTE|GRAFIADO|KORAZA/.test(NM)) {
    return pick('ESTUCO Y PINTURA');
  }
  if (/COLUMNA|COLUMNETA|VIGA AEREA|VIGAS \d|VIGA CINTA|VIGUETA|VIGA CANAL|DINTEL|LOSA|PLAQUETA|PLACA|ESCALERA|PELDANO|MURO DE CONTENCION|MURO PANTALLA|TANQUE SUBTERRANEO|BASES PARA BOMBAS|TAPA DE \d+X\d+ FUNDIDA|IMPERMEABILIZACION DE CONCRETO PARA TANQUE|CINTA SIKA PVC|ACERO CORRUGADO|ACERO DE REFUERZO|MALLA ELECTROSOLDADA|CONCRETO|FUNDICION EN CONCRETO/.test(NM)) {
    return pick('ESTRUCTURA EN CONCRETO');
  }

  // 9. Respaldo por categoría de origen
  if (/MOVIMIENTO/.test(C)) return pick('MOVIMIENTO DE TIERRAS');
  if (/CIMENT/.test(C)) return pick('CIMENTACIÓN');
  if (/ESTRUCTURA.*CONCRETO|FUNDICION/.test(C)) return pick('ESTRUCTURA EN CONCRETO');
  if (/MURO|MAMPOST/.test(C)) return pick('MAMPOSTERÍA');
  if (/REVOQUE|PANETE/.test(C)) return pick('PAÑETES');
  if (/ENCHAPE|ACABADO/.test(C)) return pick('PISOS Y ENCHAPES');
  if (/CUBIERTA|CANAL/.test(C)) return pick('CUBIERTAS');
  if (/GAS DOMICIL/.test(C)) return pick('REDES DE GAS DOMICILIARIO');
  if (/HIDRAUL|SANIT|ALCANT/.test(C)) return pick('HIDROSANITARIAS Y PETAR');
  if (/ELECTR/.test(C)) return pick('ELÉCTRICAS');
  if (/ESTUCO|PINTURA/.test(C)) return pick('ESTUCO Y PINTURA');
  if (/ALUMINIO|VIDRIO|VENTAN/.test(C)) return pick('CARPINTERÍA EN ALUMINIO Y VIDRIO');
  if (/CARPINTER/.test(C)) return pick('CARPINTERÍA EN MADERA');
  if (/VIAS|EXTERIOR/.test(C)) return pick('EXTERIORES Y VÍAS');
  if (/GUADUA/.test(C)) return pick('CONSTRUCCIÓN EN GUADUA');
  if (/MADERA|ROLLIZA/.test(C)) return pick('CONSTRUCCIÓN EN MADERA');

  return pick('PRELIMINARES', 'CUA-MOV');
}
