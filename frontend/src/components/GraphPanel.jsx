import React from 'react';

const STATUS_LABELS = {
  idle:    'Sin inicializar',
  running: 'Cargando dataset...',
  done:    'Online',
  error:   'Error',
};

export default function GraphPanel({ job, onInit }) {
  const { status, step, progress, stats, error } = job;
  const isRunning = status === 'running';
  const isDone    = status === 'done';

  const ledClass = isRunning ? 'led led-amber'
                 : isDone    ? 'led led-green'
                 : status === 'error' ? 'led led-red'
                 : 'led led-off';

  return (
    <div style={{
      background: 'var(--bg-panel)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      padding: '14px 18px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      flexWrap: 'wrap',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {isRunning && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(180deg, transparent 0%, var(--accent-a) 50%, transparent 100%)',
          height: '40px', width: '100%',
          animation: 'scan-line 2.5s linear infinite',
        }} />
      )}

      <div className="panel-screw" />

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
        <div className={ledClass} />
        <div>
          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '10px', color: 'var(--text-dim)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Neo4j GDS
          </div>
          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '13px', color: isDone ? 'var(--led-green)' : isRunning ? 'var(--led-amber)' : 'var(--text-mid)' }}>
            {STATUS_LABELS[status]}
            {isDone && stats && (
              <span style={{ color: 'var(--text-dim)', marginLeft: '8px' }}>
                · {stats.nodes?.toLocaleString()} tracks · {stats.relationships?.toLocaleString()} edges
              </span>
            )}
          </div>
        </div>
      </div>

      {isRunning && (
        <div style={{ flex: 2, minWidth: '160px' }}>
          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '10px', color: 'var(--text-dim)', marginBottom: '5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {step}
          </div>
          <div style={{ height: '4px', background: 'var(--bg-deep)', borderRadius: '2px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: 'var(--accent-a)',
              borderRadius: '2px',
              transition: 'width 0.5s ease',
              boxShadow: '0 0 8px var(--accent-a)',
            }} />
          </div>
        </div>
      )}

      {status === 'idle' && (
        <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '10px', color: 'var(--text-dim)', flex: 2 }}>
          Importa 113k canciones · kNN coseno GDS · grafo A* · 5–15 min primera vez
        </p>
      )}

      {status === 'error' && error && (
        <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '10px', color: 'var(--led-red)', flex: 2 }}>
          ⚠ {error}
        </p>
      )}

      <button
        onClick={onInit}
        disabled={isRunning}
        style={{
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: '11px',
          letterSpacing: '0.1em',
          padding: '7px 16px',
          borderRadius: '4px',
          border: `1px solid ${isRunning ? 'var(--border)' : 'var(--accent-a)'}`,
          background: isRunning ? 'var(--bg-surface)' : '#5b3fd418',
          color: isRunning ? 'var(--text-dim)' : 'var(--accent-a)',
          cursor: isRunning ? 'not-allowed' : 'pointer',
          textTransform: 'uppercase',
          transition: 'all 0.15s',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => { if (!isRunning) e.target.style.background = '#5b3fd430'; }}
        onMouseLeave={e => { if (!isRunning) e.target.style.background = '#5b3fd418'; }}
      >
        {isRunning ? '⏳ Procesando...' : isDone ? '↺ Re-init' : '⚡ Init Graph'}
      </button>

      <div className="panel-screw" />
    </div>
  );
}
