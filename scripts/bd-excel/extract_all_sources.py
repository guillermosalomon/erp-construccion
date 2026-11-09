r"""
Extrae de forma determinista las 4 fuentes de presupuestos en:
  D:\DPTO. ARQUITECTURA\0000 presupuestos
sin modificar ninguno de los archivos originales.

Fuentes procesadas:
  1. PRESUPUESTO_H CIVIL IPIALES_OBRACIVIL_2026_07_28_REFERENTE.xlsx (HOSPITAL)
  2. PRESUPUESTO_CANTIDADES_CASA_RICAURTE_DRIVE.xlsx (RICAURTE — con evaluador recursivo de fórmulas Excel)
  3. PRESUPUESTO REFERENCIA_DETECCION_2025_12_05.xlsx (DETECCION)
  4. APEU 2026_BASE APP_FINAL.xls (APEU — vía SheetJS en Node)

Salida:
  scripts/bd-excel/data/raw_sources.json
"""

import datetime
import json
import os
import re
import subprocess
import sys
import openpyxl

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ERP_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
DATA_DIR = os.path.join(SCRIPT_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

SRC_DIR = r"D:\DPTO. ARQUITECTURA\0000 presupuestos"
F_HOSP = os.path.join(SRC_DIR, "PRESUPUESTO_H CIVIL IPIALES_OBRACIVIL_2026_07_28_REFERENTE.xlsx")
F_RIC = os.path.join(SRC_DIR, "PRESUPUESTO_CANTIDADES_CASA_RICAURTE_DRIVE.xlsx")
F_DET = os.path.join(SRC_DIR, "PRESUPUESTO REFERENCIA_DETECCION_2025_12_05.xlsx")
F_APEU = os.path.join(SRC_DIR, "APEU 2026_BASE APP_FINAL.xls")


def g(r, i):
    return r[i] if r is not None and len(r) > i else None


def num(x):
    if x is None or x == "" or isinstance(x, bool):
        return None
    if isinstance(x, (int, float)):
        return float(x)
    s = str(x).strip().replace("$", "").replace(" ", "")
    if not s:
        return None
    # Handle thousands/decimal formats carefully
    if "," in s and "." in s:
        if s.rfind(",") > s.rfind("."):
            s = s.replace(".", "").replace(",", ".")
        else:
            s = s.replace(",", "")
    elif "," in s and re.match(r"^-?\d+,\d+$", s):
        s = s.replace(",", ".")
    try:
        return float(s)
    except Exception:
        return None


def item_code(x):
    if x is None:
        return ""
    if isinstance(x, datetime.datetime):
        return f"{x.day}.{x.month}.{x.year - 2000}"
    if isinstance(x, float) and x.is_integer():
        return str(int(x))
    if isinstance(x, (int, float)):
        return str(x)
    s = str(x).strip()
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})", s)
    if m:
        return f"{int(m.group(3))}.{int(m.group(2))}.{int(m.group(1)) - 2000}"
    return s


def rows_of(wb, name):
    out = []
    for r in wb[name].iter_rows(values_only=True):
        v = list(r)
        while v and v[-1] is None:
            v.pop()
        out.append(v)
    return out


# ═══════════════════════════════════════════════════════════════
# Evaluador recursivo de fórmulas Excel (para CASA_RICAURTE_DRIVE)
# ═══════════════════════════════════════════════════════════════
def col_to_idx(col_str):
    idx = 0
    for ch in col_str.upper():
        idx = idx * 26 + (ord(ch) - ord("A") + 1)
    return idx - 1


def parse_cell_addr(addr):
    addr = addr.replace("$", "").strip()
    m = re.match(r"^([A-Za-z]+)(\d+)$", addr)
    if not m:
        return None
    return (int(m.group(2)) - 1, col_to_idx(m.group(1)))


