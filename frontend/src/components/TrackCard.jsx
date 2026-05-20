import React from 'react';
import { getCamelot, getKeyLabel, getHarmonicInfo, getBpmCategory, getEnergyDelta } from '../utils/music';

// Barra de progreso para métricas acústicas
function MetricBar({ label, value, color = 'violet' }) {
  const pct = Math.round((value ?? 0) * 100);
  const colorMap = {
    violet: 'bg-violet-500',
    cyan:   'bg-cyan-500',
    yellow: 'bg-yellow-500',
    emerald:'bg-emerald-500',
  };
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-mono text-slate-500 w-16 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${colorMap[color] ?? colorMap.violet}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono text-slate-400 w-8 text-right">{pct}%</span>
    </div>
  );
}

// Badge de compatibilidad armónica con Camelot
function HarmonicBadge({ info, c1, c2 }) {
  const colorMap = {
    emerald: 'bg-emerald-900/40 text-emerald-400 border-emerald-800',
    yellow:  'bg-yellow-900/40 text-yellow-400 border-yellow-800',
    red:     'bg-red-900/40 text-red-400 border-red-800',
    slate:   'bg-slate-800 text-slate-400 border-slate-700',
  };
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-mono ${colorMap[info.color]}`}>
      <span>{c1} → {c2}</span>
      <span className="opacity-60">|</span>
      <span>{info.label}</span>
    </div>
  );
}

// Conector visual entre tarjetas mostrando las métricas de transición
export function TransitionConnector({ prev, curr }) {
  const prevCamelot = getCamelot(prev.key, prev.mode);
  const currCamelot = getCamelot(curr.key, curr.mode);
  const harmonic    = getHarmonicInfo(prevCamelot, currCamelot);
  const bpmCat      = getBpmCategory(curr.bpm - prev.bpm);
  const eDelta      = getEnergyDelta(prev.energy, curr.energy);
  const prevLabel   = getKeyLabel(prev.key, prev.mode);
  const currLabel   = getKeyLabel(curr.key, curr.mode);

  const bpmColorMap = { emerald: 'text-emerald-400', yellow: 'text-yellow-400', red: 'text-red-400' };
  const eColor = eDelta.delta > 5 ? 'text-red-400' : eDelta.delta < -5 ? 'text-cyan-400' : 'text-emerald-400';

  return (
    <div className="flex items-center gap-2 py-2 px-4 my-1">
      {/* Línea vertical */}
      <div className="w-px h-10 bg-gradient-to-b from-violet-800 to-cyan-800 mx-5 shrink-0" />
      {/* Métricas de transición */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className={`text-xs font-mono font-bold ${bpmColorMap[bpmCat.color]}`}>
          {bpmCat.label}
        </span>
        <span className={`text-xs font-mono ${eColor}`}>
          Energía {eDelta.label}
        </span>
        <HarmonicBadge info={harmonic} c1={prevLabel} c2={currLabel} />
        {curr.step_cost != null && (
          <span className="text-xs font-mono text-slate-600">
            coste: {curr.step_cost.toFixed(3)}
          </span>
        )}
      </div>
    </div>
  );
}

// Tarjeta principal de canción
export default function TrackCard({ track, isStart, isEnd, onRemove }) {
  const camelot = getCamelot(track.key, track.mode);

  const roleBadge = isStart
    ? 'bg-violet-600 text-white'
    : isEnd
    ? 'bg-cyan-600 text-white'
    : 'bg-slate-800 text-slate-400';

  const roleLabel = isStart ? 'INICIO' : isEnd ? 'DESTINO' : `#${track.step}`;

  const borderClass = isStart
    ? 'border-violet-700'
    : isEnd
    ? 'border-cyan-700'
    : 'border-slate-800';

  return (
    <div className={`bg-slate-900 border ${borderClass} rounded-xl p-4 space-y-3 relative`}>
      {/* Botón de eliminación para canciones intermedias */}
      {onRemove && (
        <button
          onClick={() => onRemove(track.track_id)}
          title="Eliminar de la ruta"
          className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center
                     rounded-full text-slate-600 hover:text-red-400 hover:bg-red-900/30
                     transition-colors duration-150 z-10"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Cabecera: número de paso + nombre + artista */}
      <div className="flex items-start gap-3">
        <span className={`shrink-0 text-xs font-mono font-bold px-2 py-0.5 rounded ${roleBadge}`}>
          {roleLabel}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-white truncate leading-tight pr-6">
            {track.track_name}
          </h3>
          <p className="text-xs text-slate-400 truncate mt-0.5">{track.artists}</p>
        </div>
        {track.genre && (
          <span className="shrink-0 text-xs font-mono bg-slate-800 text-slate-500
                           px-2 py-0.5 rounded capitalize mr-4">
            {track.genre}
          </span>
        )}
      </div>

      {/* Métricas principales — chips */}
      <div className="flex flex-wrap gap-2">
        <Chip color="violet" label={`${track.bpm} BPM`} />
        <Chip color="cyan" label={getKeyLabel(track.key, track.mode)} title={`Camelot: ${camelot}`} />
        {track.popularity != null && (
          <Chip color="slate" label={`Pop. ${track.popularity}`} />
        )}
      </div>

      {/* Barras de características acústicas */}
      <div className="space-y-1.5">
        <MetricBar label="Energy"   value={track.energy}       color="violet" />
        <MetricBar label="Dance"    value={track.danceability}  color="cyan"   />
        <MetricBar label="Valence"  value={track.valence}       color="yellow" />
        <MetricBar label="Acoustic" value={track.acousticness}  color="emerald"/>
      </div>
    </div>
  );
}

function Chip({ label, color, title }) {
  const colorMap = {
    violet: 'bg-violet-900/50 text-violet-300 border-violet-800',
    cyan:   'bg-cyan-900/50 text-cyan-300 border-cyan-800',
    yellow: 'bg-yellow-900/50 text-yellow-300 border-yellow-800',
    slate:  'bg-slate-800 text-slate-400 border-slate-700',
  };
  return (
    <span
      title={title}
      className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${colorMap[color] ?? colorMap.slate}`}
    >
      {label}
    </span>
  );
}
