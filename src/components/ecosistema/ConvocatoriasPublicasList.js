'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function ConvocatoriasPublicasList() {
  const [ofertas, setOfertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroMunicipio, setFiltroMunicipio] = useState('');

  useEffect(() => {
    let active = true;
    async function cargar() {
      if (!supabase) {
        setLoading(false);
        return;
      }
      try {
        let res = await supabase
          .from('v_convocatorias_publicas')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);

        if (res.error) {
          res = await supabase
            .from('convocatorias_ofertas')
            .select('*, cargos(nombre, codigo), proyectos(nombre)')
            .eq('activa', true)
            .order('created_at', { ascending: false })
            .limit(20);
        }

        if (active && !res.error && Array.isArray(res.data)) {
          setOfertas(res.data);
        }
      } catch {
        // Tabla aún no migrada
      } finally {
        if (active) setLoading(false);
      }
    }
    cargar();
    return () => {
      active = false;
    };
  }, []);

  const municipios = Array.from(new Set(ofertas.map((o) => o.municipio).filter(Boolean)));
  const filtradas = ofertas.filter((o) => !filtroMunicipio || o.municipio === filtroMunicipio);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div style={{ fontSize: 13, color: '#475569' }}>
          Convocatorias activas publicadas por constructoras en el ERP ({filtradas.length})
        </div>

        {municipios.length > 0 && (
          <select
            value={filtroMunicipio}
            onChange={(e) => setFiltroMunicipio(e.target.value)}
            style={{
              background: '#ffffff',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              borderRadius: 4,
              padding: '7px 12px',
              fontSize: 13,
            }}
          >
            <option value="">Todos los municipios</option>
            {municipios.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div style={{ padding: 24, border: '1px solid #e2e8f0', borderRadius: 4, color: '#64748b', fontSize: 13 }}>
          Consultando convocatorias de obra...
        </div>
      ) : filtradas.length === 0 ? (
        <div style={{ padding: 24, border: '1px solid #e2e8f0', borderRadius: 4, background: '#f8fafc' }}>
          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14, marginBottom: 6 }}>
            Recepción permanente de hojas de vida y cuadrillas
          </div>
          <p style={{ color: '#475569', fontSize: 13.5, margin: '0 0 14px 0' }}>
            Al completar su registro y activar su disponibilidad en la Red de Talento, las constructoras podrán
            convocarlo directamente desde el módulo de programación de obra.
          </p>
          <Link
            href="/registro?tipo=profesional"
            style={{
              display: 'inline-block',
              background: '#0f172a',
              color: '#ffffff',
              fontWeight: 600,
              padding: '8px 16px',
              borderRadius: 4,
              textDecoration: 'none',
              fontSize: 13,
            }}
          >
            Registrar Perfil Profesional ➔
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 16 }}>
          {filtradas.map((of) => {
            const cargoNombre = of.cargo_nombre || of.cargos?.nombre || 'Especialidad de Obra';
            const empresa = of.empresa_nombre || 'Constructora Verificada';
            return (
              <div
                key={of.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 4,
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>
                    {of.municipio || 'Pasto'} — {cargoNombre}
                  </div>
                  <h4 style={{ color: '#0f172a', fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>{of.titulo}</h4>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                    {empresa} {of.tipo_contrato ? `· ${of.tipo_contrato}` : ''}
                  </div>
                  {of.descripcion && (
                    <p style={{ color: '#334155', fontSize: 13, margin: '0 0 8px' }}>{of.descripcion}</p>
                  )}
                  {of.salario_rango && (
                    <div style={{ fontSize: 12.5, color: '#0f172a', fontWeight: 700 }}>
                      Honorarios / Rango: {of.salario_rango}
                    </div>
                  )}
                </div>

                <Link
                  href={`/registro?tipo=profesional&oferta=${of.id}`}
                  style={{
                    display: 'inline-block',
                    textAlign: 'center',
                    background: '#0f172a',
                    color: '#ffffff',
                    padding: '8px 12px',
                    borderRadius: 4,
                    fontWeight: 600,
                    fontSize: 12.5,
                    textDecoration: 'none',
                  }}
                >
                  Postularme a esta vacante ➔
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