class WorkbookFormulaEvaluator:
    def __init__(self, fpath):
        wb = openpyxl.load_workbook(fpath, read_only=True, data_only=False)
        self.sheets = {}
        for sname in wb.sheetnames:
            self.sheets[sname] = [list(r) for r in wb[sname].iter_rows(values_only=True)]
        wb.close()
        self.cache = {}

    def get_val(self, sheet, row, col, visiting=None):
        key = (sheet, row, col)
        if key in self.cache:
            return self.cache[key]
        if visiting is None:
            visiting = set()
        if key in visiting:
            return 0
        rows = self.sheets.get(sheet)
        if not rows or row < 0 or row >= len(rows):
            return None
        r = rows[row]
        if col < 0 or col >= len(r):
            return None
        raw = r[col]
        if not (isinstance(raw, str) and raw.startswith("=")):
            self.cache[key] = raw
            return raw

        visiting = visiting | {key}
        res = self._eval_formula(sheet, raw[1:].strip(), visiting)
        self.cache[key] = res
        return res

    def _resolve_range(self, cur_sheet, ref_str, visiting):
        ref_str = ref_str.strip()
        target_sheet = cur_sheet
        if "!" in ref_str:
            sp, ref_str = ref_str.split("!", 1)
            target_sheet = sp.strip().strip("'")
        if ":" in ref_str:
            a, b = ref_str.split(":", 1)
            pa, pb = parse_cell_addr(a), parse_cell_addr(b)
            if not pa or not pb:
                return []
            vals = []
            for rr in range(min(pa[0], pb[0]), max(pa[0], pb[0]) + 1):
                for cc in range(min(pa[1], pb[1]), max(pa[1], pb[1]) + 1):
                    vals.append(self.get_val(target_sheet, rr, cc, visiting))
            return vals
        p = parse_cell_addr(ref_str)
        if p:
            return [self.get_val(target_sheet, p[0], p[1], visiting)]
        return []

    def _eval_formula(self, cur_sheet, expr, visiting):
        # Direct single cell reference (preserves string or number!)
        m_direct = re.match(r"^(?:'([^']+)'!|([A-Za-z0-9_]+)!)?\$?([A-Za-z]+)\$?(\d+)$", expr)
        if m_direct:
            sh = m_direct.group(1) or m_direct.group(2) or cur_sheet
            r_idx = int(m_direct.group(4)) - 1
            c_idx = col_to_idx(m_direct.group(3))
            return self.get_val(sh, r_idx, c_idx, visiting)

        # Replace functions: ROUND(...), SUM(...), AVERAGE(...)
        def eval_inner(s):
            s = s.strip()
            # Resolve innermost functions iteratively
            func_pat = re.compile(r"\b(SUM|AVERAGE|ROUND|MIN|MAX)\(([^()]*)\)", re.IGNORECASE)
            while True:
                m = func_pat.search(s)
                if not m:
                    break
                fn = m.group(1).upper()
                args_raw = [a.strip() for a in m.group(2).split(",") if a.strip()]
                if fn == "ROUND":
                    val_num = num(eval_inner(args_raw[0])) or 0.0
                    digits = int(num(eval_inner(args_raw[1])) or 0) if len(args_raw) > 1 else 0
                    rep = str(round(val_num, digits))
                else:
                    nums = []
                    for arg in args_raw:
                        if ":" in arg or re.match(r"^(?:'[^']+'!|[A-Za-z0-9_]+!)?\$?[A-Za-z]+\$?\d+$", arg):
                            for v in self._resolve_range(cur_sheet, arg, visiting):
                                nv = num(v)
                                if nv is not None:
                                    nums.append(nv)
                        else:
                            nv = num(eval_inner(arg))
                            if nv is not None:
                                nums.append(nv)
                    if fn == "SUM":
                        rep = str(sum(nums))
                    elif fn == "AVERAGE":
                        rep = str(sum(nums) / len(nums) if nums else 0.0)
                    elif fn == "MIN":
                        rep = str(min(nums) if nums else 0.0)
                    elif fn == "MAX":
                        rep = str(max(nums) if nums else 0.0)
                    else:
                        rep = "0"
                s = s[: m.start()] + rep + s[m.end() :]

            # Replace remaining cell references in arithmetic expression
            cell_pat = re.compile(r"(?:'([^']+)'!|([A-Za-z0-9_]+)!)?\$?([A-Za-z]+)\$?(\d+)")

            def repl_cell(mc):
                sh = mc.group(1) or mc.group(2) or cur_sheet
                rr = int(mc.group(4)) - 1
                cc = col_to_idx(mc.group(3))
                v = self.get_val(sh, rr, cc, visiting)
                nv = num(v)
                return str(nv if nv is not None else 0.0)

            s_arith = cell_pat.sub(repl_cell, s)
            if re.match(r"^[\d\.\+\-\*\/\(\)\s_eE]+$", s_arith):
                try:
                    return float(eval(s_arith, {"__builtins__": None}, {}))
                except Exception:
                    return 0.0
            return s_arith

        return eval_inner(expr)

    def evaluated_rows(self, sheet):
        rows = self.sheets.get(sheet, [])
        out = []
        for r_idx, r in enumerate(rows):
            ev = [self.get_val(sheet, r_idx, c_idx) for c_idx in range(len(r))]
            while ev and ev[-1] is None:
                ev.pop()
            out.append(ev)
        return out


