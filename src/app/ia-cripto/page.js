"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import './ia-cripto.css';

export default function IACriptoPage() {
  const [status, setStatus] = useState('DESCONECTADO');
  const [activeTab, setActiveTab] = useState('BTCUSDT');
  const [clock, setClock] = useState('--:--:--');
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
    circuit_breaker: { active: false, reason: '' },
    bollinger: {},
    institutional_levels: {},
    erp_summary: { net_pnl: 0.0, total_trades: 0, win_rate: 0.0 },
    dca_status: { spent_this_month: 0.0, monthly_budget: 1000.0, purchases_this_month: 0, max_purchases_per_month: 10 }
  });
  const [consoleLines, setConsoleLines] = useState([
    { time: '--:--:--', type: 'info', message: 'Esperando señal de telemetría local...' }
  ]);

  // Cambiar el título de la pestaña del navegador para que no diga ERP Construcción
  useEffect(() => {
    document.title = "IA Cripto Multiescala — Panel en Tiempo Real";
    
    // Reloj local
    const timer = setInterval(() => {
      setClock(new Date().toLocaleTimeString('es-CO'));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!supabase) {
      console.warn("Supabase no configurado");
      setStatus('ERROR DE CONFIGURACION');
      return;
    }

    setStatus('CONECTANDO A SUPABASE...');

    const channel = supabase.channel('ia-telemetry')
      .on('broadcast', { event: 'telemetry-update' }, (payload) => {
        setStatus('CONECTADO');
        if (payload && payload.payload) {
          const msg = payload.payload;
          
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

  // Agregar noticias nuevas en tiempo real a la consola
  useEffect(() => {
    if (data.news && data.news.length > 0) {
      const latestNews = data.news[0];
      const timeStr = new Date().toLocaleTimeString('es-CO');
      setConsoleLines(prev => {
        if (prev.some(l => l.message.includes(latestNews.title))) return prev;
        return [{
          time: timeStr,
          type: 'whale',
          message: '[NOTICIA] ' + latestNews.title + ' (Sentimiento: ' + (latestNews.sentiment || 'NEUTRAL') + ')'
        }, ...prev].slice(0, 100);
      });
    }
  }, [data.news]);

  // Agregar bloques detectados en tiempo real a la consola
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

  // Calculations for Monitor panel
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

  let alignmentLabel = 'NEUTRAL';
  let alignmentColor = '#eab308';
  
  const activeSyms = Object.keys(activePositions);
  if (activeSyms.length > 0) {
    const sides = activeSyms.map(sym => activePositions[sym].side);
    const allLong = sides.every(s => s === 'LONG');
    const allShort = sides.every(s => s === 'SHORT');
    if (allLong) {
      alignmentLabel = 'ALCISTA';
      alignmentColor = '#10b981';
    } else if (allShort) {
      alignmentLabel = 'BAJISTA';
      alignmentColor = '#ef4444';
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

  // Render original local orderbook format
  const activeOrderbook = data.orderbook[activeTab] || { bids: [], asks: [] };

  return (
    <div id="app">
      
      {/* ═══ HEADER ═══ */}
      <header className="header">
        <div className="header-brand">
          <div className="header-logo">🧠</div>
          <div>
            <div className="header-title">IA CRIPTO MULTIESCALA</div>
            <div className="header-subtitle">Análisis Cuantitativo en Tiempo Real</div>
          </div>
        </div>
        <div className="header-status">
          <div className="status-indicator">
            <button id="powerBtn" className="power-btn">
              <span className="power-icon">⚡</span> <span id="powerText">ENCENDIDO</span>
            </button>
          </div>
          <div className="status-indicator">
            <span className="status-dot" id="statusDot"></span>
            <span id="statusText">{status}</span>
          </div>
          <div className="status-indicator">
            <span id="clockDisplay">{clock}</span>
          </div>
        </div>
      </header>

      {/* ═══ CIRCUIT BREAKER ═══ */}
      {data.circuit_breaker && data.circuit_breaker.active && (
        <div id="circuitBreakerBanner" className="circuit-breaker-banner" style={{ display: 'flex' }}>
          <div className="cb-icon">🛑</div>
          <div className="cb-text">
            <strong>CIRCUIT BREAKER ACTIVO</strong>
            <span id="cbReason">— {data.circuit_breaker.reason || 'Cisne Negro detectado'}</span>
          </div>
        </div>
      )}

      {/* ═══ MAIN GRID ═══ */}
      <main className="main-grid">

        {/* ── Price Ticker ── */}
        <section className="price-ticker" id="priceTicker">
          {Object.keys(data.prices).map(sym => (
            <div key={sym} className="ticker-card">
              <span className="ticker-symbol">{sym}</span>
              <span className="ticker-price">
                ${data.prices[sym].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </section>

        {/* ── OBI Panel ── */}
        <section className="panel" id="obiPanel">
          <div className="panel-header">
            <span className="panel-title"><span className="icon">📊</span> ORDER BOOK IMBALANCE</span>
            <span className="panel-badge badge-live">LIVE</span>
          </div>
          <div className="panel-body">
            <div className="obi-grid" id="obiGrid">
              {Object.keys(data.prices).map(sym => {
                const val = data.obi[sym] ? data.obi[sym].z_score || 0.0 : 0.0;
                const percent = Math.min(Math.max((val + 3.0) / 6.0 * 100, 0), 100);
                return (
                  <div key={sym} className="obi-row" style={{ display: 'flex', flexDirection: 'column', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '600' }}>{sym}</span>
                      <span style={{ fontFamily: 'monospace' }}>Z-Score: {val.toFixed(2)}</span>
                    </div>
                    <div className="obi-bar-bg" style={{ height: '8px', background: '#1f2937', borderRadius: '4px', overflow: 'hidden' }}>
                      <div className="obi-bar-fill" style={{ height: '100%', width: `${percent}%`, background: 'linear-gradient(90deg, #3b82f6, #00d4ff)', borderRadius: '4px' }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Orderbook Panel ── */}
        <section className="panel" id="orderbookPanel">
          <div className="panel-header">
            <span className="panel-title"><span class="icon">📒</span> LIBRO DE ÓRDENES</span>
            <div className="orderbook-symbol-tabs" id="obTabs" style={{ display: 'flex', gap: '6px' }}>
              {Object.keys(data.prices).map(sym => (
                <button
                  key={sym}
                  className={`ob-tab ${activeTab === sym ? 'active' : ''}`}
                  onClick={() => setActiveTab(sym)}
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.7rem',
                    padding: '3px 8px',
                    border: '1px solid var(--glass-border)',
                    background: activeTab === sym ? 'var(--cyan-soft)' : 'transparent',
                    color: activeTab === sym ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {sym.replace('USDT', '')}
                </button>
              ))}
            </div>
          </div>
          <div className="panel-body">
            <div className="orderbook-container" id="orderbookContainer" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              {/* Asks (Sell) Table */}
              <div>
                <div style={{ fontSize: '0.7rem', color: '#ff3366', fontWeight: '700', marginBottom: '6px', textAlign: 'center' }}>VENDEDORES (ASKS)</div>
                {activeOrderbook.asks && activeOrderbook.asks.length > 0 ? (
                  <table style={{ width: '100%', fontSize: '0.7rem', fontFamily: 'monospace' }}>
                    <thead>
                      <tr style={{ color: 'var(--text-muted)' }}>
                        <th style={{ textAlign: 'left' }}>Precio</th>
                        <th style={{ textAlign: 'right' }}>Cantidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeOrderbook.asks.slice(0, 5).reverse().map((level, i) => (
                        <tr key={i} style={{ color: 'var(--neon-red)' }}>
                          <td>${level[0].toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td style={{ textAlign: 'right' }}>{level[1].toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="grid-empty-msg" style={{ padding: '15px' }}>Sin datos...</div>
                )}
              </div>
              
              {/* Bids (Buy) Table */}
              <div>
                <div style={{ fontSize: '0.7rem', color: '#00ff88', fontWeight: '700', marginBottom: '6px', textAlign: 'center' }}>COMPRADORES (BIDS)</div>
                {activeOrderbook.bids && activeOrderbook.bids.length > 0 ? (
                  <table style={{ width: '100%', fontSize: '0.7rem', fontFamily: 'monospace' }}>
                    <thead>
                      <tr style={{ color: 'var(--text-muted)' }}>
                        <th style={{ textAlign: 'left' }}>Precio</th>
                        <th style={{ textAlign: 'right' }}>Cantidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeOrderbook.bids.slice(0, 5).map((level, i) => (
                        <tr key={i} style={{ color: 'var(--neon-green)' }}>
                          <td>${level[0].toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td style={{ textAlign: 'right' }}>{level[1].toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="grid-empty-msg" style={{ padding: '15px' }}>Sin datos...</div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Whale Tracker Panel ── */}
        <section className="panel" id="whalePanel">
          <div className="panel-header">
            <span className="panel-title"><span className="icon">🐋</span> WHALE TRACKER</span>
            <span className="panel-badge badge-live">LIVE</span>
          </div>
          <div className="panel-body">
            <div className="whale-list" id="whaleList" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {data.whale_recent && data.whale_recent.length > 0 ? (
                data.whale_recent.slice(0, 8).map((w, i) => {
                  const isBuy = w.direction === 'BUY' || w.side === 'BUY';
                  return (
                    <div key={i} style={{
                      padding: '8px',
                      background: 'rgba(255,255,255,0.02)',
                      borderLeft: `3px solid ${isBuy ? 'var(--neon-green)' : 'var(--neon-red)'}`,
                      marginBottom: '6px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}>
                      <span><b>{w.symbol}</b> {isBuy ? 'COMPRA' : 'VENTA'}</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: '700' }}>
                        ${w.vol_usd ? w.vol_usd.toLocaleString() : w.amount.toLocaleString()} USD
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="whale-empty">Esperando eventos whale...</div>
              )}
            </div>
          </div>
        </section>

        {/* ── Sidebar Column (Right) ── */}
        <div className="sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
          
          {/* Proyección y S/R Técnico */}
          <section className="panel tech-projection" id="projectionPanel">
            <div className="panel-header">
              <span className="panel-title"><span className="icon">🔮</span> PROYECCIÓN Y S/R TÉCNICO</span>
            </div>
            <div className="panel-body">
              <div id="projectionContainer">
                {Object.keys(data.prices).map(sym => {
                  const proj = data.projections[sym] || {};
                  return (
                    <div key={sym} style={{
                      padding: '8px',
                      background: 'rgba(255,255,255,0.01)',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      fontSize: '0.75rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', marginBottom: '4px' }}>
                        <span>{sym}</span>
                        <span style={{ color: 'var(--neon-cyan)' }}>{proj.regime || 'NEUTRAL'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                        <span>Soporte: ${proj.support ? proj.support.toLocaleString() : '--'}</span>
                        <span>Resistencia: ${proj.resistance ? proj.resistance.toLocaleString() : '--'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* AI Console */}
          <section className="panel ai-console">
            <div className="panel-header">
              <span className="panel-title"><span className="icon">🤖</span> CONSOLA INTERACTIVA</span>
            </div>
            <div className="panel-body">
              <div className="console-output" id="consoleOutput" style={{ height: '220px', overflowY: 'auto' }}>
                {consoleLines.map((line, idx) => (
                  <div key={idx} className="console-line">
                    <span className="console-timestamp">[{line.time}]</span>
                    <span className={`console-msg-${line.type}`}>{line.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* News & Sentiment */}
          <section className="panel news-panel">
            <div className="panel-header">
              <span className="panel-title"><span className="icon">📰</span> NOTICIAS & SENTIMIENTO</span>
              <span className="panel-badge" id="sentimentBadge">{data.news_sentiment.label}</span>
            </div>
            <div className="panel-body">
              <div className="sentiment-gauge-container">
                <div className="sentiment-score" id="sentimentScore">
                  {data.news_sentiment.score ? data.news_sentiment.score.toFixed(1) : '0.0'}
                </div>
              </div>
              <div className="news-list" id="newsList" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                {data.news && data.news.length > 0 ? (
                  data.news.map((item, idx) => (
                    <div key={idx} className="news-item">
                      <div className="news-title">{item.title}</div>
                      <div className="news-meta">
                        <span>Hace {Math.round(item.age_seconds / 60) || 0}m</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="news-empty">Esperando noticias...</div>
                )}
              </div>
            </div>
          </section>

        </div>

        {/* ── Bollinger Squeeze ── */}
        <section className="panel" id="bollingerPanel" style={{ gridRow: '4', gridColumn: '1' }}>
          <div className="panel-header">
            <span className="panel-title"><span className="icon">B</span> BOLLINGER SQUEEZE</span>
          </div>
          <div className="panel-body">
            <div id="bollingerGrid" className="bollinger-grid" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.keys(data.prices).map(sym => {
                const b = data.bollinger[sym] || {};
                return (
                  <div key={sym} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px', fontSize: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                    <span style={{ fontWeight: '700' }}>{sym}</span>
                    <span>1h: {b.bandwidth_1h ? b.bandwidth_1h.toFixed(4) : '--'}</span>
                    <span>4h: {b.bandwidth_4h ? b.bandwidth_4h.toFixed(4) : '--'}</span>
                    <span className={`bollinger-energy-badge ${getEnergyClass(b.energy_state)}`}>
                      {b.energy_state || 'NEUTRAL'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Lead Lag Panel ── */}
        <section className="panel lead-lag-panel" style={{ gridRow: '4', gridColumn: '2' }}>
          <div className="panel-header">
            <span className="panel-title"><span className="icon">🔗</span> CORRELACIÓN LEAD-LAG</span>
          </div>
          <div className="panel-body" style={{ fontSize: '0.75rem' }}>
            <div id="leadLagGrid">
              {data.lead_lag && Object.keys(data.lead_lag).length > 0 ? (
                Object.entries(data.lead_lag).map(([pair, info]) => (
                  <div key={pair} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span><b>{pair}</b></span>
                    <span>Desfase: {info.lag_seconds}s</span>
                    <span style={{ color: 'var(--neon-green)' }}>Corr: {info.correlation ? info.correlation.toFixed(2) : '0.0'}</span>
                  </div>
                ))
              ) : (
                <div className="ll-empty">Calculando lag de precios...</div>
              )}
            </div>
          </div>
        </section>

        {/* ── ERP / DCA Panel ── */}
        <section className="panel" id="erpPanel" style={{ gridRow: '4', gridColumn: '3' }}>
          <div className="panel-header">
            <span className="panel-title"><span className="icon">$</span> ERP & DCA</span>
            <span className="panel-badge" id="erpBadge">SQLite</span>
          </div>
          <div className="panel-body">
            <div className="erp-summary" id="erpSummary">
              <div className="erp-row">
                <span className="erp-label">PnL Neto</span>
                <span className="erp-value" id="erpPnl" style={{ color: totalPnLWithFloating >= 0 ? 'var(--neon-green)' : 'var(--neon-red)' }}>
                  ${totalPnLWithFloating.toFixed(2)}
                </span>
              </div>
              <div className="erp-row">
                <span className="erp-label">Trades</span>
                <span className="erp-value" id="erpTrades">{totalClosed}</span>
              </div>
              <div className="erp-row">
                <span className="erp-label">Win Rate</span>
                <span className="erp-value" id="erpWinRate">{winRate.toFixed(1)}%</span>
              </div>
              <div className="erp-row">
                <span className="erp-label">DCA Presupuesto</span>
                <span className="erp-value" id="dcaBudget">${data.dca_status.monthly_budget}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── 📊 MONITOR DE OPERACIONES Y PNL (ANCHO COMPLETO) ── */}
        <section className="panel" id="monitorPanel" style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
          <div className="panel-header">
            <span className="panel-title"><span className="icon">📊</span> MONITOR DE OPERACIONES Y PNL</span>
            <span className="panel-badge badge-live">SIMULADO</span>
          </div>
          
          <div className="panel-body monitor-panel-body">
            {/* Tarjetas de Estadísticas Rápidas */}
            <div className="monitor-stats-grid">
              <div className="stat-card">
                <div className="stat-label">PNL TOTAL</div>
                <div className={`stat-value ${totalPnLWithFloating >= 0 ? 'glow-green positive' : 'glow-red negative'}`} id="statTotalPnl">
                  ${totalPnLWithFloating.toFixed(2)} USD
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">WIN RATE</div>
                <div className="stat-value glow-cyan" id="statWinRate">
                  {winRate.toFixed(1)}%
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">PNL AGENTE (IA)</div>
                <div className={`stat-value ${finalFuturesPnl >= 0 ? 'glow-green positive' : 'glow-red negative'}`} id="statAgentPnl">
                  ${finalFuturesPnl.toFixed(2)} USD
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">PNL GRID</div>
                <div className={`stat-value ${finalSpotPnl >= 0 ? 'glow-green positive' : 'glow-red negative'}`} id="statGridPnl">
                  ${finalSpotPnl.toFixed(2)} USD
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">ALINEACIÓN / COINCIDENCIAS</div>
                <div className="stat-value" id="statCoincidences" style={{ color: alignmentColor }}>
                  {alignmentLabel} 🟡
                </div>
              </div>
            </div>

            {/* Tablas Divididas */}
            <div className="monitor-tables-layout">
              
              {/* Columna 1: Operaciones y Grillas Activas */}
              <div className="monitor-table-section">
                <div className="visualizer-title">Operaciones y Grillas Activas</div>
                <div className="monitor-table-container" id="activeTradesContainer">
                  {Object.keys(activePositions).length === 0 && Object.keys(activeGrids).length === 0 ? (
                    <div className="grid-empty-msg">No hay posiciones ni grillas activas en este momento.</div>
                  ) : (
                    <>
                      {/* Render Posiciones Activas */}
                      {Object.entries(activePositions).map(([sym, pos]) => {
                        const currPrice = data.prices[sym] || pos.entry_price;
                        const pnl = (currPrice - pos.entry_price) * pos.size * (pos.side === 'LONG' ? 1 : -1);
                        const pnlPercent = ((currPrice - pos.entry_price) / pos.entry_price * 100) * (pos.side === 'LONG' ? 1 : -1);
                        
                        return (
                          <div key={sym} className="active-trade-card agent">
                            <div className="card-left">
                              <span className="strat-label strategy-agent">
                                {pos.side === 'SHORT' ? 'IA FUTUROS' : 'IA SPOT'}
                              </span>
                              <span className="symbol-badge">{sym.replace('USDT', '')}</span>
                              <span className={`side-badge ${pos.side.toLowerCase()}`}>{pos.side}</span>
                            </div>
                            <div className="card-right" style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                              <div>Entrada: <span className="val">${pos.entry_price.toLocaleString()}</span></div>
                              <div>Precio: <span className="val">${currPrice.toLocaleString()}</span></div>
                              <div className={`pnl-val ${pnl >= 0 ? 'positive' : 'negative'}`} style={{ fontWeight: 700 }}>
                                PnL: {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} USD ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
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
                              <span className="symbol-badge">{sym.replace('USDT', '')}</span>
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                {placedCount} act · {filledCount} ejec
                              </span>
                            </div>
                            <div className="card-right" style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                              <div>Rango: <span className="val">[{grid.lower_limit} - {grid.upper_limit}]</span></div>
                              <div className={`pnl-val ${grid.pnl >= 0 ? 'positive' : 'negative'}`} style={{ fontWeight: 700 }}>
                                PnL: {grid.pnl >= 0 ? '+' : ''}${grid.pnl.toFixed(2)} USD ({gridPnlPercent >= 0 ? '+' : ''}{gridPnlPercent.toFixed(2)}%)
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
                <div className="monitor-table-container" id="closedTradesContainer">
                  {closedTrades.length === 0 ? (
                    <div className="grid-empty-msg">Historial de operaciones vacío. Esperando ejecuciones...</div>
                  ) : (
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
                              <td style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{timeStr}</td>
                              <td style={{ fontWeight: 700, color: 'var(--text-bright)' }}>{t.symbol.replace('USDT', '')}</td>
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
                              <td style={{ color: 'var(--text-muted)' }}>{formatReason(t.exit_reason)}</td>
                              <td className={t.pnl >= 0 ? 'pnl positive' : 'pnl negative'} style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                                {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}<br/>
                                <span style={{ fontSize: '0.65rem' }}>{pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

            </div>
          </div>
        </section>

      </main>

    </div>
  );
}
