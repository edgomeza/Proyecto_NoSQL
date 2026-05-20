const BASE = '/api';

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  startInit:    ()             => apiFetch('/init-graph',    { method: 'POST' }),
  getInitStatus:()             => apiFetch('/init-status'),
  searchTracks: (q, limit = 20) =>
    apiFetch(`/tracks/search?q=${encodeURIComponent(q)}&limit=${limit}`),
  recommend:    (start_track_id, end_track_id) =>
    apiFetch('/recommend', { method: 'POST', body: JSON.stringify({ start_track_id, end_track_id }) }),
};
