"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function IACriptoPage() {
  const [status, setStatus] = useState('DESCONECTADO');
  const [data, setData] = useState({
    prices: { BTCUSDT: 0, ETHUSDT: 0, SOLUSDT: 0 },
    obi: {},
    orderbook: {},
    whale_summaries: {},
    whale_recent: [],
    lead_lag: {},
    buffer_status: {},
    queue_stats: {},
    active_positions: {},
    active_grids: {},
    closed_trades: [],
    projections: {},
    news: [],
    news_sentiment: { score: 0.0, label: 'NEUTRAL' },
    circuit_breaker: { active: false },
    bollinger: {},
    institutional_levels: {},
    erp_summary: { net_pnl: 0.0, total_trades: 0, win_rate: 0.0 },
    dca_status: { spent_this_month: 0.0, monthly_budget: 1000.0, purchases_this_month: 0, max_purchases_per_month: 10 }
  });
  const [consoleLines, setConsoleLines] = useState([
    { time: '--:--:--', type: 'info', message: 'Esperando señal de telemetría local...' }
  ]);

  useEffect(() => {
    if (!supabase) {
      console.warn("Supabase no configurado");
      setStatus('ERROR DE CONFIGURACION');
      return;
    }

    setStatus('CONECTANDO A SUPABASE...');

    // Suscribirse al canal Realtime Broadcast 'ia-telemetry'
    const channel = supabase.channel('ia-telemetry')
      .on('broadcast', { event: 'telemetry-update' }, (payload) => {
        setStatus('CONECTADO');
        if (payload && payload.payload) {
          const msg = payload.payload;
          
          // 1. Si es telemetría consolidada, actualizar estados de gráficos y tickers
          if (msg.type === 'telemetry' && msg.data) {
            setData(prev => ({
              ...prev,
              ...msg.data
            }));

            // Inicializar historial de consola si es la primera carga
            if (msg.data.ai_console_history && msg.data.ai_console_history.length > 0) {
              setConsoleLines(prev => {
                if (prev.length <= 1 && prev[0].message.includes('Esperando')) {
                  const historyLines = [];
                  const sortedHistory = [...msg.data.ai_console_history];
                  
                  // Procesar de mas viejo a mas nuevo para la consola
                  for (const aiEvent of sortedHistory) {
                    if (aiEvent.data && aiEvent.data.content) {
                      const model = aiEvent.data.model || '?';
                      const tokens = aiEvent.data.tokens || 0;
                      const elapsed = aiEvent.data.elapsed_seconds ? aiEvent.data.elapsed_seconds.toFixed(1) : '0';
                      const tps = tokens > 0 && aiEvent.data.elapsed_seconds > 0 ? (tokens / aiEvent.data.elapsed_seconds).toFixed(0) : '0';
                      const headerMsg = `[IA] ${model} | ${tokens} tok | ${elapsed}s (${tps} t/s)`;
                      
                      historyLines.push({ time: '--:--:--', type: 'info', message: headerMsg });
                      
                      const subLines = aiEvent.data.content.trim().split('\n');
                      for (const sub of subLines) {
                        let t = sub.trim();
                        if (!t) continue;
                        t = t.replace(/[^\x20-\x7E\u00A0-\u00FF\u0100-\u024F]/g, '').trim();
                        if (!t || t.length < 3) continue;
                        if (/^[-=_~.*#]{4,}$/.test(t)) continue;
                        
                        let type = 'info';
                        if (t.includes('LONG') || t.includes('BUY') || t.includes('ALCISTA') || t.includes('GRID DESPLEGADO')) {
                          type = 'signal';
                        } else if (t.includes('SHORT') || t.includes('SELL') || t.includes('BAJISTA') || t.includes('STOP-LOSS') || t.includes('RIESGO')) {
                          type = 'error';
                        } else if (t.includes('NEUTRAL') || t.includes('HOLD') || t.includes('CIERRE') || t.includes('CANCELADO')) {
                          type = 'whale';
                        } else if (t.includes('DCA') || t.includes('OPORTUNIDAD')) {
                          type = 'signal';
                        } else if (t.includes('NOTICIAS') || t.includes('NEWS')) {
                          type = 'whale';
                        }
                        historyLines.push({ time: '--:--:--', type, message: t });
                      }
                    }
                  }
                  // Revertir para que los mas nuevos queden arriba
                  return historyLines.reverse().slice(0, 100);
                }
                return prev;
              });
            }
          }
          
          // 2. Si es respuesta interactiva de la IA (inferencia, riesgo, señal)
          else if (msg.type === 'ai_response' && msg.data) {
            processAIResponseInWeb(msg.data);
          }
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setStatus('CONECTADO (ESPERANDO TELEMETRIA)');
        } else {
          setStatus('DESCONECTADO (' + status + ')');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Escuchar si hay actualizaciones en el payload que deban empujar logs a la consola
  useEffect(() => {
    // Si hay un cambio en las noticias o sentiment, loguear
    if (data.news && data.news.length > 0) {
      const latestNews = data.news[0];
      const timeStr = new Date().toLocaleTimeString('es-CO');
      setConsoleLines(prev => {
        // Evitar duplicar
        if (prev.some(l => l.message.includes(latestNews.title))) return prev;
        const newLines = [{
          time: timeStr,
          type: 'whale',
          message: '[NOTICIA] ' + latestNews.title + ' (Sentimiento: ' + (latestNews.sentiment || 'NEUTRAL') + ')'
        }, ...prev];
        return newLines.slice(0, 100);
      });
    }
  }, [data.news]);

  useEffect(() => {
    // Si hay cambios en los bloques detectados
    const timeStr = new Date().toLocaleTimeString('es-CO');
    const symbols = Object.keys(data.institutional_levels || {});
    symbols.forEach(sym => {
      const levels = data.institutional_levels[sym] || [];
      if (levels.length > 0) {
        const lastLvl = levels[levels.length - 1];
        setConsoleLines(prev => {
          const msg = '[BLOCK] ' + sym + ' - Nivel institucional detectado @ $' + lastLvl.price.toLocaleString();
          if (prev.some(l => l.message === msg)) return prev;
          return [{ time: timeStr, type: 'signal', message: msg }, ...prev].slice(0, 100);
        });
      }
    });
  }, [data.institutional_levels]);

  const processAIResponseInWeb = (aiData) => {
    if (!aiData || !aiData.content) return;

    const timeStr = new Date().toLocaleTimeString('es-CO');
    const model = aiData.model || '?';
    const tokens = aiData.tokens || 0;
    const elapsed = aiData.elapsed_seconds ? aiData.elapsed_seconds.toFixed(1) : '0';
    const tps = tokens > 0 && aiData.elapsed_seconds > 0 ? (tokens / aiData.elapsed_seconds).toFixed(0) : '0';
    const headerMsg = `[IA] ${model} | ${tokens} tok | ${elapsed}s (${tps} t/s)`;
    
    const lines = aiData.content.trim().split('\n');
    const newLines = [];
    
    for (const line of lines) {
      let t = line.trim();
      if (!t) continue;

      t = t.replace(/[^\x20-\x7E\u00A0-\u00FF\u0100-\u024F]/g, '').trim();
      if (!t || t.length < 3) continue;
      if (/^[-=_~.*#]{4,}$/.test(t)) continue;

      let type = 'info';
      if (t.includes('LONG') || t.includes('BUY') || t.includes('ALCISTA') || t.includes('GRID DESPLEGADO')) {
        type = 'signal';
      } else if (t.includes('SHORT') || t.includes('SELL') || t.includes('BAJISTA') || t.includes('STOP-LOSS') || t.includes('RIESGO')) {
        type = 'error';
      } else if (t.includes('NEUTRAL') || t.includes('HOLD') || t.includes('CIERRE') || t.includes('CANCELADO')) {
        type = 'whale';
      } else if (t.includes('DCA') || t.includes('OPORTUNIDAD')) {
        type = 'signal';
      } else if (t.includes('NOTICIAS') || t.includes('NEWS')) {
        type = 'whale';
      }
      
      newLines.push({ time: timeStr, type, message: t });
    }

    setConsoleLines(prev => [
      ...newLines,
      { time: timeStr, type: 'info', message: headerMsg },
      ...prev
    ].slice(0, 100));
  };

  const addConsoleLine = (message, type = 'info') => {
    const timeStr = new Date().toLocaleTimeString('es-CO');
    setConsoleLines(prev => [
      { time: timeStr, type, message },
      ...prev
    ].slice(0, 100));
  };

  const getSentimentClass = (label) => {
    if (!label) return 'neutral';
    if (label.includes('BULL') || label.includes('GREED') || label.includes('ALCISTA')) return 'positive';
    if (label.includes('BEAR') || label.includes('FEAR') || label.includes('BAJISTA')) return 'negative';
    return 'neutral';
  };

  const getEnergyClass = (energy) => {
    if (energy === 'RELEASING') return 'energy-releasing';
    if (energy === 'CHARGING') return 'energy-charging';
    return 'energy-neutral';
  };

  return (
    <div className="ia-cripto-container">
      {/* Estilos encapsulados con Responsividad Garantizada */}
      <style dangerouslySetInnerHTML={{ __html: `
        .ia-cripto-container {
          background: #060b13;
          color: #e2e8f0;
          font-family: 'Inter', -apple-system, sans-serif;
          min-height: 100vh;
          padding: 20px;
          box-sizing: border-box;
        }

        /* ── Header ── */
        .ia-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #1a2436;
          padding-bottom: 15px;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 15px;
        }
        .ia-title-area h1 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: 0.5px;
          color: #00d4ff;
          text-shadow: 0 0 10px rgba(0, 212, 255, 0.2);
        }
        .ia-title-area p {
          margin: 5px 0 0 0;
          font-size: 0.8rem;
          color: #64748b;
        }
        .ia-status-badge {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: 4px;
          background: rgba(0, 212, 255, 0.1);
          color: #00d4ff;
          border: 1px solid rgba(0, 212, 255, 0.2);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .status-dot {
          width: 8px;
          height: 8px;
          background: #00d4ff;
          border-radius: 50%;
          display: inline-block;
          box-shadow: 0 0 8px #00d4ff;
        }
        .status-dot.active {
          animation: status-pulse 1.5s infinite;
        }
        @keyframes status-pulse {
          0% { opacity: 0.3; }
          50% { opacity: 1; }
          100% { opacity: 0.3; }
        }

        /* ── Tickers ── */
        .tickers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }
        .ticker-card {
          background: rgba(13, 20, 33, 0.7);
          border: 1px solid #1a2436;
          border-radius: 6px;
          padding: 15px;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }
        .ticker-card::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #00d4ff, transparent);
        }
        .ticker-sym {
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748b;
          margin-bottom: 5px;
        }
        .ticker-price {
          font-size: 1.4rem;
          font-weight: 700;
          color: #f8fafc;
          font-family: monospace;
        }
        .ticker-price.up { color: #10b981; }
        .ticker-price.down { color: #ef4444; }

        /* ── Main Layout Grid ── */
        .main-dashboard-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 20px;
        }

        @media (max-width: 1024px) {
          .main-dashboard-grid {
            grid-template-columns: 1fr;
          }
        }

        /* ── Panels ── */
        .dashboard-panel {
          background: rgba(13, 20, 33, 0.5);
          border: 1px solid #1a2436;
          border-radius: 8px;
          padding: 18px;
          margin-bottom: 20px;
          box-sizing: border-box;
        }
        .panel-title {
          font-size: 0.85rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #38bdf8;
          border-bottom: 1px solid #1a2436;
          padding-bottom: 8px;
          margin-bottom: 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .panel-badge {
          font-size: 0.65rem;
          background: rgba(56, 189, 248, 0.1);
          color: #38bdf8;
          padding: 2px 6px;
          border-radius: 3px;
        }

        /* ── OBI & Order Book ── */
        .obi-row {
          margin-bottom: 12px;
        }
        .obi-header {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          margin-bottom: 4px;
        }
        .obi-bar-bg {
          height: 10px;
          background: #1e293b;
          border-radius: 5px;
          overflow: hidden;
          position: relative;
        }
        .obi-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #00d4ff);
          border-radius: 5px;
          transition: width 0.3s ease;
        }

        /* ── Bollinger Squeeze ── */
        .bollinger-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .bollinger-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 4px;
          font-size: 0.8rem;
        }
        .bollinger-energy-badge {
          font-size: 0.65rem;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 3px;
        }
        .energy-charging { background: rgba(56, 189, 248, 0.15); color: #38bdf8; }
        .energy-releasing { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
        .energy-neutral { background: rgba(255, 255, 255, 0.05); color: #94a3b8; }

        /* ── Console ── */
        .console-box {
          background: #020617;
          border: 1px solid #1e293b;
          border-radius: 6px;
          height: 250px;
          overflow-y: auto;
          padding: 10px;
          font-family: monospace;
          font-size: 0.75rem;
        }
        .console-line {
          margin-bottom: 6px;
          line-height: 1.3;
          display: flex;
          gap: 8px;
        }
        .console-timestamp {
          color: #475569;
        }
        .console-msg-info { color: #94a3b8; }
        .console-msg-signal { color: #10b981; }
        .console-msg-error { color: #f43f5e; }
        .console-msg-whale { color: #eab308; }

        /* ── ERP Summary ── */
        .erp-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 15px;
        }
        .erp-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid #1a2436;
          border-radius: 4px;
          padding: 10px;
          text-align: center;
        }
        .erp-card-label {
          font-size: 0.65rem;
          color: #64748b;
          text-transform: uppercase;
        }
        .erp-card-val {
          font-size: 1rem;
          font-weight: 700;
          font-family: monospace;
          margin-top: 5px;
        }
        .erp-card-val.positive { color: #10b981; }
        .erp-card-val.negative { color: #ef4444; }

        /* ── News ── */
        .news-item {
          padding: 10px 0;
          border-bottom: 1px solid #1a2436;
        }
        .news-item:last-child {
          border-bottom: none;
        }
        .news-title {
          font-size: 0.8rem;
          font-weight: 600;
          color: #f8fafc;
        }
        .news-meta {
          font-size: 0.65rem;
          color: #64748b;
          margin-top: 4px;
          display: flex;
          justify-content: space-between;
        }

      `}} />

      {/* ── HEADER ── */}
      <div className="ia-header">
        <div className="ia-title-area">
          <h1>IA CRIPTO MULTIESCALA</h1>
          <p>Espejo en tiempo real del pipeline cuantitativo local</p>
        </div>
        <div className="ia-status-badge">
          <span className="status-dot active"></span>
          <span>{status}</span>
        </div>
      </div>

      {/* ── TICKERS ── */}
      <div className="tickers-grid">
        <div className="ticker-card">
          <span className="ticker-sym">BTCUSDT</span>
          <span className="ticker-price">
            ${(data.prices.BTCUSDT || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="ticker-card">
          <span className="ticker-sym">ETHUSDT</span>
          <span className="ticker-price">
            ${(data.prices.ETHUSDT || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="ticker-card">
          <span className="ticker-sym">SOLUSDT</span>
          <span className="ticker-price">
            ${(data.prices.SOLUSDT || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* ── MAIN GRID ── */}
      <div className="main-dashboard-grid">
        {/* Left Column: Metrics & Indicators */}
        <div className="col-left">
          
          {/* Order Book Imbalance */}
          <div className="dashboard-panel">
            <div className="panel-title">
              <span>Order Book Imbalance (OBI)</span>
              <span className="panel-badge">10s</span>
            </div>
            {Object.keys(data.prices).map(sym => {
              const val = data.obi[sym] ? data.obi[sym].z_score || 0.0 : 0.0;
              const percent = Math.min(Math.max((val + 3.0) / 6.0 * 100, 0), 100);
              return (
                <div key={sym} className="obi-row">
                  <div className="obi-header">
                    <span>{sym.replace('USDT', '')}</span>
                    <span style={{ fontFamily: 'monospace' }}>Z-Score: {val.toFixed(2)}</span>
                  </div>
                  <div className="obi-bar-bg">
                    <div className="obi-bar-fill" style={{ width: `${percent}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bollinger Squeeze */}
          <div className="dashboard-panel">
            <div className="panel-title">
              <span>Bollinger Bands Squeeze</span>
              <span className="panel-badge">1h / 4h</span>
            </div>
            <div className="bollinger-list">
              {Object.keys(data.prices).map(sym => {
                const b = data.bollinger[sym] || {};
                return (
                  <div key={sym} className="bollinger-row">
                    <span style={{ fontWeight: 600 }}>{sym.replace('USDT', '')}</span>
                    <span>BW 1h: {b.bandwidth_1h ? b.bandwidth_1h.toFixed(4) : '--'}</span>
                    <span>BW 4h: {b.bandwidth_4h ? b.bandwidth_4h.toFixed(4) : '--'}</span>
                    <span className={`bollinger-energy-badge ${getEnergyClass(b.energy_state)}`}>
                      {b.energy_state || 'NEUTRAL'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Consola Interactiva */}
          <div className="dashboard-panel">
            <div className="panel-title">
              <span>Consola de Operación Local (AI & Risk logs)</span>
            </div>
            <div className="console-box">
              {consoleLines.map((line, idx) => (
                <div key={idx} className="console-line">
                  <span className="console-timestamp">[{line.time}]</span>
                  <span className={`console-msg-${line.type}`}>{line.message}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: ERP / DCA & News */}
        <div className="col-right">

          {/* ERP Ledgers & DCA */}
          <div className="dashboard-panel">
            <div className="panel-title">
              <span>ERP & DCA Ledger (SQLite)</span>
            </div>
            <div className="erp-grid">
              <div className="erp-card">
                <span className="erp-card-label">PnL</span>
                <span className={`erp-card-val ${data.erp_summary.net_pnl >= 0 ? 'positive' : 'negative'}`}>
                  ${(data.erp_summary.net_pnl || 0.0).toFixed(2)}
                </span>
              </div>
              <div className="erp-card">
                <span className="erp-card-label">Trades</span>
                <span className="erp-card-val">{data.erp_summary.total_trades || 0}</span>
              </div>
              <div className="erp-card">
                <span className="erp-card-label">Win Rate</span>
                <span className="erp-card-val">
                  {data.erp_summary.win_rate ? (data.erp_summary.win_rate * 100).toFixed(0) + '%' : '--'}
                </span>
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', borderTop: '1px solid #1a2436', paddingTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>DCA Budget mensual:</span>
                <span style={{ fontFamily: 'monospace' }}>
                  ${(data.dca_status.spent_this_month || 0).toFixed(0)} / ${(data.dca_status.monthly_budget || 1000).toFixed(0)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>DCA Compras/Mes:</span>
                <span style={{ fontFamily: 'monospace' }}>
                  {data.dca_status.purchases_this_month || 0} / {data.dca_status.max_purchases_per_month || 10}
                </span>
              </div>
            </div>
          </div>

          {/* Noticias y Sentimiento */}
          <div className="dashboard-panel">
            <div className="panel-title">
              <span>Noticias y Sentimiento</span>
              <span className={`panel-badge ${getSentimentClass(data.news_sentiment.label)}`}>
                {data.news_sentiment.label} ({data.news_sentiment.score ? data.news_sentiment.score.toFixed(1) : '0.0'})
              </span>
            </div>
            <div className="news-list">
              {data.news && data.news.length > 0 ? (
                data.news.map((item, idx) => (
                  <div key={idx} className="news-item">
                    <div className="news-title">{item.title}</div>
                    <div className="news-meta">
                      <span>Sentimiento: {item.sentiment || 'NEUTRAL'}</span>
                      <span>Hace {Math.round(item.age_seconds / 60) || 0}m</span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', padding: '15px' }}>
                  Esperando agregador de noticias local...
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