# ═══════════════════════════════════════════════════════════════
# Parsers para hojas estándar (Hospital / Detección / Ricaurte)
# ═══════════════════════════════════════════════════════════════
BUCKETS_3ROW = {5: "equipo", 6: "material", 7: "mano_obra", 8: "transporte"}


def parse_apu_blocks_3row(rows, fuente, subfuente):
    """Formato Hospital y Detección: 3 filas de cabecera y cierre en 'C. DIRECTO'."""
    apus = []
    i, n = 0, len(rows)
    while i < n:
        r = rows[i]
        nxt = rows[i + 1] if i + 1 < n else []
        if g(r, 1) and g(r, 8) and str(g(nxt, 5) or "").strip().upper().startswith("EQUIPO"):
            apu = {
                "fuente": fuente,
                "subfuente": subfuente,
                "item": item_code(g(r, 0)),
                "descripcion": str(g(r, 1)).strip(),
                "unidad": str(g(r, 8)).strip().upper(),
                "codigo_erp": None,
                "lineas": [],
            }
            j = i + 3
            while j < n:
                l = rows[j]
                d = g(l, 1)
                if d and str(d).strip().upper().startswith("C. DIRECTO"):
                    apu["directo"] = num(g(l, 4))
                    apu["subtotales"] = {
                        "equipo": num(g(l, 5)) or 0,
                        "material": num(g(l, 6)) or 0,
                        "mano_obra": num(g(l, 7)) or 0,
                        "transporte": num(g(l, 8)) or 0,
                    }
                    break
                if d and num(g(l, 3)) is not None:
                    bucket = None
                    for k in (5, 6, 7, 8):
                        if num(g(l, k)):
                            bucket = BUCKETS_3ROW[k]
                    du = str(d).upper()
                    if bucket is None:
                        if "CUADRILLA" in du or "VALOR HORA" in du:
                            bucket = "mano_obra"
                        elif "TRANSPORTE" in du:
                            bucket = "transporte"
                        elif "HERRAMIENTA" in du or "ANDAMIO" in du:
                            bucket = "equipo"
                        else:
                            bucket = "material"
                    apu["lineas"].append(
                        {
                            "descripcion": str(d).strip(),
                            "unidad": str(g(l, 2) or "").strip().upper(),
                            "cantidad": num(g(l, 3)),
                            "precio": num(g(l, 4)) or 0,
                            "bucket": bucket,
                        }
                    )
                j += 1
            apus.append(apu)
            i = j + 1
        else:
            i += 1
    return apus


