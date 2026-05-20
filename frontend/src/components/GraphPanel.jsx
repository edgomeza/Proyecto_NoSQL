import React from 'react';

const STEP_COLORS = {
  idle:    'text-slate-400',
  running: 'text-yellow-400',
  done:    'text-emerald-400',
  error:   'text-red-400',
};

const STATUS_LABELS = {
  idle:    'Sin inicializar',
  running: 'Inicializando...',
  done:    'Listo',
  error:   'Error',
};

export default function GraphPanel({ job, onInit, disabled }) {
  const { status, step, progress, stats, error } = job;
  const isRunning = status === 'running';
  const isDone    = status === 'done';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      {/* Cabecera */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${
            isRunning ? 'bg-yellow-400 animate-pulse' :
            isDone    ? 'bg-emerald-400' :
            status === 'error' ? 'bg-red-500' : 'bg-slate-600'
          }`} />
          <span className="text-sm font-mono text-slate-300">
            Estado del grafo Neo4j GDS:{' '}
            <span className={`font-bold ${STEP_COLORS[status] ?? 'text-slate-400'}`}>
              {STATUS_LABELS[status]}
            </span>
          </span>
          {isDone && stats && (
            <span className="text-xs text-slate-500 font-mono">
              — {stats.nodes.toLocaleString()} canciones · {stats.relationships.toLocaleString()} relaciones
            </span>
          )}
        </div>

        <button
          onClick={onInit}
          disabled={disabled || isRunning}
          className={`px-4 py-2 rounded-lg text-sm font-bold font-mono transition-all ${
            isRunning
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/40 active:scale-95'
          }`}
        >
          {isRunning ? '⏳ Procesando...' : isDone ? '↺ Re-inicializar' : '⚡ Inicializar Grafo'}
        </button>
      </div>

      {/* Barra de progreso + mensaje de paso */}
      {(isRunning || status === 'error') && (
        <div className="space-y-2">
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className={`text-xs font-mono ${STEP_COLORS[status]}`}>
            {step}
          </p>
        </div>
      )}

      {/* Error */}
      {status === 'error' && error && (
        <div className="bg-red-950/40 border border-red-800 rounded-lg p-3">
          <p className="text-xs text-red-400 font-mono">{error}</p>
        </div>
      )}

      {/* Info disclaimer para el usuario */}
      {status === 'idle' && (
        <p className="text-xs text-slate-600 font-mono">
          La inicialización importa el dataset completo (~113k canciones), calcula similitudes coseno
          con GDS kNN y proyecta el grafo de rutas A*. Puede tardar <strong className="text-slate-400">5–15 minutos</strong> según el hardware.
        </p>
      )}
    </div>
  );
}
