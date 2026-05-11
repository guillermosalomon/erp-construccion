'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export default function ChatView() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (selectedSession) {
      loadMessages(selectedSession.id);
    }
  }, [selectedSession]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function loadSessions() {
    setLoading(true);
    const { data, error } = await supabase
      .from('chat_usuarios')
      .select('*')
      .order('ultimo_contacto', { ascending: false });
    
    if (data) setSessions(data);
    setLoading(false);
  }

  async function loadMessages(chatUserId) {
    const { data } = await supabase
      .from('chat_mensajes')
      .select('*')
      .eq('chat_usuario_id', chatUserId)
      .order('created_at', { ascending: true });
    
    if (data) setMessages(data);
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
      {/* Sidebar de Sesiones */}
      <div style={{ width: 300, borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)' }}>
        <div style={{ padding: 'var(--space-md)', borderBottom: '1px solid var(--color-border)', fontWeight: 700 }}>
          Conversaciones Bot
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {sessions.map(s => (
            <div 
              key={s.id} 
              onClick={() => setSelectedSession(s)}
              style={{ 
                padding: 'var(--space-md)', 
                borderBottom: '1px solid var(--color-border)', 
                cursor: 'pointer',
                background: selectedSession?.id === s.id ? 'var(--color-bg-secondary)' : 'transparent',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13 }}>{s.nombre || 'Usuario Desconocido'}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                {s.ultimo_contacto ? new Date(s.ultimo_contacto).toLocaleString() : 'Sin fecha'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Área de Chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--color-bg)' }}>
        {selectedSession ? (
          <>
            <div style={{ padding: 'var(--space-md)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                {(selectedSession.nombre || '?')[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{selectedSession.nombre}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{selectedSession.email || 'Sin email vinculado'}</div>
              </div>
            </div>
            <div 
              ref={scrollRef}
              style={{ flex: 1, padding: 'var(--space-lg)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              {messages.map(m => {
                const isBot = m.direccion === 'out';
                return (
                  <div 
                    key={m.id} 
                    style={{ 
                      alignSelf: isBot ? 'flex-start' : 'flex-end',
                      maxWidth: '70%',
                      padding: '10px 14px',
                      borderRadius: isBot ? '4px 16px 16px 16px' : '16px 16px 4px 16px',
                      background: isBot ? 'var(--color-bg-secondary)' : 'var(--color-accent)',
                      color: isBot ? 'var(--color-text)' : '#fff',
                      boxShadow: 'var(--shadow-sm)',
                      fontSize: 13,
                      lineHeight: 1.5
                    }}
                  >
                    {m.texto}
                    <div style={{ fontSize: 9, opacity: 0.7, marginTop: 4, textAlign: 'right' }}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)' }}>
            Selecciona una conversación para ver el historial
          </div>
        )}
      </div>
    </div>
  );
}
