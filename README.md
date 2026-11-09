# 🏗️ Kalarti ERP — Ecosistema Integral de Construcción y Bienes Raíces

Plataforma unificada para gestión de obras civiles, presupuestación paramétrica APU, visor BIM 3D/4D/5D, red logística distribuida de abastecimiento, Marketplace ferretero, gestión inmobiliaria sincronizada en tiempo real y ecosistema de marketing Geo-SEO.

> 📖 **Para la documentación técnica completa, fórmulas matemáticas, políticas de seguridad RLS y especificación del sistema, consulta el documento maestro:**  
> 👉 [**DOCUMENTACION_SISTEMA.md**](./DOCUMENTACION_SISTEMA.md)

---

## 🚀 Inicio Rápido (Desarrollo Local)

### 1. Requisitos Previos
- **Node.js** v20.x o superior
- **npm** v10.x o superior
- Archivo `.env.local` configurado con las credenciales del proyecto Supabase.

### 2. Instalación de Dependencias
```bash
npm install
```

### 3. Ejecución del Servidor Web (Next.js)
```bash
npm run dev
```
Abre [http://localhost:3000](http://localhost:3000) en tu navegador para interactuar con la plataforma.

### 4. Ejecución del Bot de Telegram (Kalarti Copilot)
El bot conversacional opera como un servicio Node.js independiente:
```bash
cd telegram-bot
node bot.js
```

---

## 🗺️ Mapa de Rutas del Ecosistema

### 1. Plataforma Central, Afiliación y Comercio
| Ruta | Descripción | Acceso |
|---|---|---|
| `/` | Hub principal del ecosistema Kalarti (Construcción, Bienes Raíces y Marketplace) | Público |
| `/erp` | SPA central del ERP: APUs, presupuestos, obras, finanzas, nómina, inmuebles y BIM | Requiere Login |
| `/registro` | Gateway de Registro Unificado (5 perfiles: Profesional, Constructor, Comercio/Proveedor, Inmueble y Cliente) | Público |
| `/mi-portal` | Portal privado de autoservicio para profesionales de la Red de Talento, propietarios e inmobiliarias | Requiere Login |
| `/cotizador` | Cotizador paramétrico de obra gratis (+400 APUs verificados) y exportación a Excel | Público / Pago |
| `/planes` | Planes y suscripciones SaaS para constructoras y contratistas con pasarela Mercado Pago | Público |
| `/unete` | Manual y vinculación para profesionales, ingenieros, arquitectos, maestros y cuadrillas de obra | Público |
| `/proveedores` | Portal de afiliación B2B para fabricantes, distribuidores y proveedores de insumos | Público |
| `/comercio` | Activación de Comercio y sistema POS ferretero multi-bodega conectado al Marketplace | Público |
| `/publicar-inmueble` | Consignación inmobiliaria bajo dos regímenes: Propietario Particular (3%) e Inmobiliaria con CRM (0.3%) | Público |
| `/marketplace` | Tienda B2B/B2C de materiales de construcción y ferreterías afiliadas | Público |
| `/marketplace/checkout` | Pasarela de pago y despacho de órdenes del Marketplace | Público |
| `/marketplace/pedido/[id]` | Trazabilidad y estado en tiempo real de pedidos del Marketplace | Público |
| `/propiedades` | Catálogo público de proyectos inmobiliarios, casas, lotes y apartamentos en venta | Público |
| `/propiedades/[slug]` | Ficha técnica interactiva de cada inmueble sincronizada en tiempo real con el módulo ERP | Público |
| `/privacidad` | Política de Privacidad, Tratamiento de Datos Personales (Ley 1581 de 2012 - Habeas Data) y Cookies | Público |

### 2. Blog Técnico & Editorial
| Ruta | Descripción | Acceso |
|---|---|---|
| `/blog` | Portal editorial de ingeniería, arquitectura, bio-construcción y normativa técnica | Público |
| `/blog/[slug]` | Artículos técnicos especializados y casos de estudio | Público |
| `/blog/categoria/hidraulica-sig` | Categoría: Hidráulica, SIG & Territorio | Público |
| `/blog/categoria/bim-mep` | Categoría: BIM Interdisciplinario & Coordinación MEP | Público |
| `/blog/categoria/bioconstruccion` | Categoría: Bio-Construcción & Arquitectura Sostenible | Público |
| `/blog/categoria/normativa-riesgo` | Categoría: Normativa & Gestión del Riesgo | Público |

### 3. Landings de Servicios y Marketing Geo-SEO (Colombia & Internacional)
| Ruta | Descripción | Alcance |
|---|---|---|
| `/landing/construccion` | Landing general de servicios: Vivienda, Cálculo NSR-10, BIM 5D, Vías, Redes HDS/RCI, Obras Civiles, Guadua y PMA Ambiental | Nacional |
| `/landing/bioconstruccion` | Landing especializada en Bio-Construcción y estructuras en Guadua Angustifolia | Nacional |
| `/landing/plan-de-manejo-ambiental-barranquilla` | Plan de Manejo Ambiental (PMA), gestión de RCD, hidrología de arroyos y trámites ante EPA Barranquilla Verde, CRA y ANLA | Barranquilla y Atlántico |
| `/landing/calculo-estructural-bogota` | Cálculo estructural NSR-10, vulnerabilidad sísmica y licencias en Curadurías Urbanas | Bogotá y La Sabana |
| `/landing/diseno-arquitectonico-medellin` | Diseño arquitectónico en ladera, patología post-sismo y coordinación BIM 5D | Medellín y Oriente Antioqueño |
| `/landing/construccion-residencial-cali` | Construcción de casas campestres, arquitectura bioclimática y cálculo estructural NSR-10 | Cali y Valle del Cauca |
| `/landing/diseno-estructural-pasto-narino` | Evaluación de vulnerabilidad sísmica post-sismo, cálculo estructural y BIM 5D | Pasto y Nariño |
| `/landing/bio-construccion-guadua-eje-cafetero` | Bio-construcción en Guadua certificada, eco-hoteles, glampings y arquitectura sostenible | Eje Cafetero |
| `/landing/diseno-arquitectonico-costa-rica` | Diseño arquitectónico tropical de lujo, interiores, paisajismo biofílico y BIM Management | Costa Rica |
| `/landing/diseno-estructural-panama` | Diseño arquitectónico residencial/comercial, interiorismo corporativo, paisajismo y BIM 5D | Panamá |
| `/landing/diseno-arquitectonico-mexico` | Arquitectura Eco-Luxury, bio-construcción, interiorismo chukum y coordinación BIM 5D | Riviera Maya y México |

---

## 🛠️ Stack Tecnológico

- **Frontend & Routing:** Next.js 16.2.4 (App Router), React 19.2.4, CSS Modular.
- **Base de Datos & Auth:** Supabase PostgreSQL con Row Level Security (RLS) multi-tenant.
- **BIM 3D/4D/5D:** `@thatopen/components`, Three.js, Web-IFC WASM.
- **Pagos & Suscripciones:** Mercado Pago Checkout Pro (Webhooks idempotentes).
- **Inteligencia Artificial:** Google Gemini 2.5 Flash (Parseo visual de facturas/remisiones).
- **Reportes & Exportación:** `jspdf`, `jspdf-autotable`, `exceljs`.
- **Escaner QR / Barras:** `@zxing/library`, `react-zxing`.
- **Asistente Conversacional:** `node-telegram-bot-api` con Gemini AI.

---

## 🧪 Validación y Compilación

Para compilar la aplicación para producción:
```bash
npm run build
```

Para análisis de reglas de código y ESLint:
```bash
npx eslint src/
```

Para más detalles, consulta [DOCUMENTACION_SISTEMA.md](./DOCUMENTACION_SISTEMA.md).