def parse_apu_blocks_ricaurte(rows):
    """Formato Casa Ricaurte Drive (1 fila cabecera con 'UNIDAD', 'RENDIM' y cierre 'COSTO DIRECTO UNITARIO:')."""
    apus = []
    i, n = 0, len(rows)
    while i < n:
        r = rows[i]
        if (
            g(r, 1)
            and str(g(r, 2) or "").strip().upper() == "UNIDAD"
            and str(g(r, 5) or "").strip().upper().startswith("EQUIPO")
        ):
            apu = {
                "fuente": "RICAURTE",
                "subfuente": "APU O CIVL",
                "item": item_code(g(r, 0)),
                "descripcion": str(g(r, 1)).strip(),
                "unidad": "UND",
                "codigo_erp": str(g(r, 9)).strip() if g(r, 9) else None,
                "lineas": [],
            }
            j = i + 1
            while j < n:
                l = rows[j]
                d = g(l, 1)
                if d and "COSTO DIRECTO" in str(d).strip().upper():
                    if g(l, 2):
                        apu["unidad"] = str(g(l, 2)).strip().upper()
                    apu["directo"] = num(g(l, 4))
                    apu["subtotales"] = {
                        "equipo": num(g(l, 5)) or 0,
                        "material": num(g(l, 6)) or 0,
                        "mano_obra": num(g(l, 7)) or 0,
                        "transporte": num(g(l, 8)) or 0,
                    }
                    break
                if d and num(g(l, 3)) is not None:
                    bucket = None
                    for k in (5, 6, 7, 8):
                        if num(g(l, k)):
                            bucket = BUCKETS_3ROW[k]
                    du = str(d).upper()
                    if bucket is None:
                        bucket = "mano_obra" if "CUADRILLA" in du else "material"
                    apu["lineas"].append(
                        {
                            "codigo_recurso": str(g(l, 0)).strip() if g(l, 0) else None,
                            "descripcion": str(d).strip(),
                            "unidad": str(g(l, 2) or "").strip().upper(),
                            "cantidad": num(g(l, 3)),
                            "precio": num(g(l, 4)) or 0,
                            "bucket": bucket,
                        }
                    )
                j += 1
            apus.append(apu)
            i = j + 1
        else:
            i += 1
    return apus


def parse_basicos(rows, fuente):
    out = []
    i = 0
    while i < len(rows):
        r = rows[i]
        if g(r, 0) and str(g(r, 1) or "").strip().upper() == "UNIDAD" and str(g(r, 2) or "").strip().upper().startswith("RENDIM"):
            b = {
                "fuente": fuente,
                "descripcion": str(g(r, 0)).strip(),
                "codigo_erp": str(g(r, 8)).strip() if g(r, 8) else None,
                "lineas": [],
            }
            j = i + 1
            while j < len(rows):
                l = rows[j]
                if str(g(l, 0) or "").strip().upper().startswith("DIRECTO"):
                    b["unidad"] = str(g(l, 1) or "M3").strip().upper()
                    b["directo"] = num(g(l, 3))
                    break
                if g(l, 0) and num(g(l, 2)) is not None:
                    bucket = "material"
                    for k, name in ((4, "equipo"), (5, "material"), (6, "mano_obra"), (7, "transporte")):
                        if num(g(l, k)):
                            bucket = name
                    b["lineas"].append(
                        {
                            "descripcion": str(g(l, 0)).strip(),
                            "unidad": str(g(l, 1) or "").strip().upper(),
                            "cantidad": num(g(l, 2)),
                            "precio": num(g(l, 3)) or 0,
                            "bucket": bucket,
                        }
                    )
                j += 1
            out.append(b)
            i = j + 1
        else:
            i += 1
    return out


def parse_materiales_hosp_ric(rows, fuente, has_code):
    out = []
    last_cat = "OBRA CIVIL"
    for r in rows[3:]:
        desc = g(r, 2)
        if not desc:
            continue
        cat = str(g(r, 1) or "").strip().upper() or last_cat
        last_cat = cat
        cots = []
        for base in (6, 9, 12):
            prov, val = g(r, base + 1), num(g(r, base + 2))
            if prov and val and val > 0:
                cots.append(
                    {
                        "proveedor": str(prov).strip().upper(),
                        "valor": val,
                        "referencia": str(g(r, base) or "").strip()[:250],
                    }
                )
        p_ref = num(g(r, 5))
        if p_ref is None and cots:
            p_ref = sum(c["valor"] for c in cots) / len(cots)
        if p_ref is None or p_ref <= 0:
            continue
        out.append(
            {
                "fuente": fuente,
                "categoria": cat,
                "descripcion": str(desc).strip(),
                "codigo_erp": (str(g(r, 3)).strip() if has_code and g(r, 3) else None),
                "unidad": str(g(r, 4) or "UND").strip().upper(),
                "precio_ref": p_ref,
                "cotizaciones": cots,
            }
        )
    return out


