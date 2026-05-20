import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from './services/api';
import GraphPanel from './components/GraphPanel';
import TrackSearch from './components/TrackSearch';
import TrackTimeline from './components/TrackTimeline';

const POLL_INTERVAL_MS = 3000;

const INITIAL_JOB = {
  status: 'idle', step: '', progress: 0, stats: null, error: null,
};

export default function App() {
  const [job,        setJob]        = useState(INITIAL_JOB);
  const [startTrack, setStartTrack] = useState(null);
  const [endTrack,   setEndTrack]   = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [result,     setResult]     = useState(null);
  const [apiError,   setApiError]   = useState('');
  const pollRef = useRef(null);

  // ── Polling del estado del init ───────────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

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

  // Cargar estado inicial al montar
  useEffect(() => {
    api.getInitStatus()
      .then(({ job: j }) => {
        setJob(j);
        if (j.status === 'running') startPolling();
      })
      .catch(() => {});
    return stopPolling;
  }, [startPolling, stopPolling]);

  // ── Inicializar grafo ─────────────────────────────────────────────────────
  async function handleInit() {
    setResult(null);
    setApiError('');
    try {
      const { job: j } = await api.startInit();
      setJob(j);
      startPolling();
    } catch (err) {
      setApiError(err.message);
    }
  }

  // ── Generar recomendación ─────────────────────────────────────────────────
  async function handleRecommend() {
    if (!startTrack || !endTrack) return;
    setLoading(true);
    setResult(null);
    setApiError('');
    try {
      const data = await api.recommend(startTrack.track_id, endTrack.track_id);
      setResult(data);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const graphReady  = job.status === 'done';
  const canGenerate = graphReady && startTrack && endTrack && !loading;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl
                            bg-gradient-to-br from-violet-600 to-cyan-500 text-lg">
              🎛️
            </div>
            <div>
              <h1 className="text-base font-black font-mono text-white tracking-tight">
                DJ Graph Recommender
              </h1>
              <p className="text-xs text-slate-500 font-mono hidden sm:block">
                Neo4j GDS · kNN cosine · Dijkstra shortest path
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${graphReady ? 'bg-emerald-400' : 'bg-slate-700'}`} />
            <span className="text-xs font-mono text-slate-500 hidden sm:inline">
              {graphReady
                ? `${job.stats?.nodes?.toLocaleString() ?? '?'} canciones`
                : 'Sin datos'}
            </span>
          </div>
        </div>
      </header>

      {/* ── Contenido principal ───────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Panel de estado del grafo */}
        <GraphPanel job={job} onInit={handleInit} disabled={false} />

        {/* Selección de canciones */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
          <div>
            <h2 className="text-sm font-bold font-mono text-slate-300 mb-1">
              Selecciona las canciones
            </h2>
            <p className="text-xs text-slate-600 font-mono">
              Busca por nombre de canción o artista en el dataset de 113k pistas de Spotify.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-stretch">
            <TrackSearch
              label="Track de inicio"
              selected={startTrack}
              onSelect={setStartTrack}
              disabled={!graphReady}
            />

            {/* Flecha central */}
            <div className="flex items-center justify-center sm:pt-6 shrink-0">
              <div className="text-violet-500">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>

            <TrackSearch
              label="Track de destino"
              selected={endTrack}
              onSelect={setEndTrack}
              disabled={!graphReady}
            />
          </div>

          {/* Botón de generación */}
          <div className="flex flex-col items-center gap-3 pt-2">
            <button
              onClick={handleRecommend}
              disabled={!canGenerate}
              className={`w-full max-w-sm py-3.5 rounded-xl font-black font-mono text-sm
                          transition-all duration-200 flex items-center justify-center gap-2
                          ${canGenerate
                            ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white hover:brightness-110 active:scale-95 shadow-lg shadow-violet-900/40'
                            : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                          }`}
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Calculando ruta Dijkstra...
                </>
              ) : (
                <>⚡ Generar Transición Perfecta</>
              )}
            </button>
            {!graphReady && (
              <p className="text-xs text-slate-600 font-mono">
                Inicializa el grafo primero para habilitar la búsqueda
              </p>
            )}
          </div>
        </div>

        {/* Error de API */}
        {apiError && (
          <div className="bg-red-950/40 border border-red-800 rounded-xl p-4">
            <p className="text-sm text-red-400 font-mono">⚠️ {apiError}</p>
          </div>
        )}

        {/* Resultado: Timeline */}
        {result && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <TrackTimeline
              playlist={result.playlist}
              totalCost={result.total_cost}
              totalHops={result.total_hops}
            />
          </div>
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800 mt-16 py-6 text-center">
        <p className="text-xs text-slate-700 font-mono">
          Neo4j 5.18 · GDS kNN cosine similarity · Dijkstra shortest path · React + Tailwind
        </p>
      </footer>
    </div>
  );
}
