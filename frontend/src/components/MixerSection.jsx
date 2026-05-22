import React from 'react';
import TrackSearch from './TrackSearch';

function Knob({ label, color = 'var(--accent-a)' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
      <div style={{
        width: '36px', height: '36px', borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 30%, #e8ecf4, #c8cedd)',
        border: '2px solid var(--border-glow)',
        position: 'relative',
        boxShadow: 'inset 0 2px 4px #ffffff80, 0 2px 4px #00000018',
      }}>
        {/* Center dot */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: '8px', height: '8px', borderRadius: '50%',
          background: color,
          opacity: 0.5,
          transform: 'translate(-50%, -50%)',
        }} />
      </div>
      <div className="section-label" style={{ fontSize: '8px' }}>{label}</div>
    </div>
  );
}

function VUMeter({ value = 0.5, label }) {
  const bars = 12;
  const lit  = Math.round(value * bars);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
      <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: '2px' }}>
        {Array.from({ length: bars }).map((_, i) => {
          const active = i < lit;
          const color  = i >= 10 ? 'var(--vu-high)' : i >= 7 ? 'var(--vu-mid)' : 'var(--vu-low)';
          return (
            <div key={i} style={{
              width: '8px', height: '4px', borderRadius: '1px',
              background: active ? color : 'var(--bg-raised)',
              border: '1px solid var(--border)',
              boxShadow: active ? `0 0 4px ${color}60` : 'none',
              transition: 'background 0.1s',
            }} />
          );
        })}
      </div>
      <div className="section-label" style={{ fontSize: '7px' }}>{label}</div>
    </div>
  );
}

function Crossfader({ value = 0.5 }) {
  const pct = value * 100;
  return (
    <div style={{ flex: 1 }}>
      <div className="section-label" style={{ marginBottom: '6px', textAlign: 'center' }}>Crossfader</div>
      {/* Track exterior */}
      <div style={{
        position: 'relative',
        height: '12px',
        background: 'var(--bg-raised)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        margin: '0 8px',
        boxShadow: 'inset 0 1px 3px #00000015',
      }}>
        {/* Fill izquierdo */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${pct}%`,
          background: `linear-gradient(90deg, #5b3fd444, #009e7f44)`,
          borderRadius: '6px',
        }} />
        {/* Thumb del fader — centrado verticalmente sobre el track */}
        <div style={{
          position: 'absolute',
          left: `${pct}%`,
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '20px', height: '30px',
          background: 'linear-gradient(180deg, #ffffff 0%, #e8ecf4 50%, #d0d6e8 100%)',
          border: '1px solid var(--border-glow)',
          borderRadius: '4px',
          boxShadow: '0 2px 6px #00000025',
          cursor: 'pointer',
          zIndex: 2,
        }}>

        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 8px 0', fontFamily: "'Share Tech Mono', monospace", fontSize: '8px', color: 'var(--text-dim)' }}>
        <span>A</span><span>B</span>
      </div>
    </div>
  );
}

export default function MixerSection({
  startTrack, endTrack, setStartTrack, setEndTrack,
  graphReady, loading, onRecommend, canGenerate,
}) {
  const energyA = parseFloat(startTrack?.energy ?? 0.5);
  const energyB = parseFloat(endTrack?.energy ?? 0.5);
  const danceA  = parseFloat(startTrack?.danceability ?? 0.5);
  const danceB  = parseFloat(endTrack?.danceability ?? 0.5);

  return (
    <div style={{
      background: 'var(--bg-panel)',
      border: '1px solid var(--border)',
      borderRadius: '10px',
      boxShadow: '0 2px 8px #00000010',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-surface)',
        borderRadius: '10px 10px 0 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="panel-screw" />
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '10px', letterSpacing: '0.15em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            DJ Mixer — Track Selector
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[0.3, 0.6, 0.9].map((v, i) => (
            <div key={i} className="led" style={{
              width: '5px', height: '5px',
              background: graphReady ? 'var(--led-green)' : 'var(--bg-raised)',
              boxShadow: graphReady ? '0 0 4px var(--led-green)' : 'none',
              opacity: graphReady ? v + 0.1 : 0.5,
            }} />
          ))}
        </div>
        <div className="panel-screw" />
      </div>

      {/* Main mixer body */}
      <div style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'stretch' }}>

        {/* DECK A */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <TrackSearch
            label="Track de inicio"
            deckId="DECK A"
            accentColor="var(--accent-a)"
            selected={startTrack}
            onSelect={setStartTrack}
            disabled={!graphReady}
          />
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'flex-end', padding: '4px 0 6px', overflow: 'visible' }}>
            <Knob label="GAIN"  value={energyA}              color="var(--accent-a)" />
            <Knob label="HIGH"  value={0.7}                  color="var(--accent-a)" />
            <Knob label="MID"   value={0.5}                  color="var(--accent-a)" />
            <Knob label="LOW"   value={danceA}               color="var(--accent-a)" />
            <VUMeter value={energyA} label="VU" />
          </div>
        </div>

        {/* CENTER — Crossfader + Generate */}
        <div style={{
          width: '130px', flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'space-between',
          gap: '10px',
          paddingTop: '8px',
          paddingBottom: '8px',
        }}>
          <Crossfader value={0.5} />

          {/* CUE / MIX knobs */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <Knob label="CUE" value={0.6} color="var(--accent-warn)" />
            <Knob label="MIX" value={0.4} color="var(--accent-warn)" />
          </div>

          {/* Generate button */}
          <button
            onClick={onRecommend}
            disabled={!canGenerate}
            style={{
              width: '100%',
              padding: '12px 0',
              borderRadius: '5px',
              border: `1px solid ${canGenerate ? 'var(--accent-b)' : 'var(--border)'}`,
              background: canGenerate ? '#009e7f14' : 'var(--bg-surface)',
              color: canGenerate ? 'var(--accent-b)' : 'var(--text-dim)',
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: '10px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: canGenerate ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
              boxShadow: canGenerate ? '0 0 10px #009e7f22' : 'none',
              lineHeight: '1.6',
            }}
            onMouseEnter={e => { if (canGenerate) { e.currentTarget.style.background = '#009e7f28'; e.currentTarget.style.boxShadow = '0 0 16px #009e7f44'; } }}
            onMouseLeave={e => { if (canGenerate) { e.currentTarget.style.background = '#009e7f14'; e.currentTarget.style.boxShadow = '0 0 10px #009e7f22'; } }}
          >
            {loading ? '⏳ A* CALC...' : '⚡ GENERATE ROUTE'}
          </button>

          {!graphReady && (
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '8px', color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.5 }}>
              INIT GRAPH FIRST
            </div>
          )}
        </div>

        {/* DECK B */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <TrackSearch
            label="Track de destino"
            deckId="DECK B"
            accentColor="var(--accent-b)"
            selected={endTrack}
            onSelect={setEndTrack}
            disabled={!graphReady}
          />
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'flex-end', padding: '4px 0 6px', overflow: 'visible' }}>
            <VUMeter value={energyB} label="VU" />
            <Knob label="LOW"  value={danceB}  color="var(--accent-b)" />
            <Knob label="MID"  value={0.5}     color="var(--accent-b)" />
            <Knob label="HIGH" value={0.7}     color="var(--accent-b)" />
            <Knob label="GAIN" value={energyB} color="var(--accent-b)" />
          </div>
        </div>
      </div>
    </div>
  );
}
