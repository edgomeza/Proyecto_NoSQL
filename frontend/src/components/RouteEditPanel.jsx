import React, { useState, useMemo } from 'react';
import { getKeyLabel } from '../utils/music';

function applyFilters(original, { genres, bpmMin, bpmMax, camelots }) {
  if (!original?.length) return original;
  const start = original[0];
  const end   = original[original.length - 1];
  const kept  = original.slice(1, -1).filter(t => {
    if (genres.length   > 0 && !genres.includes(t.genre))              return false;
    if (bpmMin != null  && t.bpm < bpmMin)                             return false;
    if (bpmMax != null  && t.bpm > bpmMax)                             return false;
    if (camelots.length > 0 && !camelots.includes(getKeyLabel(t.key, t.mode)))  return false;
    return true;
  });
  return [start, ...kept, end];
}

export default function RouteEditPanel({ originalPlaylist, onFilter }) {
  const [open,     setOpen]     = useState(true);
  const [genres,   setGenres]   = useState([]);
  const [bpmMin,   setBpmMin]   = useState(null);
  const [bpmMax,   setBpmMax]   = useState(null);
  const [camelots, setCamelots] = useState([]);

  const intermediates = useMemo(
    () => originalPlaylist?.slice(1, -1) ?? [],
    [originalPlaylist],
  );

  const allGenres = useMemo(
    () => [...new Set(intermediates.map(t => t.genre).filter(Boolean))].sort(),
    [intermediates],
  );

  const bpmBounds = useMemo(() => {
    const bpms = (originalPlaylist ?? []).map(t => t.bpm).filter(v => v != null);
    if (!bpms.length) return { min: 60, max: 200 };
    return { min: Math.min(...bpms), max: Math.max(...bpms) };
  }, [originalPlaylist]);

  const allCamelots = useMemo(() => {
    const seen = new Set();
    const pairs = [];
    for (const t of intermediates) {
      const label = getKeyLabel(t.key, t.mode);
      if (!seen.has(label)) { seen.add(label); pairs.push({ key: t.key, mode: t.mode, label }); }
    }
    // Ordenar por número de nota (0-11) y luego mayor antes de menor
    return pairs.sort((a, b) => a.key !== b.key ? a.key - b.key : b.mode - a.mode)
                .map(p => p.label);
  }, [intermediates]);

  if (!intermediates.length) return null;

  const filters = { genres, bpmMin, bpmMax, camelots };
  const hasActive = genres.length > 0 || bpmMin != null || bpmMax != null || camelots.length > 0;
  const preview   = applyFilters(originalPlaylist, filters);
  const removed   = originalPlaylist.length - preview.length;

  function notify(nextFilters) {
    onFilter(applyFilters(originalPlaylist, nextFilters));
  }

  function toggleGenre(g) {
    const next = genres.includes(g) ? genres.filter(x => x !== g) : [...genres, g];
    setGenres(next);
    notify({ ...filters, genres: next });
  }

  function toggleCamelot(c) {
    const next = camelots.includes(c) ? camelots.filter(x => x !== c) : [...camelots, c];
    setCamelots(next);
    notify({ ...filters, camelots: next });
  }

  function handleBpmMin(v) {
    const n = v === '' ? null : Number(v);
    setBpmMin(n);
    notify({ ...filters, bpmMin: n });
  }

  function handleBpmMax(v) {
    const n = v === '' ? null : Number(v);
    setBpmMax(n);
    notify({ ...filters, bpmMax: n });
  }

  function reset() {
    setGenres([]); setBpmMin(null); setBpmMax(null); setCamelots([]);
    onFilter(originalPlaylist);
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      {/* ── Cabecera ── */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M3 4h18M7 8h10M11 12h2M9 16h6" />
          </svg>
          <span className="text-sm font-bold font-mono text-slate-300">Editar ruta</span>
          {hasActive && (
            <span className="text-xs font-mono px-1.5 py-0.5 rounded
                             bg-violet-600/20 text-violet-300 border border-violet-700">
              {removed > 0 ? `−${removed} canción${removed !== 1 ? 'es' : ''}` : 'filtros activos'}
            </span>
          )}
        </div>
        <svg className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
             fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-slate-800 space-y-5 pt-4">

          {/* ── BPM ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">
                Rango BPM
              </span>
              {(bpmMin != null || bpmMax != null) && (
                <button onClick={() => { setBpmMin(null); setBpmMax(null); notify({ ...filters, bpmMin: null, bpmMax: null }); }}
                        className="text-xs font-mono text-slate-600 hover:text-red-400 transition-colors">
                  Limpiar
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  placeholder={String(bpmBounds.min)}
                  value={bpmMin ?? ''}
                  min={bpmBounds.min} max={bpmBounds.max}
                  onChange={e => handleBpmMin(e.target.value)}
                  className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs
                             font-mono text-slate-300 focus:outline-none focus:border-violet-500"
                />
                <span className="text-xs text-slate-600 font-mono">—</span>
                <input
                  type="number"
                  placeholder={String(bpmBounds.max)}
                  value={bpmMax ?? ''}
                  min={bpmBounds.min} max={bpmBounds.max}
                  onChange={e => handleBpmMax(e.target.value)}
                  className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs
                             font-mono text-slate-300 focus:outline-none focus:border-violet-500"
                />
                <span className="text-xs text-slate-500 font-mono">BPM</span>
              </div>
              <span className="text-xs text-slate-700 font-mono">
                (ruta: {bpmBounds.min}–{bpmBounds.max})
              </span>
            </div>
          </div>

          {/* ── Tonalidad (Camelot) ── */}
          {allCamelots.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">
                  Tonalidad
                </span>
                {camelots.length > 0 && (
                  <button onClick={() => { setCamelots([]); notify({ ...filters, camelots: [] }); }}
                          className="text-xs font-mono text-slate-600 hover:text-red-400 transition-colors">
                    Limpiar
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {allCamelots.map(c => (
                  <button
                    key={c}
                    onClick={() => toggleCamelot(c)}
                    className={`text-xs font-mono px-2 py-0.5 rounded border transition-colors
                      ${camelots.includes(c)
                        ? 'border-cyan-500 bg-cyan-600/20 text-cyan-300'
                        : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                      }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-700 font-mono">
                Solo mantiene las canciones intermedias en las tonalidades seleccionadas
              </p>
            </div>
          )}

          {/* ── Géneros ── */}
          {allGenres.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">
                  Género
                </span>
                {genres.length > 0 && (
                  <button onClick={() => { setGenres([]); notify({ ...filters, genres: [] }); }}
                          className="text-xs font-mono text-slate-600 hover:text-red-400 transition-colors">
                    Limpiar
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                {allGenres.map(g => (
                  <button
                    key={g}
                    onClick={() => toggleGenre(g)}
                    className={`text-xs font-mono px-2.5 py-1 rounded-full border transition-colors
                      ${genres.includes(g)
                        ? 'border-violet-500 bg-violet-600/20 text-violet-300'
                        : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                      }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Reset ── */}
          {hasActive && (
            <button
              onClick={reset}
              className="flex items-center gap-1.5 text-xs font-mono text-slate-500
                         hover:text-white transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Restaurar ruta completa ({originalPlaylist.length} canciones)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
