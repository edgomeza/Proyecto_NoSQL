import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from './services/api';
import GraphPanel from './components/GraphPanel';
import MixerSection from './components/MixerSection';
import TrackTimeline from './components/TrackTimeline';
import RouteEditPanel from './components/RouteEditPanel';

const POLL_INTERVAL_MS = 3000;
const INITIAL_JOB = { status: 'idle', step: '', progress: 0, stats: null, error: null };

export default function App() {
  const [job,        setJob]        = useState(INITIAL_JOB);
  const [startTrack, setStartTrack] = useState(null);
  const [endTrack,   setEndTrack]   = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [result,     setResult]     = useState(null);
  const [playlist,   setPlaylist]   = useState(null);
  const [apiError,   setApiError]   = useState('');
  const [routeKey,   setRouteKey]   = useState(0);
  const pollRef = useRef(null);

  const stopPolling  = useCallback(() => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } }, []);
  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const { job: j } = await api.getInitStatus();
        setJob(j);
        if (j.status === 'done' || j.status === 'error') stopPolling();
      } catch (_) {}
    }, POLL_INTERVAL_MS);
  }, [stopPolling]);

  useEffect(() => {
    api.getInitStatus().then(({ job: j }) => { setJob(j); if (j.status === 'running') startPolling(); }).catch(() => {});
    return stopPolling;
  }, [startPolling, stopPolling]);

  async function handleInit() {
    setResult(null); setApiError('');
    try { const { job: j } = await api.startInit(); setJob(j); startPolling(); }
    catch (err) { setApiError(err.message); }
  }

  async function handleRecommend() {
    if (!startTrack || !endTrack) return;
    setLoading(true); setResult(null); setPlaylist(null); setApiError('');
    try {
      const data = await api.recommend(startTrack.track_id, endTrack.track_id);
      setResult(data); setPlaylist(data.playlist); setRouteKey(k => k + 1);
    } catch (err) { setApiError(err.message); }
    finally { setLoading(false); }
  }

  const graphReady  = job.status === 'done';
  const canGenerate = graphReady && startTrack && endTrack && !loading;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)' }}>

      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-panel)',
        position: 'sticky', top: 0, zIndex: 40,
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 20px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div className="panel-screw" />
            <div>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '14px', color: 'var(--text-bright)', letterSpacing: '0.05em' }}>
                DJ GRAPH RECOMMENDER
              </div>
              <div className="section-label">Neo4j GDS · kNN cosine · A* pathfinding</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className={`led ${graphReady ? 'led-green' : 'led-off'}`} />
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '10px', color: graphReady ? 'var(--led-green)' : 'var(--text-dim)' }}>
              {graphReady ? `${job.stats?.nodes?.toLocaleString() ?? '?'} tracks` : 'offline'}
            </span>
            <div className="panel-screw" />
          </div>
        </div>
      </header>

      {/* Main */}
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        <GraphPanel job={job} onInit={handleInit} />

        <MixerSection
          startTrack={startTrack}
          endTrack={endTrack}
          setStartTrack={setStartTrack}
          setEndTrack={setEndTrack}
          graphReady={graphReady}
          loading={loading}
          onRecommend={handleRecommend}
          canGenerate={canGenerate}
        />

        {apiError && (
          <div style={{
            background: '#ff335510', border: '1px solid #ff335544',
            borderRadius: '6px', padding: '10px 14px',
            fontFamily: "'Share Tech Mono', monospace", fontSize: '11px', color: 'var(--led-red)',
          }}>
            ⚠ {apiError}
          </div>
        )}

        {result && playlist && (
          <>
            <RouteEditPanel key={routeKey} originalPlaylist={result.playlist} onFilter={setPlaylist} />
            <TrackTimeline playlist={playlist} onRemove={id => setPlaylist(p => p.filter(t => t.track_id !== id))} pathType={result?.path_type} />
          </>
        )}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', marginTop: '40px', padding: '16px 20px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <div className="panel-screw" />
          <span className="section-label">Neo4j 5.18 · GDS kNN cosine similarity · A* shortest path · React + Tailwind</span>
          <div className="panel-screw" />
        </div>
      </footer>
    </div>
  );
}
