'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/StoreContext';
import { useAuth } from '@/lib/auth';

export default function ChatView() {
  const { state, dispatch } = useStore();
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [linkedProjectId, setLinkedProjectId] = useState('');
  const [linkedItemId, setLinkedItemId] = useState('');
  const scrollRef = useRef(null);

  // Sync session's linked project if available in DB
  useEffect(() => {
    if (selectedSession) {
      setLinkedProjectId(selectedSession.proyecto_id || '');
      // When session changes, reset item
      setLinkedItemId('');
    }
  }, [selectedSession]);

  const projectItems = useMemo(() => {
    if (!linkedProjectId) return [];
    return state.presupuestoItems.filter(pi => pi.proyecto_id === linkedProjectId);
  }, [linkedProjectId, state.presupuestoItems]);

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

  async function updateLinkedProject(projectId) {
    setLinkedProjectId(projectId);
    if (!selectedSession) return;
    
    const { error } = await supabase
      .from('chat_usuarios')
      .update({ proyecto_id: projectId || null })
      .eq('id', selectedSession.id);
    
    if (error) {
      console.error('Error actualizando proyecto vinculado:', error.message);
    } else {
      setSelectedSession({ ...selectedSession, proyecto_id: projectId });
    }
  }

  const handleAddToBitacora = (msg) => {
    if (!linkedProjectId) return alert('Primero vincula esta conversación a un proyecto.');
    if (!linkedItemId) return alert('Selecciona una actividad (APU) específica para registrar en la bitácora.');

    const confirm = window.confirm(`¿Deseas añadir este mensaje a la bitácora de la actividad?\n\n"${msg.mensaje}"`);
    if (!confirm) return;

    dispatch({
      type: 'ADD_NOTE',
      payload: {
        presupuesto_item_id: linkedItemId,
        texto: `💬 (De Chat ${selectedSession.nombre}): ${msg.mensaje}`,
        author_id: user?.id,
        author_name: user?.user_metadata?.nombre || 'Admin (Chat)',
        meta: { type: 'chat_import', chat_msg_id: msg.id }
      }
    });

    alert('✅ Mensaje añadido a la bitácora del proyecto.');
  };

  const handleAddToChecklist = (msg) => {
    if (!linkedProjectId) return alert('Primero vincula esta conversación a un proyecto.');
    if (!linkedItemId) return alert('Selecciona una actividad (APU) para añadir el ítem de checklist.');

    const confirm = window.confirm(`¿Deseas convertir este mensaje en un ítem de checklist?\n\n"${msg.mensaje}"`);
    if (!confirm) return;

    dispatch({
      type: 'ADD_CHECKLIST_ITEM',
      payload: {
        presupuesto_item_id: linkedItemId,
        texto: msg.mensaje,
        completado: false,
        estado_aprobacion: 'PENDIENTE',
        scope: 'RESUMEN'
      }
    });

    alert('✅ Ítem añadido al checklist de la actividad.');
  };

  const handleAddToAgenda = (msg) => {
    if (!linkedProjectId) return alert('Primero vincula esta conversación a un proyecto.');

    const confirm = window.confirm(`¿Deseas programar una tarea en la agenda basada en este mensaje?\n\n"${msg.mensaje}"`);
    if (!confirm) return;

    dispatch({
      type: 'ADD_AGENDA_ITEM',
      payload: {
        proyecto_id: linkedProjectId,
        presupuesto_item_id: linkedItemId || null,
        titulo: `Tarea desde Chat: ${msg.mensaje.substring(0, 30)}${msg.mensaje.length > 30 ? '...' : ''}`,
        descripcion: msg.mensaje,
        prioridad: 'media',
        fecha_programada: new Date().toISOString().split('T')[0]
      }
    });

    alert('✅ Tarea añadida a la Agenda del proyecto.');
  };

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
            <div style={{ padding: 'var(--space-md)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                  {(selectedSession.nombre || '?')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{selectedSession.nombre}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{selectedSession.email || 'Sin email vinculado'}</div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-tertiary)', marginBottom: 2 }}>VINCULAR PROYECTO</div>
                  <select 
                    value={linkedProjectId} 
                    onChange={(e) => updateLinkedProject(e.target.value)}
                    style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid var(--color-border)', fontSize: 12, width: 180 }}
                  >
                    <option value="">-- No vinculado --</option>
                    {state.proyectos.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>

                {linkedProjectId && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-tertiary)', marginBottom: 2 }}>ACTIVIDAD DESTINO</div>
                    <select 
                      value={linkedItemId} 
                      onChange={(e) => setLinkedItemId(e.target.value)}
                      style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid var(--color-border)', fontSize: 12, width: 200 }}
                    >
                      <option value="">-- Seleccionar actividad --</option>
                      {projectItems.map(pi => (
                        <option key={pi.id} value={pi.id}>{pi.nombre}</option>
                      ))}
                    </select>
                  </div>
                )}
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
                    className="chat-message-container"
                    style={{ 
                      alignSelf: isBot ? 'flex-start' : 'flex-end',
                      maxWidth: '70%',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <div style={{ 
                      padding: '10px 14px',
                      borderRadius: isBot ? '4px 16px 16px 16px' : '16px 16px 4px 16px',
                      background: isBot ? 'var(--color-bg-secondary)' : 'var(--color-accent)',
                      color: isBot ? 'var(--color-text)' : '#fff',
                      boxShadow: 'var(--shadow-sm)',
                      fontSize: 13,
                      lineHeight: 1.5,
                      position: 'relative'
                    }}>
                      {m.mensaje || m.texto}
                      <div style={{ fontSize: 9, opacity: 0.7, marginTop: 4, textAlign: 'right' }}>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>

                      {/* Botones de acción contextual (se muestran al hover si el proyecto está vinculado) */}
                      {!isBot && linkedProjectId && (
                        <div className="message-actions" style={{ 
                          position: 'absolute', 
                          left: -45, 
                          top: 0, 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: 4,
                          opacity: 0.8
                        }}>
                          <button 
                            onClick={() => handleAddToBitacora(m)}
                            title="Añadir a Bitácora del proyecto"
                            style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--color-bg)', border: '1px solid var(--color-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}
                          >
                            📌
                          </button>
                          <button 
                            onClick={() => handleAddToChecklist(m)}
                            title="Añadir como ítem de Checklist"
                            style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--color-bg)', border: '1px solid var(--color-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}
                          >
                            ✅
                          </button>
                          <button 
                            onClick={() => handleAddToAgenda(m)}
                            title="Añadir a la Agenda del proyecto"
                            style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--color-bg)', border: '1px solid var(--color-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}
                          >
                            📅
                          </button>
                        </div>
                      )}
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
