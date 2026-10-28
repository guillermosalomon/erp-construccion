'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function ConvocatoriasPublicasList() {
  const [ofertas, setOfertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroMunicipio, setFiltroMunicipio] = useState('');

  useEffect(() => {
    async function load() {
      if (!supabase) {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('v_convocatorias_publicas')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);
        if (!error && data) {
          setOfertas(data);
        } else {
          const { data: raw } = await supabase
            .from('convocatorias_ofertas')
            .select('*')
            .eq('activa', true)
            .order('created_at', { ascending: false })
            .limit(20);
          setOfertas(raw || []);
        }
      } catch {
        setOfertas([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtradas = ofertas.filter(
    (o) => !filtroMunicipio || (o.municipio || '').toLowerCase().includes(filtroMunicipio.toLowerCase())
  );

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div>
          <h3 style={{ color: '#f8fafc', fontSize: 20, fontWeight: 800, margin: 0 }}>
            📋 Convocatorias y Licitaciones Activas
          </h3>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: '4px 0 0' }}>
            Oportunidades publicadas directamente desde proyectos activos en el ERP Kalarti.
          </p>
        </div>
        <input
          type="text"
          value={filtroMunicipio}
          onChange={(e) => setFiltroMunicipio(e.target.value)}
          placeholder="Filtrar por municipio (ej. Pasto, Ipiales)..."
          style={{
            background: '#0f172a',
            border: '1px solid #334155',
            color: '#f8fafc',
            borderRadius: 8,
            padding: '8px 14px',
            fontSize: 13,
            minWidth: 260,
          }}
        />
      </div>

      {loading ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', background: 'rgba(15,23,42,0.6)', borderRadius: 12 }}>
          Cargando convocatorias activas...
        </div>
      ) : filtradas.length === 0 ? (
        <div
          style={{
            padding: 28,
            textAlign: 'center',
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px dashed rgba(56, 189, 248, 0.3)',
            borderRadius: 14,
            color: '#cbd5e1',
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>👷‍♂️</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
            Regístrate en la Red de Talento para recibir alertas prioritarias de nuevas obras
          </div>
          <p style={{ fontSize: 13, color: '#94a3b8', maxWidth: 520, margin: '0 auto 16px' }}>
            Las constructoras buscan diariamente maestros, oficiales, ingenieros, arquitectos y cuadrillas verificadas por municipio.
          </p>
          <Link
            href="/registro?tipo=profesional"
            style={{
              display: 'inline-block',
              background: '#38bdf8',
              color: '#0f172a',
              fontWeight: 800,
              fontSize: 13,
              padding: '10px 20px',
              borderRadius: 8,
              textDecoration: 'none',
            }}
          >
            Crear mi Perfil Profesional Gratis ➔
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filtradas.map((of) => (
            <div
              key={of.id}
              style={{
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: 12,
                padding: 18,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', background: 'rgba(56,189,248,0.12)', padding: '2px 8px', borderRadius: 999 }}>
                    📍 {of.municipio || 'Colombia'}
                  </span>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>
                    {of.tipo_contrato || 'Obra o Labor'}
                  </span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#f8fafc', marginBottom: 4 }}>
                  {of.titulo}
                </div>
                {of.cargo_nombre && (
                  <div style={{ fontSize: 12, color: '#d4af37', fontWeight: 600, marginBottom: 6 }}>
                    Especialidad: {of.cargo_nombre}
                  </div>
                )}
                {of.salario_rango && (
                  <div style={{ fontSize: 12, color: '#10b981', fontWeight: 700, marginBottom: 6 }}>
                    💰 {of.salario_rango}
                  </div>
                )}
                {of.descripcion && (
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                    {of.descripcion}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  Vacantes: {of.vacantes || 1}
                </span>
                <Link
                  href={`/mi-portal?convocatoria=${of.id}`}
                  style={{
                    background: '#38bdf8',
                    color: '#0f172a',
                    fontWeight: 800,
                    fontSize: 12,
                    padding: '6px 14px',
                    borderRadius: 6,
                    textDecoration: 'none',
                  }}
                >
                  Postularme ➔
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
