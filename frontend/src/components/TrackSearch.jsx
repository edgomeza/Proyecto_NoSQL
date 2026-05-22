import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { getKeyLabel, getCamelot } from '../utils/music';

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function MiniWave({ color, active }) {
  const heights = [30, 60, 45, 80, 55, 70, 40, 90, 50, 65, 35, 75];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '24px', opacity: active ? 1 : 0.3 }}>
      {heights.map((h, i) => (
        <div key={i} className="wave-bar" style={{
          width: '3px',
          height: `${h}%`,
          background: color,
          animationName: active ? 'vu-dance' : 'none',
          animationDuration: `${0.4 + i * 0.07}s`,
          animationTimingFunction: 'ease-in-out',
          animationIterationCount: 'infinite',
          animationDelay: `${i * 0.05}s`,
        }} />
      ))}
    </div>
  );
}

export default function TrackSearch({ label, deckId, accentColor, selected, onSelect, disabled }) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]       = useState(false);
  const debouncedQuery        = useDebounce(query, 280);
  const containerRef          = useRef(null);

  useEffect(() => {
    if (debouncedQuery.length < 2) { setResults([]); setOpen(false); return; }
    let cancelled = false;
    setLoading(true);
    api.searchTracks(debouncedQuery)
      .then(({ tracks }) => { if (!cancelled) { setResults(tracks); setOpen(true); } })
      .catch(() => { if (!cancelled) setResults([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  useEffect(() => {
    function handler(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleSelect(track) { onSelect(track); setQuery(''); setResults([]); setOpen(false); }
  function handleClear(e) { e.stopPropagation(); onSelect(null); setQuery(''); }

  const borderStyle = `1px solid ${disabled ? 'var(--border)' : open ? accentColor : 'var(--border-glow)'}`;

  return (
    <div ref={containerRef} style={{ flex: 1, minWidth: 0, position: 'relative' }}>
      {/* Deck panel */}
      <div style={{
        background: 'var(--bg-surface)',
        border: borderStyle,
        borderRadius: '6px',
        transition: 'border-color 0.15s',
        boxShadow: open ? `0 0 12px ${accentColor}22` : 'none',
      }}>
        {/* Deck header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px 6px',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <div style={{
              fontFamily: "'Share Tech Mono', monospace", fontSize: '9px',
              letterSpacing: '0.15em', color: accentColor, textTransform: 'uppercase',
            }}>
              {deckId}
            </div>
            <div style={{
              width: '1px', height: '10px', background: 'var(--border)',
            }} />
            <div className="section-label">{label}</div>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <div className={`led ${selected ? 'led-green' : 'led-off'}`} style={{ width: '6px', height: '6px' }} />
          </div>
        </div>

        {/* Waveform display area */}
        <div style={{
          padding: '8px 12px 6px',
          background: 'var(--bg-deep)',
          borderBottom: '1px solid var(--border)',
          minHeight: '44px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <MiniWave color={accentColor} active={!!selected} />
          {selected ? (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-bright)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selected.track_name}
              </div>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '10px', color: 'var(--text-mid)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selected.artists}
              </div>
            </div>
          ) : (
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '10px', color: 'var(--text-dim)' }}>
              — no track loaded —
            </div>
          )}
        </div>

        {/* Metrics row */}
        {selected && (
          <div style={{
            display: 'flex', gap: '6px', padding: '7px 12px',
            borderBottom: '1px solid var(--border)',
            flexWrap: 'wrap',
          }}>
            <span className="metric-chip" style={{ color: accentColor, borderColor: `${accentColor}44`, background: `${accentColor}10` }}>
              {selected.bpm} BPM
            </span>
            <span className="metric-chip" style={{ color: 'var(--text-mid)', borderColor: 'var(--border)', background: 'var(--bg-raised)' }}>
              {getCamelot(selected.key, selected.mode)}
            </span>
            <span className="metric-chip" style={{ color: 'var(--text-mid)', borderColor: 'var(--border)', background: 'var(--bg-raised)' }}>
              {getKeyLabel(selected.key, selected.mode)}
            </span>
            {selected.genre && (
              <span className="metric-chip" style={{ color: 'var(--text-dim)', borderColor: 'var(--border)', background: 'var(--bg-raised)' }}>
                {selected.genre}
              </span>
            )}
          </div>
        )}

        {/* Search input */}
        <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {loading ? (
            <svg style={{ width: '12px', height: '12px', color: accentColor, flexShrink: 0, animation: 'spin 1s linear infinite' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : (
            <svg style={{ width: '12px', height: '12px', color: 'var(--text-dim)', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => results.length && setOpen(true)}
            disabled={disabled}
            placeholder={selected ? 'Cambiar track...' : 'Buscar canción o artista...'}
            style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: '0', fontSize: '11px' }}
          />
          {selected && (
            <button onClick={handleClear} disabled={disabled} style={{
              background: 'none', border: 'none', padding: '0 2px',
              cursor: 'pointer', color: 'var(--text-dim)', fontSize: '12px', lineHeight: 1,
              flexShrink: 0,
            }}
              onMouseEnter={e => e.target.style.color = 'var(--led-red)'}
              onMouseLeave={e => e.target.style.color = 'var(--text-dim)'}
            >✕</button>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', zIndex: 50, top: '100%', left: 0, right: 0,
          marginTop: '4px',
          background: 'var(--bg-panel)',
          border: `1px solid ${accentColor}55`,
          borderRadius: '6px',
          boxShadow: `0 8px 32px #00000020, 0 0 16px ${accentColor}18`,
          overflow: 'hidden',
        }}>
          <ul style={{ maxHeight: '260px', overflowY: 'auto', margin: 0, padding: 0, listStyle: 'none' }}>
            {results.map(track => (
              <li key={track.track_id} onClick={() => handleSelect(track)} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 12px',
                cursor: 'pointer',
                borderBottom: '1px solid var(--border)',
                transition: 'background 0.1s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-raised)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-bright)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {track.track_name}
                  </div>
                  <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '10px', color: 'var(--text-mid)' }}>
                    {track.artists}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                  <span className="metric-chip" style={{ color: accentColor, borderColor: `${accentColor}44`, background: `${accentColor}10` }}>
                    {track.bpm}
                  </span>
                  <span className="metric-chip" style={{ color: 'var(--text-dim)', borderColor: 'var(--border)', background: 'var(--bg-raised)' }}>
                    {getCamelot(track.key, track.mode)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {open && !loading && results.length === 0 && query.length >= 2 && (
        <div style={{
          position: 'absolute', zIndex: 50, top: '100%', left: 0, right: 0,
          marginTop: '4px', padding: '12px',
          background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '6px',
          fontFamily: "'Share Tech Mono', monospace", fontSize: '11px', color: 'var(--text-dim)',
        }}>
          Sin resultados para «{query}»
        </div>
      )}
    </div>
  );
}
