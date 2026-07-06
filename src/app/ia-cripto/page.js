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
    if (data.news && data.news.length > 0) {
      const latestNews = data.news[0];
      const timeStr = new Date().toLocaleTimeString('es-CO');
      setConsoleLines(prev => {
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

  // ── CÁLCULOS DEL MONITOR DE OPERACIONES Y PNL ──
  const closedTrades = data.closed_trades || [];
  const activePositions = data.active_positions || {};
  const activeGrids = data.active_grids || {};

  let spotPnl = 0;
  let futuresPnl = 0;
  let totalPnl = 0;
  let winCount = 0;
  let totalClosed = 0;

  closedTrades.forEach(t => {
    const pnl = t.pnl || 0;
    if (t.strategy === 'GRID') {
      spotPnl += pnl;
    } else {
      futuresPnl += pnl;
    }
    totalPnl += pnl;
    if (pnl > 0) winCount++;
    totalClosed++;
  });

  // PnL Flotante/Latente
  let floatingSpotPnl = 0;
  let floatingFuturesPnl = 0;

  Object.entries(activePositions).forEach(([sym, pos]) => {
    const currPrice = data.prices[sym];
    if (currPrice && pos.entry_price) {
      const size = pos.size || 0.0;
      const pnl = (currPrice - pos.entry_price) * size * (pos.side === 'LONG' ? 1 : -1);
      if (pos.side === 'SHORT') {
        floatingFuturesPnl += pnl;
      } else {
        floatingSpotPnl += pnl;
      }
    }
  });

  Object.entries(activeGrids).forEach(([sym, grid]) => {
    floatingSpotPnl += grid.pnl || 0;
  });

  const totalPnLWithFloating = totalPnl + floatingFuturesPnl + floatingSpotPnl;
  const finalFuturesPnl = futuresPnl + floatingFuturesPnl;
  const finalSpotPnl = spotPnl + floatingSpotPnl;
  const winRate = totalClosed > 0 ? (winCount / totalClosed) * 100 : 0.0;

  // Alineación / Coincidencias
  let alignmentLabel = 'NEUTRAL';
  let alignmentColor = '#eab308'; // Amarillo 🟡
  
  const activeSyms = Object.keys(activePositions);
  if (activeSyms.length > 0) {
    const sides = activeSyms.map(sym => activePositions[sym].side);
    const allLong = sides.every(s => s === 'LONG');
    const allShort = sides.every(s => s === 'SHORT');
    if (allLong) {
      alignmentLabel = 'ALCISTA';
      alignmentColor = '#10b981'; // Verde 🟢
    } else if (allShort) {
      alignmentLabel = 'BAJISTA';
      alignmentColor = '#ef4444'; // Rojo 🔴
    }
  }

  const formatReason = (reason) => {
    const map = {
      'STOP_LOSS': 'Stop Loss',
      'TAKE_PROFIT': 'Take Profit',
      'CLIMAX_EXIT': 'Climax Exit',
      'AI_CLOSE_SIGNAL': 'Cierre IA',
      'EMERGENCY_PANIC_DISCONNECT': 'Panico Red',
      'GRID_SELL_FILL': 'Malla Venta',
    };
    return map[reason] || reason || '--';
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

        /* ── Main Layout Grid ── */
        .main-dashboard-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
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

        /* ── Monitor Panel CSS ── */
        .monitor-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }
        .stat-card {
          background: rgba(13, 20, 33, 0.7);
          border: 1px solid #1e293b;
          border-radius: 6px;
          padding: 12px;
          text-align: left;
        }
        .stat-label {
          font-size: 0.65rem;
          color: #64748b;
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        .stat-value {
          font-size: 1.15rem;
          font-weight: 800;
          font-family: monospace;
          margin-top: 6px;
        }
        .stat-value.positive { color: #10b981; }
        .stat-value.negative { color: #ef4444; }
        .stat-value.neutral { color: #eab308; }

        .monitor-tables-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        @media (max-width: 900px) {
          .monitor-tables-layout {
            grid-template-columns: 1fr;
          }
        }
        .visualizer-title {
          font-size: 0.8rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
          border-left: 3px solid #38bdf8;
          padding-left: 8px;
        }
        .monitor-table-container {
          background: rgba(2, 6, 23, 0.4);
          border: 1px solid #1e293b;
          border-radius: 6px;
          padding: 10px;
          min-height: 120px;
          max-height: 350px;
          overflow-y: auto;
        }
        
        /* active trade card styled */
        .active-trade-card {
          background: rgba(13, 20, 33, 0.9);
          border: 1px solid #22d3ee;
          border-radius: 6px;
          padding: 10px;
          margin-bottom: 8px;
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
        }
        .active-trade-card.grid {
          border-color: #f1c40f;
        }
        .card-left {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .side-badge {
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 0.65rem;
          text-transform: uppercase;
          text-align: center;
          display: inline-block;
        }
        .side-badge.long { background: rgba(16, 185, 129, 0.15); color: #10b981; }
        .side-badge.short { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
        .strat-label {
          font-size: 0.65rem;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 3px;
        }
        .strat-label.strategy-grid { background: rgba(241, 196, 15, 0.15); color: #f1c40f; }
        .strat-label.strategy-agent { background: rgba(56, 189, 248, 0.15); color: #38bdf8; }

        /* table responsive style */
        .grid-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.75rem;
          text-align: left;
        }
        .grid-table th {
          color: #64748b;
          border-bottom: 1px solid #1e293b;
          padding: 8px;
          font-weight: 600;
        }
        .grid-table td {
          padding: 8px;
          border-bottom: 1px solid rgba(30, 41, 59, 0.4);
          vertical-align: middle;
        }
        .pnl.positive { color: #10b981; }
        .pnl.negative { color: #ef4444; }

        /* Empty message */
        .grid-empty-msg {
          font-size: 0.75rem;
          color: #475569;
          text-align: center;
          padding: 30px;
        }

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

        </div>

        {/* Right Column: Console & News */}
        <div className="col-right">

          {/* Consola Interactiva */}
          <div className="dashboard-panel" style={{ height: 'calc(100% - 20px)', display: 'flex', flexDirection: 'column' }}>
            <div className="panel-title">
              <span>Consola de Operación Local (AI & Risk logs)</span>
            </div>
            <div className="console-box" style={{ flexGrow: 1, height: 'auto', minHeight: '230px' }}>
              {consoleLines.map((line, idx) => (
                <div key={idx} className="console-line">
                  <span className="console-timestamp">[{line.time}]</span>
                  <span className={`console-msg-${line.type}`}>{line.message}</span>
                </div>
              ))}
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
            <div className="news-list" style={{ maxHeight: '200px', overflowY: 'auto' }}>
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

      {/* ── 📊 MONITOR DE OPERACIONES Y PNL (ANCHO COMPLETO) ── */}
      <div className="dashboard-panel" style={{ width: '100%' }}>
        <div className="panel-title">
          <span>📊 MONITOR DE OPERACIONES Y PNL</span>
          <span className="panel-badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderColor: '#10b981' }}>SIMULADO</span>
        </div>
        
        {/* Tarjetas de Estadísticas Rápidas */}
        <div className="monitor-stats-grid">
          <div className="stat-card">
            <div className="stat-label">PNL TOTAL</div>
            <div className={`stat-value ${totalPnLWithFloating >= 0 ? 'positive' : 'negative'}`}>
              ${totalPnLWithFloating.toFixed(2)} USD
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">WIN RATE</div>
            <div className="stat-value" style={{ color: '#00d4ff' }}>
              {winRate.toFixed(1)}%
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">PNL AGENTE (IA)</div>
            <div className={`stat-value ${finalFuturesPnl >= 0 ? 'positive' : 'negative'}`}>
              ${finalFuturesPnl.toFixed(2)} USD
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">PNL GRID</div>
            <div className={`stat-value ${finalSpotPnl >= 0 ? 'positive' : 'negative'}`}>
              ${finalSpotPnl.toFixed(2)} USD
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">ALINEACIÓN</div>
            <div className="stat-value neutral" style={{ color: alignmentColor }}>
              {alignmentLabel}
            </div>
          </div>
        </div>

        {/* Tablas Divididas */}
        <div className="monitor-tables-layout">
          
          {/* Columna 1: Operaciones y Grillas Activas */}
          <div className="monitor-table-section">
            <div className="visualizer-title">Operaciones y Grillas Activas</div>
            <div className="monitor-table-container">
              {Object.keys(activePositions).length === 0 && Object.keys(activeGrids).length === 0 ? (
                <div className="grid-empty-msg">No hay posiciones ni grillas activas en este momento.</div>
              ) : (
                <>
                  {/* Render Posiciones Activas */}
                  {Object.entries(activePositions).map(([sym, pos]) => {
                    const currPrice = data.prices[sym] || pos.entry_price;
                    const pnl = (currPrice - pos.entry_price) * pos.size * (pos.side === 'LONG' ? 1 : -1);
                    const pnlPercent = ((currPrice - pos.entry_price) / pos.entry_price * 100) * (pos.side === 'LONG' ? 1 : -1);
                    const isGrid = pos.strategy === 'GRID';
                    
                    return (
                      <div key={sym} className={`active-trade-card ${isGrid ? 'grid' : 'agent'}`}>
                        <div className="card-left">
                          <span className="strat-label strategy-agent">
                            {pos.side === 'SHORT' ? 'IA FUTUROS' : 'IA SPOT'}
                          </span>
                          <span style={{ fontWeight: 700 }}>{sym.replace('USDT', '')}</span>
                          <span className={`side-badge ${pos.side.toLowerCase()}`}>{pos.side}</span>
                        </div>
                        <div style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                          <div>Entrada: <b>${pos.entry_price.toLocaleString()}</b></div>
                          <div>Precio: <b>${currPrice.toLocaleString()}</b></div>
                          <div className={pnl >= 0 ? 'pnl positive' : 'pnl negative'} style={{ fontWeight: 700 }}>
                            {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Render Grillas Activas */}
                  {Object.entries(activeGrids).map(([sym, grid]) => {
                    const placedCount = grid.levels ? grid.levels.filter(l => l.status === 'PLACED_MOCK').length : 0;
                    const filledCount = grid.levels ? grid.levels.filter(l => l.status === 'FILLED').length : 0;
                    const totalInv = grid.total_investment || 1000.0;
                    const gridPnlPercent = totalInv > 0 ? (grid.pnl / totalInv) * 100 : 0.0;
                    
                    return (
                      <div key={sym} className="active-trade-card grid">
                        <div className="card-left">
                          <span className="strat-label strategy-grid">MALLA GRID</span>
                          <span style={{ fontWeight: 700 }}>{sym.replace('USDT', '')}</span>
                          <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
                            {placedCount} act · {filledCount} ejec
                          </span>
                        </div>
                        <div style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                          <div>Rango: <b>[{grid.lower_limit} - {grid.upper_limit}]</b></div>
                          <div className={grid.pnl >= 0 ? 'pnl positive' : 'pnl negative'} style={{ fontWeight: 700 }}>
                            {grid.pnl >= 0 ? '+' : ''}${grid.pnl.toFixed(2)} ({gridPnlPercent >= 0 ? '+' : ''}{gridPnlPercent.toFixed(2)}%)
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* Columna 2: Historial de Operaciones Cerradas */}
          <div className="monitor-table-section">
            <div className="visualizer-title">Historial de Operaciones Cerradas</div>
            <div className="monitor-table-container">
              {closedTrades.length === 0 ? (
                <div className="grid-empty-msg">Historial de operaciones vacío. Esperando ejecuciones...</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="grid-table">
                    <thead>
                      <tr>
                        <th>Hora</th>
                        <th>Símbolo</th>
                        <th>Dirección</th>
                        <th>Estrategia</th>
                        <th>Entrada</th>
                        <th>Salida</th>
                        <th>Motivo</th>
                        <th>PnL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...closedTrades].reverse().map((t, idx) => {
                        const timeStr = new Date(t.timestamp * 1000).toLocaleTimeString('es-CO');
                        const isGrid = t.strategy === 'GRID';
                        const pnlPct = t.pnl_percent !== undefined ? t.pnl_percent : 0.0;
                        
                        return (
                          <tr key={idx}>
                            <td style={{ color: '#64748b', fontSize: '0.7rem' }}>{timeStr}</td>
                            <td style={{ fontWeight: 700 }}>{t.symbol.replace('USDT', '')}</td>
                            <td>
                              <span className={`side-badge ${t.side?.toLowerCase() || 'long'}`}>
                                {t.side || 'LONG'}
                              </span>
                            </td>
                            <td>
                              <span className={`strat-label ${isGrid ? 'strategy-grid' : 'strategy-agent'}`}>
                                {isGrid ? 'GRID' : 'IA AGENTE'}
                              </span>
                            </td>
                            <td style={{ fontFamily: 'monospace' }}>${t.entry_price.toLocaleString()}</td>
                            <td style={{ fontFamily: 'monospace' }}>${t.exit_price.toLocaleString()}</td>
                            <td style={{ color: '#64748b' }}>{formatReason(t.exit_reason)}</td>
                            <td className={t.pnl >= 0 ? 'pnl positive' : 'pnl negative'} style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                              {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}<br/>
                              <span style={{ fontSize: '0.65rem' }}>{pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
