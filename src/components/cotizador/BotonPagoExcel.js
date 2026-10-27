'use client';

import { useState } from 'react';

export default function BotonPagoExcel({
  cotizacionId,
  userEmail,
  userId,
  tipoProducto = 'EXPORTAR_EXCEL',
  label = '📊 Pagar y Descargar Excel con PSE / Tarjeta',
  className = 'btn-action-primary',
  style,
}) {
  const [cargando, setCargando] = useState(false);

  const handlePagar = async () => {
    try {
      setCargando(true);
      const res = await fetch('/api/pagos/mercadopago/preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipoProducto,
          referenciaId: cotizacionId,
          userEmail,
          userId,
        }),
      });

      const data = await res.json();

      if (data.init_point) {
        // Redirige al checkout oficial de Mercado Pago (PSE, Tarjetas, Nequi, etc.)
        window.location.href = data.init_point;
      } else {
        alert(data.error || 'No se pudo iniciar el proceso de pago.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión con la pasarela de pago.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handlePagar}
      disabled={cargando}
      className={className}
      style={style || { padding: '10px 16px', fontSize: 13, flexShrink: 0 }}
    >
      {cargando ? 'Conectando con pasarela...' : label}
    </button>
  );
}