def parse_materiales_deteccion(rows):
    """En DETECCION: col[1]=DESCRIPCION, col[2]=CATEGORIA, col[3]=MEDIDA, col[4]=VR. UNIT., col[5..7]=COT1..."""
    out = []
    last_cat = "ELECTRICOS"
    for r in rows[3:]:
        desc = g(r, 1)
        p_ref = num(g(r, 4))
        if not desc or p_ref is None or p_ref <= 0:
            continue
        cat = str(g(r, 2) or "").strip().upper().rstrip(".") or last_cat
        last_cat = cat
        cots = []
        for base in (5, 8, 11):
            prov, val = g(r, base + 1), num(g(r, base + 2))
            if prov and val and val > 0:
                cots.append(
                    {
                        "proveedor": str(prov).strip().upper(),
                        "valor": val,
                        "referencia": str(g(r, base) or "").strip()[:250],
                    }
                )
        out.append(
            {
                "fuente": "DETECCION",
                "categoria": cat,
                "descripcion": str(desc).strip(),
                "codigo_erp": None,
                "unidad": str(g(r, 3) or "UND").strip().upper(),
                "precio_ref": p_ref,
                "cotizaciones": cots,
            }
        )
    return out


def parse_equipos(rows, fuente):
    out = []
    for r in rows[2:]:
        desc = g(r, 1)
        val = num(g(r, 3))
        if desc and val and val > 0:
            out.append(
                {
                    "fuente": fuente,
                    "codigo": str(g(r, 5) or g(r, 0) or "").strip() or None,
                    "descripcion": str(desc).strip(),
                    "unidad": str(g(r, 2) or "HORA").strip().upper(),
                    "precio": val,
                    "referencia": str(g(r, 4) or "").strip(),
                }
            )
    return out


def parse_transportes(rows, fuente):
    out = []
    for r in rows[1:]:
        # Top section: [ITEM, DESCRIPCION, UNIDAD, V. UNITARIO, CODIGO_ERP?]
        if num(g(r, 0)) is not None and g(r, 1) and num(g(r, 3)) and not str(g(r, 0)).lower().endswith("km"):
            out.append(
                {
                    "fuente": fuente,
                    "codigo": str(g(r, 4)).strip() if g(r, 4) else None,
                    "descripcion": str(g(r, 1)).strip(),
                    "unidad": str(g(r, 2) or "UND").strip().upper(),
                    "precio": num(g(r, 3)),
                }
            )
        # Bottom section INVIAS: [UNIDAD (kg-km/m3-km), DESCRIPCION, VALOR UNITARIO, CODIGO]
        elif g(r, 0) and "km" in str(g(r, 0)).lower() and g(r, 1) and num(g(r, 2)):
            out.append(
                {
                    "fuente": fuente,
                    "codigo": str(g(r, 3)).strip() if g(r, 3) else None,
                    "descripcion": str(g(r, 1)).strip(),
                    "unidad": str(g(r, 0)).strip().upper(),
                    "precio": num(g(r, 2)),
                }
            )
    return out


def parse_cuadro(rows, fuente):
    items = []
    cur_cap = "GENERAL"
    for r in rows:
        it, d = g(r, 0), g(r, 1)
        if not d:
            continue
        ds = str(d).strip()
        if ds.upper().startswith(("OBJETO", "ITEM", "SUBTOTAL", "COSTO DIRECTO", "ADMINISTRAC", "IMPREVISTOS", "UTILIDAD", "IVA", "VALOR TOTAL", "CUADRO GENERAL", "CONSTRUCCI")):
            continue
        u, q = g(r, 2), num(g(r, 3))
        code = item_code(it)
        if u and q is not None and str(u).strip().upper() not in ("UNIDAD", "UND.") and q >= 0:
            items.append(
                {
                    "fuente": fuente,
                    "item": code,
                    "capitulo_origen": cur_cap,
                    "descripcion": ds,
                    "unidad": str(u).strip().upper(),
                    "cantidad": q,
                    "precio": num(g(r, 4)),
                    "codigo_erp": str(g(r, 6)).strip() if g(r, 6) else None,
                    "observacion": str(g(r, 7)).strip() if g(r, 7) else None,
                }
            )
        elif (code or fuente == "RICAURTE") and not u:
            cur_cap = ds
    return items


