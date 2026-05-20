import React from 'react';
import TrackCard, { TransitionConnector } from './TrackCard';

// Distancia coseno entre features acústicas de dos canciones.
// Necesaria para recalcular step_cost en vivo tras eliminar intermedias.
const FEAT = ['energy', 'danceability', 'valence', 'acousticness'];
function cosineDist(a, b) {
  let dot = 0, mA = 0, mB = 0;
  for (const k of FEAT) {
    const av = parseFloat(a[k]) || 0;
    const bv = parseFloat(b[k]) || 0;
    dot += av * bv; mA += av * av; mB += bv * bv;
  }
  return (mA && mB) ? +(1 - dot / (Math.sqrt(mA) * Math.sqrt(mB))).toFixed(4) : 1;
}

export default function TrackTimeline({ playlist, onRemove, pathType }) {
  if (!playlist?.length) return null;

  // Recalcula step_cost y step en tiempo real (cambia al eliminar intermedias)
  const live = playlist.map((track, i) => ({
    ...track,
    step:      i + 1,
    is_start:  i === 0,
    is_end:    i === playlist.length - 1,
    step_cost: i === 0 ? 0 : cosineDist(playlist[i - 1], track),
  }));

  const totalCost = live.reduce((s, t) => s + t.step_cost, 0);
  const totalHops = live.length;
  const intermediates = totalHops - 2;

  return (
    <section className="space-y-1 mt-8">
      {/* Cabecera de resultados */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-white font-mono">
            Ruta encontrada
          </h2>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Algoritmo A* · grafo GDS · similitud coseno
            {pathType === 'bridge' && (
              <span className="ml-2 text-yellow-600">· puente acústico</span>
            )}
          </p>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <p className="text-2xl font-black text-violet-400 font-mono">{totalHops}</p>
            <p className="text-xs text-slate-500 font-mono">canciones</p>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-500 font-mono">{intermediates}</p>
            <p className="text-xs text-slate-500 font-mono">intermedias</p>
          </div>
          <div>
            <p className="text-2xl font-black text-cyan-400 font-mono">
              {totalCost.toFixed(3)}
            </p>
            <p className="text-xs text-slate-500 font-mono">coste total</p>
          </div>
        </div>
      </div>

      {/* Instrucción de edición */}
      {intermediates > 0 && (
        <div className="flex items-center gap-2 mb-4 px-1">
          <svg className="w-3.5 h-3.5 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-slate-600 font-mono">
            Pulsa <span className="text-slate-500">✕</span> en cualquier canción intermedia para eliminarla de la ruta
          </p>
        </div>
      )}

      {/* Leyenda de compatibilidad armónica */}
      <div className="flex flex-wrap gap-3 mb-4 pb-4 border-b border-slate-800">
        {[
          { color: 'bg-emerald-400', label: 'Perfecta / Relativa' },
          { color: 'bg-yellow-400',  label: 'Armónica / Compatible' },
          { color: 'bg-red-400',     label: 'Creativa' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
            <span className={`w-2 h-2 rounded-full ${color}`} />
            {label}
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />BPM ≤3 suave
          <span className="w-2 h-2 rounded-full bg-yellow-400 ml-2" />3–8 moderado
          <span className="w-2 h-2 rounded-full bg-red-400 ml-2" />&gt;8 brusco
        </div>
      </div>

      {/* Timeline de canciones */}
      <div>
        {live.map((track, i) => (
          <React.Fragment key={track.track_id + '_' + i}>
            {i > 0 && (
              <TransitionConnector prev={live[i - 1]} curr={track} />
            )}
            <TrackCard
              track={track}
              isStart={track.is_start}
              isEnd={track.is_end}
              onRemove={(!track.is_start && !track.is_end && onRemove) ? onRemove : undefined}
            />
          </React.Fragment>
        ))}
      </div>

      {/* Nota final */}
      <p className="text-xs text-slate-600 font-mono pt-4 border-t border-slate-800">
        Coste = distancia acústica acumulada · weight = 1 − similitud_coseno(energy, danceability, valence, bpm, key_cos, key_sin)
      </p>
    </section>
  );
}
