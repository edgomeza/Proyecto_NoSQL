import React from 'react';
import TrackCard, { TransitionConnector } from './TrackCard';

export default function TrackTimeline({ playlist, totalCost, totalHops }) {
  if (!playlist?.length) return null;

  return (
    <section className="space-y-1 mt-8">
      {/* Cabecera de resultados */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-white font-mono">
            Ruta óptima encontrada
          </h2>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Algoritmo Dijkstra · grafo GDS · similitud coseno
          </p>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <p className="text-2xl font-black text-violet-400 font-mono">{totalHops}</p>
            <p className="text-xs text-slate-500 font-mono">canciones</p>
          </div>
          <div>
            <p className="text-2xl font-black text-cyan-400 font-mono">{totalCost?.toFixed(3)}</p>
            <p className="text-xs text-slate-500 font-mono">coste total</p>
          </div>
        </div>
      </div>

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
        {playlist.map((track, i) => (
          <React.Fragment key={track.track_id + '_' + i}>
            {i > 0 && (
              <TransitionConnector prev={playlist[i - 1]} curr={track} />
            )}
            <TrackCard
              track={track}
              isStart={track.is_start}
              isEnd={track.is_end}
            />
          </React.Fragment>
        ))}
      </div>

      {/* Nota final */}
      <p className="text-xs text-slate-600 font-mono pt-4 border-t border-slate-800">
        Coste = distancia acústica acumulada · weight = 1 − similitud_coseno(energy, danceability, valence, bpm_norm)
      </p>
    </section>
  );
}
