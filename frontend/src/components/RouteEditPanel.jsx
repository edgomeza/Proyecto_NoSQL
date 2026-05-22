import React, { useState, useMemo } from 'react';
import { getKeyLabel } from '../utils/music';

function applyFilters(original, { genres, bpmMin, bpmMax, camelots }) {
  if (!original?.length) return original;
  const start = original[0];
  const end   = original[original.length - 1];
  const kept  = original.slice(1, -1).filter(t => {
    if (genres.length   > 0 && !genres.includes(t.genre))                    return false;
    if (bpmMin != null  && t.bpm < bpmMin)                                   return false;
    if (bpmMax != null  && t.bpm > bpmMax)                                   return false;
    if (camelots.length > 0 && !camelots.includes(getKeyLabel(t.key, t.mode))) return false;
    return true;
  });
  return [start, ...kept, end];
}

export default function RouteEditPanel({ originalPlaylist, onFilter }) {
  const [open,     setOpen]     = useState(false);
  const [genres,   setGenres]   = useState([]);
  const [bpmMin,   setBpmMin]   = useState(null);
  const [bpmMax,   setBpmMax]   = useState(null);
  const [camelots, setCamelots] = useState([]);

  const intermediates = useMemo(() => originalPlaylist?.slice(1, -1) ?? [], [originalPlaylist]);
  const allGenres     = useMemo(() => [...new Set(intermediates.map(t => t.genre).filter(Boolean))].sort(), [intermediates]);
  const bpmBounds     = useMemo(() => {
    const bpms = (originalPlaylist ?? []).map(t => t.bpm).filter(v => v != null);
    if (!bpms.length) return { min: 60, max: 200 };
    return { min: Math.min(...bpms), max: Math.max(...bpms) };
  }, [originalPlaylist]);
  const allCamelots = useMemo(() => {
    const seen = new Set(); const pairs = [];
    for (const t of intermediates) {
      const label = getKeyLabel(t.key, t.mode);
      if (!seen.has(label)) { seen.add(label); pairs.push({ key: t.key, mode: t.mode, label }); }
    }
    return pairs.sort((a, b) => a.key !== b.key ? a.key - b.key : b.mode - a.mode).map(p => p.label);
  }, [intermediates]);

  if (!intermediates.length) return null;

  const filters   = { genres, bpmMin, bpmMax, camelots };
  const hasActive = genres.length > 0 || bpmMin != null || bpmMax != null || camelots.length > 0;
  const preview   = applyFilters(originalPlaylist, filters);
  const removed   = originalPlaylist.length - preview.length;

  function notify(f) { onFilter(applyFilters(originalPlaylist, f)); }
  function toggleGenre(g) { const n = genres.includes(g) ? genres.filter(x => x !== g) : [...genres, g]; setGenres(n); notify({ ...filters, genres: n }); }
  function toggleCamelot(c) { const n = camelots.includes(c) ? camelots.filter(x => x !== c) : [...camelots, c]; setCamelots(n); notify({ ...filters, camelots: n }); }
  function handleBpmMin(v) { const n = v === '' ? null : Number(v); setBpmMin(n); notify({ ...filters, bpmMin: n }); }
  function handleBpmMax(v) { const n = v === '' ? null : Number(v); setBpmMax(n); notify({ ...filters, bpmMax: n }); }
  function reset() { setGenres([]); setBpmMin(null); setBpmMax(null); setCamelots([]); onFilter(originalPlaylist); }

  const chipBase = { fontFamily: "'Share Tech Mono', monospace", fontSize: '10px', padding: '3px 8px', borderRadius: '3px', border: '1px solid', cursor: 'pointer', background: 'none', transition: 'all 0.1s' };

  return (
    <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer',
          borderBottom: open ? '1px solid var(--border)' : 'none',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface)'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '10px', color: 'var(--accent-a)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            ▸ Route Filters
          </span>
          {hasActive && (
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '9px', padding: '1px 7px', borderRadius: '3px', border: '1px solid #5b3fd444', background: '#7b5cff14', color: 'var(--accent-a)' }}>
              {removed > 0 ? `−${removed} track${removed !== 1 ? 's' : ''}` : 'active'}
            </span>
          )}
        </div>
        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '11px', color: 'var(--text-dim)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▶</span>
      </button>

      {open && (
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* BPM */}
          <div>
            <div className="section-label" style={{ marginBottom: '7px' }}>Rango BPM · {bpmBounds.min}–{bpmBounds.max}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="number" placeholder={String(bpmBounds.min)} value={bpmMin ?? ''} min={bpmBounds.min} max={bpmBounds.max} onChange={e => handleBpmMin(e.target.value)} style={{ width: '64px' }} />
              <span style={{ color: 'var(--text-dim)', fontFamily: "'Share Tech Mono', monospace", fontSize: '11px' }}>—</span>
              <input type="number" placeholder={String(bpmBounds.max)} value={bpmMax ?? ''} min={bpmBounds.min} max={bpmBounds.max} onChange={e => handleBpmMax(e.target.value)} style={{ width: '64px' }} />
              <span className="section-label">BPM</span>
            </div>
          </div>

          {/* Camelot */}
          {allCamelots.length > 0 && (
            <div>
              <div className="section-label" style={{ marginBottom: '7px' }}>Tonalidad (Camelot)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {allCamelots.map(c => (
                  <button key={c} onClick={() => toggleCamelot(c)} style={{
                    ...chipBase,
                    color: camelots.includes(c) ? 'var(--accent-b)' : 'var(--text-dim)',
                    borderColor: camelots.includes(c) ? '#009e7f44' : 'var(--border)',
                    background: camelots.includes(c) ? '#009e7f14' : 'none',
                  }}>{c}</button>
                ))}
              </div>
            </div>
          )}

          {/* Genres */}
          {allGenres.length > 0 && (
            <div>
              <div className="section-label" style={{ marginBottom: '7px' }}>Género</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', maxHeight: '100px', overflowY: 'auto' }}>
                {allGenres.map(g => (
                  <button key={g} onClick={() => toggleGenre(g)} style={{
                    ...chipBase,
                    color: genres.includes(g) ? 'var(--accent-a)' : 'var(--text-dim)',
                    borderColor: genres.includes(g) ? '#5b3fd444' : 'var(--border)',
                    background: genres.includes(g) ? '#7b5cff14' : 'none',
                  }}>{g}</button>
                ))}
              </div>
            </div>
          )}

          {hasActive && (
            <button onClick={reset} style={{
              background: 'none', border: '1px solid var(--border)', borderRadius: '4px',
              padding: '5px 12px', cursor: 'pointer',
              fontFamily: "'Share Tech Mono', monospace", fontSize: '9px',
              color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase',
              transition: 'all 0.1s',
            }}
              onMouseEnter={e => { e.target.style.color = 'var(--text-bright)'; e.target.style.borderColor = 'var(--border-glow)'; }}
              onMouseLeave={e => { e.target.style.color = 'var(--text-dim)'; e.target.style.borderColor = 'var(--border)'; }}
            >
              ↺ Restaurar ruta completa ({originalPlaylist.length} canciones)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
