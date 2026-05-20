import React from 'react';

const HOPS_MIN = 1;
const HOPS_MAX = 10;

export default function FiltersPanel({
  hops, onHopsChange,
  availableGenres, selectedGenres, onGenresChange,
  disabled,
}) {
  const isAuto = hops === null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
      <h2 className="text-sm font-bold font-mono text-slate-300">Opciones de ruta</h2>

      {/* ── Pasos intermedios ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">
            Pasos intermedios
          </span>
          <button
            onClick={() => onHopsChange(isAuto ? 3 : null)}
            disabled={disabled}
            className={`text-xs font-mono px-2.5 py-0.5 rounded-full border transition-colors
              ${isAuto
                ? 'border-violet-500 bg-violet-600/20 text-violet-300'
                : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
              }`}
          >
            {isAuto ? 'Auto (máx. 4)' : 'Auto'}
          </button>
        </div>

        {isAuto ? (
          <p className="text-xs text-slate-600 font-mono">
            Mejor ruta con máximo 4 canciones intermedias
          </p>
        ) : (
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={HOPS_MIN}
              max={HOPS_MAX}
              value={hops}
              onChange={e => onHopsChange(parseInt(e.target.value))}
              disabled={disabled}
              className="flex-1 h-1.5 accent-violet-500 cursor-pointer disabled:opacity-50"
            />
            <div className="flex items-baseline gap-1 shrink-0 w-20 justify-end">
              <span className="text-2xl font-black font-mono text-violet-400">{hops}</span>
              <span className="text-xs text-slate-500 font-mono">pasos</span>
            </div>
          </div>
        )}

        {!isAuto && (
          <p className="text-xs text-slate-600 font-mono">
            La playlist tendrá {hops + 2} canciones en total (inicio + {hops} intermedias + destino)
          </p>
        )}
      </div>

      {/* ── Géneros intermedios ── */}
      {availableGenres.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">
              Géneros intermedios
            </span>
            {selectedGenres.length > 0 && (
              <button
                onClick={() => onGenresChange([])}
                disabled={disabled}
                className="text-xs font-mono text-slate-500 hover:text-red-400 transition-colors"
              >
                Limpiar
              </button>
            )}
          </div>

          <p className="text-xs text-slate-600 font-mono">
            {selectedGenres.length === 0
              ? 'Sin filtro — pasa por cualquier género'
              : `Solo canciones intermedias de: ${selectedGenres.join(', ')}`}
          </p>

          <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
            {availableGenres.map(genre => {
              const selected = selectedGenres.includes(genre);
              return (
                <button
                  key={genre}
                  onClick={() => onGenresChange(
                    selected
                      ? selectedGenres.filter(g => g !== genre)
                      : [...selectedGenres, genre]
                  )}
                  disabled={disabled}
                  className={`text-xs font-mono px-2.5 py-1 rounded-full border transition-colors
                    ${selected
                      ? 'border-violet-500 bg-violet-600/20 text-violet-300'
                      : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {genre}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
