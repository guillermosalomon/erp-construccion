import { PRODUCTOS, PLAN_FEATURES, formatMoney, APU_COUNT_LABEL } from '@/lib/cotizador/config';

export { PRODUCTOS, PLAN_FEATURES, formatMoney, APU_COUNT_LABEL };

export const MAPA_TIPO_PRODUCTO_MP = {
  export: 'EXPORTAR_EXCEL',
  mensual: 'PLAN_SUSCRIPCION_MENSUAL',
  semestral: 'PLAN_SUSCRIPCION_SEMESTRAL',
  anual: 'PLAN_SUSCRIPCION_ANUAL',
};

export const PLANES_CONSTRUCTORAS = [
  {
    key: 'mensual',
    ...PRODUCTOS.mensual,
    tipoProductoMP: MAPA_TIPO_PRODUCTO_MP.mensual,
    badge: 'Ideal para obra puntual',
    beneficios: [
      ...(PLAN_FEATURES.mensual || []),
      'Acceso al directorio de la Red de Profesionales y Cuadrillas Kalarti',
      'Desbloqueo de contacto directo de profesionales verificados',
    ],
  },
  {
    key: 'semestral',
    ...PRODUCTOS.semestral,
    tipoProductoMP: MAPA_TIPO_PRODUCTO_MP.semestral,
    badge: 'Ahorra 16%',
    beneficios: [
      ...(PLAN_FEATURES.semestral || []),
      'Contratación en 1 clic desde Equipo y Roles del proyecto',
      'Publicación de convocatorias de obra y licitaciones',
      'Subcontratación de cuadrillas con capacidad ociosa',
    ],
  },
  {
    key: 'anual',
    ...PRODUCTOS.anual,
    tipoProductoMP: MAPA_TIPO_PRODUCTO_MP.anual,
    badge: '⭐ Más Popular · Constructoras',
    beneficios: [
      ...(PLAN_FEATURES.anual || []),
      'Edición completa de APUs y rendimientos propios',
      'Publicación ilimitada de convocatorias y licitaciones',
      'Oferta y subcontratación B2B de cuadrillas entre constructoras',
      'Soporte prioritario BIM 5D y NSR-10',
    ],
  },
];
