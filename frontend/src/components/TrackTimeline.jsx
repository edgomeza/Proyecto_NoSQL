import React from 'react';
import TrackCard, { TransitionConnector } from './TrackCard';

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

  const live = playlist.map((track, i) => ({
    ...track, step: i + 1,
    is_start: i === 0, is_end: i === playlist.length - 1,
    step_cost: i === 0 ? 0 : cosineDist(playlist[i - 1], track),
  }));

  const totalCost   = live.reduce((s, t) => s + t.step_cost, 0);
  const totalHops   = live.length;
  const intermediates = totalHops - 2;

  return (
    <section style={{ animation: 'fade-in 0.4s ease' }}>
      <div style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '14px 18px',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div>
          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '10px', color: 'var(--text-dim)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '3px' }}>
            A* Route Found{pathType === 'bridge' ? ' · acoustic bridge' : ''}
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-bright)' }}>
            Ruta óptima calculada
          </div>
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          {[
            { val: totalHops,   label: 'canciones',  color: 'var(--accent-a)' },
            { val: intermediates, label: 'bridges', color: 'var(--text-mid)' },
            { val: totalCost.toFixed(3), label: 'coste total', color: 'var(--accent-b)' },
          ].map(({ val, label, color }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '22px', fontWeight: 700, color, lineHeight: 1 }}>{val}</div>
              <div className="section-label" style={{ marginTop: '3px' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '10px',
        padding: '8px 12px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        marginBottom: '10px',
      }}>
        {[
          { cls: 'compat-perfect',  label: 'Perfecta / Relativa' },
          { cls: 'compat-harmonic', label: 'Armónica / Compatible' },
          { cls: 'compat-creative', label: 'Creativa' },
        ].map(({ cls, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div className={`metric-chip ${cls}`} style={{ padding: '1px 6px', fontSize: '8px' }}>●</div>
            <span className="section-label">{label}</span>
          </div>
        ))}
        {intermediates > 0 && (
          <div style={{ marginLeft: 'auto', fontFamily: "'Share Tech Mono', monospace", fontSize: '9px', color: 'var(--text-dim)' }}>
            ✕ para eliminar intermedias
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {live.map((track, i) => (
          <React.Fragment key={track.track_id + '_' + i}>
            {i > 0 && <TransitionConnector prev={live[i - 1]} curr={track} />}
            <TrackCard
              track={track}
              isStart={track.is_start}
              isEnd={track.is_end}
              onRemove={(!track.is_start && !track.is_end && onRemove) ? onRemove : undefined}
            />
          </React.Fragment>
        ))}
      </div>

      <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '9px', color: 'var(--text-dim)', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
        weight = 1 − cosine_similarity(energy, danceability, valence, bpm_norm, key_cos, key_sin)
      </div>
    </section>
  );
}
