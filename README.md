# 🏗️ Kalarti ERP — Ecosistema Integral de Construcción

Plataforma unificada para gestión de obras civiles, presupuestación paramétrica APU, visor BIM 3D/4D/5D, red logística distribuida de abastecimiento, Marketplace ferretero y contratos B2B con cuadrillas.

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

## 🗺️ Mapa de Rutas Principales

| Ruta | Descripción | Acceso |
|---|---|---|
| `/` | Landing page principal del ecosistema Kalarti | Público |
| `/erp` | SPA central del ERP: APUs, presupuestos, obras, finanzas, nómina y BIM | Requiere Login |
| `/cotizador` | Cotizador paramétrico de proyectos de vivienda y exportación a Excel | Público / Pago |
| `/marketplace` | Tienda de materiales y ferreterías con checkout integrado | Público |
| `/propiedades` | Catálogo inmobiliario de proyectos y lotes | Público |
| `/mi-portal` | Portal de autoservicio para profesionales independientes de la Red de Talento | Público / Registro |
| `/planes` | Tiers de suscripción SaaS con pasarela Mercado Pago | Público |
| `/proveedores` | Portal de registro para distribuidores y ferreterías | Público |
| `/unete` | Portal de convocatorias públicas para cuadrillas y maestros de obra | Público |

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