# ═══════════════════════════════════════════════════════════════
# Extractor de APEU 2026_BASE APP_FINAL.xls (vía Node SheetJS)
# ═══════════════════════════════════════════════════════════════
NODE_APEU_SCRIPT = r"""
const XLSX = require(process.argv[2]);
const wb = XLSX.readFile(process.argv[3]);
const sheetRows = (name) => XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: null });

// 1. Categorias
const categorias = {};
sheetRows('BD CATEGORIA ITEM').slice(1).forEach(r => {
  if (r[0] && r[1]) categorias[String(r[0]).trim()] = String(r[1]).trim();
});

// 2. Materiales y Equipos
const materiales = [];
sheetRows('MATERIALES').slice(1).forEach(r => {
  const tipoRaw = String(r[0] || '').trim().toUpperCase();
  const cat = String(r[1] || '').trim().toUpperCase();
  const id = String(r[2] || '').trim();
  const desc = String(r[3] || r[4] || '').trim();
  const und = String(r[5] || '').trim();
  const pBase = Number(r[8]) || Number(r[10]) || 0;
  if (!desc || tipoRaw === 'GLOBALES') return;
  materiales.push({
    fuente: 'APEU',
    tipo_origen: tipoRaw === 'MAQUINARIA Y EQUIPOS' ? 'EQUIPO' : 'MATERIAL',
    categoria: cat,
    codigo_origen: id,
    descripcion: desc,
    unidad: und,
    precio_historico: pBase
  });
});

// 3. BD ITEM UNITARIO metadata
const itemMeta = {};
sheetRows('BD ITEM UNITARIO').slice(1).forEach(r => {
  if (r[1]) {
    itemMeta[String(r[1]).trim()] = {
      id_categoria: String(r[0] || '').trim(),
      categoria_nombre: categorias[String(r[0] || '').trim()] || String(r[0] || '').trim(),
      id_item: String(r[1]).trim(),
      descripcion: String(r[2] || r[1]).trim(),
      unidad: String(r[3] || 'UND').trim()
    };
  }
});

// 4. UNITARIOS (headers + component lines)
const uRows = sheetRows('UNITARIOS');
const unitariosMap = new Map();
let currentId = null;

for (let i = 1; i < uRows.length; i++) {
  const r = uRows[i];
  if (!r || !r.some(v => v !== null && String(v).trim() !== '')) continue;
  const c0 = String(r[0] || '').trim();
  const c1 = String(r[1] || '').trim();
  const c2 = String(r[2] || '').trim();
  const c3 = String(r[3] || '').trim();
  const c4 = String(r[4] || '').trim();
  const c5 = String(r[5] || '').trim();
  const cant = Number(r[6]) || 0;
  const vlrUnit = Number(r[7]) || 0;
  const vlrTotal = Number(r[8]) || 0;

  // Header row of an APU in UNITARIOS: no c1, no c2, has c0 and c5 (unit)
  if (!c1 && !c2 && c0 && c5) {
    currentId = c0;
    if (!unitariosMap.has(c0)) {
      const meta = itemMeta[c0] || {};
      unitariosMap.set(c0, {
        fuente: 'APEU',
        codigo_origen: c0,
        descripcion: meta.descripcion || c0,
        id_categoria: meta.id_categoria || '',
        categoria: meta.categoria_nombre || '',
        unidad: meta.unidad || c5,
        directo_historico: vlrTotal,
        lineas: []
      });
    }
    continue;
  }

  // Component line: has c3 (parent item ID)
  if (c3) {
    if (!unitariosMap.has(c3)) {
      const meta = itemMeta[c3] || {};
      unitariosMap.set(c3, {
        fuente: 'APEU',
        codigo_origen: c3,
        descripcion: meta.descripcion || c3,
        id_categoria: meta.id_categoria || c1,
        categoria: meta.categoria_nombre || c2,
        unidad: meta.unidad || 'UND',
        directo_historico: 0,
        lineas: []
      });
    }
    const parent = unitariosMap.get(c3);
    if (!parent.id_categoria && c1) parent.id_categoria = c1;
    if (!parent.categoria && c2) parent.categoria = categorias[c1] || c2;

    const idCompuesto = String(r[15] || '').trim() || null;
    const idMaterial = String(r[16] || '').trim() || null;
    const idEquipo = String(r[17] || '').trim() || null;
    const idMO = String(r[18] || '').trim() || null;
    const idHM = String(r[19] || '').trim() || null;
    const idDesp = String(r[20] || '').trim() || null;

    let tipoLinea = 'MATERIAL';
    if (idDesp || /^desperdicio/i.test(c4) || /^desperdicio/i.test(c0)) tipoLinea = 'DESPERDICIO';
    else if (idHM || /herramienta menor/i.test(c4) || /herramienta menor/i.test(c0)) tipoLinea = 'HERRAMIENTA_MENOR';
    else if (idMO || /^m de o/i.test(c4) || /^m de o/i.test(c0)) tipoLinea = 'MANO_OBRA';
    else if (idCompuesto) tipoLinea = 'SUB_APU';
    else if (idEquipo) tipoLinea = 'EQUIPO';

    parent.lineas.push({
      tipo_linea: tipoLinea,
      nombre_componente: c4 || c0,
      descripcion_fila: c0,
      unidad: c5,
      cantidad: cant,
      precio_historico: vlrUnit,
      parcial_historico: vlrTotal,
      ref_compuesto: idCompuesto,
      ref_material: idMaterial,
      ref_equipo: idEquipo,
      ref_mo: idMO
    });
  }
}

process.stdout.write(JSON.stringify({
  categorias,
  materiales,
  unitarios: [...unitariosMap.values()]
}));
"""


