import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';
import { getKeyLabel } from '../utils/music';

// Debounce simple sin dependencias externas
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function TrackSearch({ label, selected, onSelect, disabled }) {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [open, setOpen]         = useState(false);
  const debouncedQuery          = useDebounce(query, 280);
  const containerRef            = useRef(null);

  // Buscar en el backend cuando cambia la query debounced
  useEffect(() => {
    if (debouncedQuery.length < 2) { setResults([]); setOpen(false); return; }
    let cancelled = false;
    setLoading(true);
    api.searchTracks(debouncedQuery)
      .then(({ tracks }) => {
        if (!cancelled) { setResults(tracks); setOpen(true); }
      })
      .catch(() => { if (!cancelled) setResults([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handler(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleSelect(track) {
    onSelect(track);
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  function handleClear(e) {
    e.stopPropagation();
    onSelect(null);
    setQuery('');
  }

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      <label className="block text-xs font-mono text-slate-500 mb-1.5 uppercase tracking-widest">
        {label}
      </label>

      {/* Campo de búsqueda o resumen de la selección */}
      <div
        className={`relative rounded-xl border ${
          disabled ? 'border-slate-800 bg-slate-900/50' :
          open      ? 'border-violet-500 bg-slate-900' :
                      'border-slate-700 bg-slate-900 hover:border-slate-600'
        } transition-colors`}
      >
        {selected ? (
          /* Track seleccionado — mostrar resumen compacto */
          <div className="flex items-center gap-3 p-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{selected.track_name}</p>
              <p className="text-xs text-slate-400 truncate">{selected.artists}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-mono bg-violet-900/50 text-violet-300 px-2 py-0.5 rounded">
                {getKeyLabel(selected.key, selected.mode)}
              </span>
              <span className="text-xs font-mono text-cyan-400">{selected.bpm} BPM</span>
              <button
                onClick={handleClear}
                disabled={disabled}
                className="text-slate-500 hover:text-red-400 transition-colors ml-1"
                title="Quitar selección"
              >✕</button>
            </div>
          </div>
        ) : (
          /* Input de búsqueda */
          <div className="flex items-center gap-2 px-3">
            <svg className={`w-4 h-4 shrink-0 ${loading ? 'text-violet-400 animate-spin' : 'text-slate-500'}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {loading
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              }
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => results.length && setOpen(true)}
              disabled={disabled}
              placeholder="Buscar canción o artista..."
              className="w-full py-3 bg-transparent text-sm text-white placeholder-slate-600
                         font-mono outline-none disabled:cursor-not-allowed"
            />
          </div>
        )}
      </div>

      {/* Dropdown de resultados */}
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-700
                        bg-slate-900 shadow-2xl shadow-black/60 overflow-hidden">
          <ul className="max-h-72 overflow-y-auto divide-y divide-slate-800">
            {results.map((track) => (
              <li
                key={track.track_id}
                onClick={() => handleSelect(track)}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer
                           hover:bg-slate-800 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate group-hover:text-violet-300 transition-colors">
                    {track.track_name}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{track.artists}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-500 font-mono">{track.genre}</span>
                  <span className="text-xs font-mono bg-violet-900/40 text-violet-400 px-1.5 py-0.5 rounded">
                    {getKeyLabel(track.key, track.mode)}
                  </span>
                  <span className="text-xs font-mono text-cyan-500">{track.bpm}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {open && !loading && results.length === 0 && query.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-700
                        bg-slate-900 px-4 py-3 text-sm text-slate-500 font-mono shadow-xl">
          Sin resultados para «{query}»
        </div>
      )}
    </div>
  );
}
