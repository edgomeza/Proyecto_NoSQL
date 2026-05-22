import React from 'react';
import { getCamelot, getKeyLabel, getHarmonicInfo, getBpmCategory, getEnergyDelta } from '../utils/music';

function AcousticBar({ label, value, color }) {
  const pct = Math.round((value ?? 0) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div className="section-label" style={{ width: '52px', textAlign: 'right', flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, height: '3px', background: 'var(--bg-deep)', borderRadius: '2px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: '2px',
          background: color,
          boxShadow: `0 0 4px ${color}80`,
          transition: 'width 0.6s ease',
        }} />
      </div>
      <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '9px', color: 'var(--text-dim)', width: '26px', textAlign: 'right' }}>{pct}%</div>
    </div>
  );
}

export function TransitionConnector({ prev, curr }) {
  const prevCamelot = getCamelot(prev.key, prev.mode);
  const currCamelot = getCamelot(curr.key, curr.mode);
  const harmonic    = getHarmonicInfo(prevCamelot, currCamelot);
  const bpmCat      = getBpmCategory(curr.bpm - prev.bpm);
  const eDelta      = getEnergyDelta(prev.energy, curr.energy);

  const compatClass = harmonic.color === 'emerald' ? 'compat-perfect'
                    : harmonic.color === 'yellow'  ? 'compat-harmonic'
                    : 'compat-creative';

  const bpmColor = bpmCat.color === 'emerald' ? 'var(--led-green)'
                 : bpmCat.color === 'yellow'  ? 'var(--led-amber)'
                 : 'var(--led-red)';

  const eColor = eDelta?.delta > 5 ? 'var(--led-red)' : eDelta?.delta < -5 ? 'var(--accent-a)' : 'var(--led-green)';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '4px 16px',
      margin: '2px 0',
    }}>
      <div style={{
        width: '2px', height: '28px',
        background: `linear-gradient(180deg, var(--accent-a), var(--accent-b))`,
        marginLeft: '20px', flexShrink: 0,
        boxShadow: '0 0 6px #5b3fd440',
      }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
        <span className={`metric-chip ${compatClass}`}>
          {getKeyLabel(prev.key, prev.mode)} → {getKeyLabel(curr.key, curr.mode)} · {harmonic.label}
        </span>
        <span className="metric-chip" style={{ color: bpmColor, borderColor: `${bpmColor}44`, background: `${bpmColor}10` }}>
          {bpmCat.label}
        </span>
        {eDelta && (
          <span className="metric-chip" style={{ color: eColor, borderColor: `${eColor}44`, background: `${eColor}10` }}>
            Energía {eDelta.label}
          </span>
        )}
        {curr.step_cost != null && (
          <span className="metric-chip" style={{ color: 'var(--text-dim)', borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
            Δ {curr.step_cost.toFixed(3)}
          </span>
        )}
      </div>
    </div>
  );
}

export default function TrackCard({ track, isStart, isEnd, onRemove }) {
  const camelot    = getCamelot(track.key, track.mode);
  const accentColor = isStart ? 'var(--accent-a)' : isEnd ? 'var(--accent-b)' : 'var(--text-dim)';
  const roleLabel  = isStart ? 'DECK A' : isEnd ? 'DECK B' : `#${track.step}`;

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: `1px solid ${isStart ? '#5b3fd444' : isEnd ? '#009e7f44' : 'var(--border)'}`,
      borderRadius: '6px',
      padding: '12px 14px',
      position: 'relative',
      animation: 'slide-up 0.3s ease both',
    }}
      className="animate-slide-up"
    >
      {/* Left accent bar */}
      <div style={{
        position: 'absolute', left: 0, top: '8px', bottom: '8px',
        width: '2px', borderRadius: '0 1px 1px 0',
        background: accentColor,
        boxShadow: `0 0 6px ${accentColor}80`,
      }} />

      {onRemove && (
        <button onClick={() => onRemove(track.track_id)} style={{
          position: 'absolute', top: '8px', right: '8px',
          background: 'none', border: 'none', padding: '2px 4px',
          cursor: 'pointer', color: 'var(--text-dim)',
          fontFamily: "'Share Tech Mono', monospace", fontSize: '10px', lineHeight: 1,
          borderRadius: '3px', transition: 'all 0.1s',
        }}
          onMouseEnter={e => { e.target.style.color = 'var(--led-red)'; e.target.style.background = '#ff335518'; }}
          onMouseLeave={e => { e.target.style.color = 'var(--text-dim)'; e.target.style.background = 'none'; }}
          title="Eliminar de la ruta"
        >✕</button>
      )}

      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div>
          <div style={{
            fontFamily: "'Share Tech Mono', monospace", fontSize: '9px',
            color: accentColor, letterSpacing: '0.15em', marginBottom: '3px',
          }}>{roleLabel}</div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-bright)', lineHeight: 1.2, paddingRight: onRemove ? '20px' : 0 }}>
            {track.track_name}
          </div>
          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '10px', color: 'var(--text-mid)', marginTop: '2px' }}>
            {track.artists}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'flex-end', flexShrink: 0 }}>
          <span className="metric-chip" style={{ color: accentColor, borderColor: `${accentColor}44`, background: `${accentColor}10` }}>
            {track.bpm} BPM
          </span>
          <span className="metric-chip" style={{ color: 'var(--text-mid)', borderColor: 'var(--border)', background: 'var(--bg-raised)' }}>
            {camelot}
          </span>
          {track.genre && (
            <span className="metric-chip" style={{ color: 'var(--text-dim)', borderColor: 'var(--border)', background: 'var(--bg-raised)' }}>
              {track.genre}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <AcousticBar label="Energy"   value={track.energy}       color="var(--accent-a)" />
        <AcousticBar label="Dance"    value={track.danceability}  color="var(--accent-b)" />
        <AcousticBar label="Valence"  value={track.valence}       color="var(--accent-warn)" />
        <AcousticBar label="Acoustic" value={track.acousticness}  color="#888" />
      </div>
    </div>
  );
}