def extract_apeu():
    helper_js = os.path.join(SCRIPT_DIR, "extract_apeu_helper.cjs")
    tmp_apeu = os.path.join(DATA_DIR, "apeu_raw.json")
    subprocess.run(
        ["node", helper_js, F_APEU, tmp_apeu],
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=True,
    )
    with open(tmp_apeu, "r", encoding="utf-8") as f:
        return json.load(f)


def main():
    print("1/4 Extrayendo HOSPITAL CIVIL IPIALES 2026...")
    wb_hosp = openpyxl.load_workbook(F_HOSP, read_only=True, data_only=True)
    hosp_mat = parse_materiales_hosp_ric(rows_of(wb_hosp, "MATERIALES"), "HOSPITAL", False)
    hosp_eq = parse_equipos(rows_of(wb_hosp, "EQUIPOS"), "HOSPITAL")
    hosp_tr = parse_transportes(rows_of(wb_hosp, "TRASPORTES"), "HOSPITAL")
    hosp_bas = parse_basicos(rows_of(wb_hosp, "APU BASE"), "HOSPITAL")
    hosp_apus = parse_apu_blocks_3row(rows_of(wb_hosp, "APU O CIVL"), "HOSPITAL", "APU O CIVL")
    hosp_apus += parse_apu_blocks_3row(rows_of(wb_hosp, "APU EXTINCION"), "HOSPITAL", "APU EXTINCION")
    hosp_cuadro = parse_cuadro(rows_of(wb_hosp, "CUADRO PRESUPUESTO"), "HOSPITAL")
    wb_hosp.close()

    print("2/4 Evaluando fórmulas y extrayendo CASA RICAURTE DRIVE 2026...")
    ev_ric = WorkbookFormulaEvaluator(F_RIC)
    ric_mat = parse_materiales_hosp_ric(ev_ric.evaluated_rows("MATERIALES"), "RICAURTE", True)
    ric_eq = parse_equipos(ev_ric.evaluated_rows("EQUIPOS"), "RICAURTE")
    ric_tr = parse_transportes(ev_ric.evaluated_rows("TRASPORTES"), "RICAURTE")
    ric_bas = parse_basicos(ev_ric.evaluated_rows("APU BASE"), "RICAURTE")
    ric_apus = parse_apu_blocks_ricaurte(ev_ric.evaluated_rows("APU O CIVL"))
    ric_cuadro = parse_cuadro(ev_ric.evaluated_rows("CUADRO PRESUPUESTO"), "RICAURTE")

    print("3/4 Extrayendo REFERENCIA DETECCION Y EXTINCION RCI...")
    wb_det = openpyxl.load_workbook(F_DET, read_only=True, data_only=True)
    det_mat = parse_materiales_deteccion(rows_of(wb_det, "MATERIALES"))
    det_eq = parse_equipos(rows_of(wb_det, "EQUIPOS"), "DETECCION")
    det_tr = parse_transportes(rows_of(wb_det, "TRASPORTES"), "DETECCION")
    det_bas = parse_basicos(rows_of(wb_det, "APU BASE"), "DETECCION")
    det_apus_det = parse_apu_blocks_3row(rows_of(wb_det, "APU DETECCION"), "DETECCION", "APU DETECCION")
    det_apus_ext = parse_apu_blocks_3row(rows_of(wb_det, "APU EXTINCION"), "DETECCION", "APU EXTINCION")
    det_apus_civ = parse_apu_blocks_3row(rows_of(wb_det, "APU O CIVL"), "DETECCION", "APU O CIVL")
    det_cuadro = parse_cuadro(rows_of(wb_det, "CUADRO PRESUPUESTO"), "DETECCION")
    det_cuadro_det = parse_cuadro(rows_of(wb_det, "PRESUPUESTO DETECCION"), "DETECCION_ALARMA")
    wb_det.close()

    print("4/4 Extrayendo APEU 2026_BASE APP_FINAL.xls...")
    apeu = extract_apeu()

    payload = {
        "parametros_2026": {
            "smlv": 1750905,
            "auxilio_transporte": 200000,
            "horas_mes": 240,
            "horas_dia": 8,
            "fp_1_smlv": 1.77,
            "fp_1_5_smlv": 1.71,
            "fp_2_smlv": 1.68,
            "fp_profesional": 1.58,
            "factor_indexacion_apeu": round(1750905 / 1150000, 4),  # 1.5225
            "margen_kalarti": 0.15,
        },
        "hospital": {
            "materiales": hosp_mat,
            "equipos": hosp_eq,
            "transportes": hosp_tr,
            "basicos": hosp_bas,
            "apus": hosp_apus,
            "cuadro": hosp_cuadro,
        },
        "ricaurte": {
            "materiales": ric_mat,
            "equipos": ric_eq,
            "transportes": ric_tr,
            "basicos": ric_bas,
            "apus": ric_apus,
            "cuadro": ric_cuadro,
        },
        "deteccion": {
            "materiales": det_mat,
            "equipos": det_eq,
            "transportes": det_tr,
            "basicos": det_bas,
            "apus_deteccion": det_apus_det,
            "apus_extincion": det_apus_ext,
            "apus_civil": det_apus_civ,
            "cuadro": det_cuadro + det_cuadro_det,
        },
        "apeu": apeu,
    }

    out_file = os.path.join(DATA_DIR, "raw_sources.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=1)

    summary = {
        "HOSPITAL": {k: len(v) for k, v in payload["hospital"].items()},
        "RICAURTE": {k: len(v) for k, v in payload["ricaurte"].items()},
        "DETECCION": {k: len(v) for k, v in payload["deteccion"].items()},
        "APEU": {"materiales": len(apeu["materiales"]), "unitarios": len(apeu["unitarios"]), "categorias": len(apeu["categorias"])},
    }
    print("\nRESUMEN EXTRACCIÓN:")
    print(json.dumps(summary, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
