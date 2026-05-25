const neo4j = require('neo4j-driver');
const { driver } = require('../config/neo4j');

const GRAPH_ROUTE              = 'dj-routing';
const MAX_EXPANSIONS_A         = 1500;  // intento estándar
const MAX_EXPANSIONS_B         = 4000;  // intento profundo (fallback)
const TARGET_MIN_INTERMEDIATES = 6;     // objetivo: al menos 6 nodos intermedios
const ENRICHMENT_THRESHOLD     = 0.08;  // parar de enriquecer cuando todas las transiciones < esto

const toNum = (v) => (v != null && typeof v.toNumber === 'function' ? v.toNumber() : Number(v));

class MinHeap {
  constructor() { this._h = []; }

  push(item) {
    this._h.push(item);
    let i = this._h.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this._h[p].f <= this._h[i].f) break;
      [this._h[p], this._h[i]] = [this._h[i], this._h[p]];
      i = p;
    }
  }

  pop() {
    const top  = this._h[0];
    const last = this._h.pop();
    if (this._h.length > 0) {
      this._h[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = 2 * i + 2, n = this._h.length;
        let m = i;
        if (l < n && this._h[l].f < this._h[m].f) m = l;
        if (r < n && this._h[r].f < this._h[m].f) m = r;
        if (m === i) break;
        [this._h[m], this._h[i]] = [this._h[i], this._h[m]];
        i = m;
      }
    }
    return top;
  }

  get size() { return this._h.length; }
}

const FEAT_KEYS = ['energy', 'danceability', 'valence', 'acousticness'];

function cosineDist(a, b) {
  let dot = 0, mA = 0, mB = 0;
  for (const k of FEAT_KEYS) {
    const av = parseFloat(a[k]) || 0;
    const bv = parseFloat(b[k]) || 0;
    dot += av * bv; mA += av * av; mB += bv * bv;
  }
  return (mA && mB) ? 1 - dot / (Math.sqrt(mA) * Math.sqrt(mB)) : 1;
}

const ENDPOINTS_QUERY = `
  MATCH (s:Song) WHERE s.track_id IN [$startId, $endId]
  RETURN s.track_id     AS track_id,
         s.track_name   AS track_name,
         s.artists      AS artists,
         s.album_name   AS album_name,
         s.genre        AS genre,
         s.energy       AS energy,
         s.danceability AS danceability,
         s.valence      AS valence,
         s.acousticness AS acousticness,
         s.bpm          AS bpm,
         s.key          AS key,
         s.mode         AS mode,
         s.popularity   AS popularity
`;

const NEIGHBOR_QUERY = `
  MATCH (n:Song {track_id: $id})-[r:TRANSITIONS_TO]->(nb:Song)
  WHERE $noFilter OR nb.track_id = $endId OR nb.genre IN $genres
  RETURN nb.track_id     AS track_id,
         nb.track_name   AS track_name,
         nb.artists      AS artists,
         nb.album_name   AS album_name,
         nb.genre        AS genre,
         nb.energy       AS energy,
         nb.danceability AS danceability,
         nb.valence      AS valence,
         nb.acousticness AS acousticness,
         nb.bpm          AS bpm,
         nb.key          AS key,
         nb.mode         AS mode,
         nb.popularity   AS popularity,
         r.weight        AS weight
`;

function recToNode(rec) {
  return {
    track_id:     rec.get('track_id'),
    track_name:   rec.get('track_name'),
    artists:      rec.get('artists'),
    album_name:   rec.get('album_name'),
    genre:        rec.get('genre'),
    energy:       rec.get('energy'),
    danceability: rec.get('danceability'),
    valence:      rec.get('valence'),
    acousticness: rec.get('acousticness'),
    bpm:          toNum(rec.get('bpm')),
    key:          toNum(rec.get('key')),
    mode:         toNum(rec.get('mode')),
    popularity:   toNum(rec.get('popularity')),
  };
}

function thinPath(nodes, originalWeights, maxIntermediates) {
  if (nodes.length - 2 <= maxIntermediates) {
    return { nodes, weights: originalWeights };
  }

  const inner = nodes.slice(1, -1);
  const kept  = [nodes[0]];

  for (let i = 0; i < maxIntermediates; i++) {
    const fraction = maxIntermediates > 1 ? i / (maxIntermediates - 1) : 0.5;
    kept.push(inner[Math.round(fraction * (inner.length - 1))]);
  }
  kept.push(nodes[nodes.length - 1]);

  const weights = kept.slice(1).map((n, i) =>
    parseFloat(cosineDist(kept[i], n).toFixed(4))
  );
  return { nodes: kept, weights };
}

async function acousticBridge(session, startNode, endNode, bridgeCount) {
  const mid = (k) => ((parseFloat(startNode[k]) || 0) + (parseFloat(endNode[k]) || 0)) / 2;

  const { records } = await session.run(`
    MATCH (s:Song)
    WHERE s.track_id <> $startId AND s.track_id <> $endId
    WITH s,
         abs(toFloat(s.energy)       - $mEnergy)  +
         abs(toFloat(s.danceability) - $mDance)   +
         abs(toFloat(s.valence)      - $mValence) +
         abs(toFloat(s.acousticness) - $mAcoust)  AS dist
    ORDER BY dist ASC
    LIMIT $n
    RETURN s.track_id AS track_id, s.track_name AS track_name,
           s.artists AS artists, s.album_name AS album_name,
           s.genre AS genre, s.energy AS energy,
           s.danceability AS danceability, s.valence AS valence,
           s.acousticness AS acousticness, s.bpm AS bpm,
           s.key AS key, s.mode AS mode, s.popularity AS popularity
  `, {
    startId:  startNode.track_id,
    endId:    endNode.track_id,
    mEnergy:  mid('energy'),
    mDance:   mid('danceability'),
    mValence: mid('valence'),
    mAcoust:  mid('acousticness'),
    n:        neo4j.int(bridgeCount),
  });

  if (!records.length) return null;

  const bridges = records.map(recToNode)
    .sort((a, b) => cosineDist(b, endNode) - cosineDist(a, endNode));

  const allNodes  = [startNode, ...bridges, endNode];
  const weights   = allNodes.slice(1).map((n, i) =>
    parseFloat(cosineDist(allNodes[i], n).toFixed(4))
  );
  return { nodes: allNodes, weights };
}

async function astarSearch({ session, startNode, endNode, maxDepth, genres, maxExpansions }) {
  const noFilter      = !genres || genres.length === 0;
  const endId         = endNode.track_id;
  const h             = (node) => cosineDist(node, endNode);
  const openSet       = new MinHeap();
  const bestG         = new Map();
  const neighborCache = new Map();

  bestG.set(startNode.track_id, 0);
  openSet.push({ f: h(startNode), g: 0, depth: 0, node: startNode, path: [startNode], weights: [] });

  let expansions = 0;

  while (openSet.size > 0 && expansions < maxExpansions) {
    const curr = openSet.pop();
    expansions++;

    if (curr.node.track_id === endId) {
      return { path: curr.path, weights: curr.weights, expansions };
    }

    if (curr.depth >= maxDepth) continue;
    if (curr.g > (bestG.get(curr.node.track_id) ?? Infinity)) continue;

    let neighbors = neighborCache.get(curr.node.track_id);
    if (!neighbors) {
      const { records } = await session.run(NEIGHBOR_QUERY, {
        id: curr.node.track_id, endId, genres: genres || [], noFilter,
      });
      neighbors = records.map(r => ({ node: recToNode(r), edgeW: Number(r.get('weight')) }));
      neighborCache.set(curr.node.track_id, neighbors);
    }

    for (const { node: nb, edgeW } of neighbors) {
      const g = curr.g + edgeW;

      if (g < (bestG.get(nb.track_id) ?? Infinity)) {
        bestG.set(nb.track_id, g);
        openSet.push({
          f:       g + h(nb),
          g,
          depth:   curr.depth + 1,
          node:    nb,
          path:    [...curr.path, nb],
          weights: [...curr.weights, edgeW],
        });
      }
    }
  }

  return null;
}

async function enrichPath(session, initialNodes, targetIntermediates) {
  const inPath = new Set(initialNodes.map(n => n.track_id));
  let nodes    = [...initialNodes];

  while (nodes.length - 2 < targetIntermediates) {
    let worstIdx = 0, worstCost = -1;
    for (let i = 0; i < nodes.length - 1; i++) {
      const c = cosineDist(nodes[i], nodes[i + 1]);
      if (c > worstCost) { worstCost = c; worstIdx = i; }
    }

    if (worstCost < ENRICHMENT_THRESHOLD) break;

    const a = nodes[worstIdx];
    const b = nodes[worstIdx + 1];

    const { records } = await session.run(`
      MATCH (s:Song)
      WHERE NOT s.track_id IN $excluded
      WITH s,
           abs(toFloat(s.energy)       - $mE) +
           abs(toFloat(s.danceability) - $mD) +
           abs(toFloat(s.valence)      - $mV) +
           abs(toFloat(s.acousticness) - $mA) AS dist
      ORDER BY dist ASC
      LIMIT 25
      RETURN s.track_id AS track_id, s.track_name AS track_name,
             s.artists   AS artists,  s.album_name  AS album_name,
             s.genre     AS genre,    s.energy       AS energy,
             s.danceability AS danceability, s.valence AS valence,
             s.acousticness AS acousticness, s.bpm    AS bpm,
             s.key AS key, s.mode AS mode,  s.popularity AS popularity
    `, {
      excluded: [...inPath],
      mE: ((parseFloat(a.energy)       || 0) + (parseFloat(b.energy)       || 0)) / 2,
      mD: ((parseFloat(a.danceability) || 0) + (parseFloat(b.danceability) || 0)) / 2,
      mV: ((parseFloat(a.valence)      || 0) + (parseFloat(b.valence)      || 0)) / 2,
      mA: ((parseFloat(a.acousticness) || 0) + (parseFloat(b.acousticness) || 0)) / 2,
    });

    let bestZ = null, bestNewWorst = Infinity;
    for (const rec of records) {
      const z        = recToNode(rec);
      const newWorst = Math.max(cosineDist(a, z), cosineDist(z, b));
      if (newWorst < bestNewWorst) { bestNewWorst = newWorst; bestZ = z; }
    }

    if (!bestZ || bestNewWorst >= worstCost) break;

    nodes = [...nodes.slice(0, worstIdx + 1), bestZ, ...nodes.slice(worstIdx + 1)];
    inPath.add(bestZ.track_id);
  }

  return nodes;
}

async function searchTracks(req, res) {
  const query = (req.query.q || '').trim();
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);

  if (!query || query.length < 2) {
    return res.json({ success: true, tracks: [] });
  }

  const session = driver.session();
  try {
    const lucene = query.replace(/[+\-!(){}[\]^"~*?:\\/]/g, '\\$&') + '*';

    const { records } = await session.run(
      `CALL db.index.fulltext.queryNodes('song_search', $q)
       YIELD node AS s, score
       RETURN s.track_id     AS track_id,
              s.track_name   AS track_name,
              s.artists      AS artists,
              s.genre        AS genre,
              s.popularity   AS popularity,
              s.bpm          AS bpm,
              s.key          AS key,
              s.mode         AS mode,
              s.energy       AS energy,
              s.danceability AS danceability,
              s.valence      AS valence,
              s.acousticness AS acousticness,
              score
       ORDER BY score DESC, s.popularity DESC
       LIMIT $limit`,
      { q: lucene, limit: neo4j.int(limit) }
    );

    const tracks = records.map((r) => ({
      track_id:     r.get('track_id'),
      track_name:   r.get('track_name'),
      artists:      r.get('artists'),
      genre:        r.get('genre'),
      popularity:   toNum(r.get('popularity')),
      bpm:          toNum(r.get('bpm')),
      key:          toNum(r.get('key')),
      mode:         toNum(r.get('mode')),
      energy:       r.get('energy'),
      danceability: r.get('danceability'),
      valence:      r.get('valence'),
      acousticness: r.get('acousticness'),
    }));

    res.json({ success: true, tracks });
  } catch (err) {
    if (err.message.includes('song_search')) {
      return res.json({ success: true, tracks: [], hint: 'Inicializa el grafo primero' });
    }
    console.error('[searchTracks]', err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    await session.close();
  }
}

async function getGenres(req, res) {
  const session = driver.session();
  try {
    const { records } = await session.run(
      'MATCH (s:Song) WHERE s.genre IS NOT NULL RETURN DISTINCT s.genre AS genre ORDER BY genre'
    );
    res.json({ success: true, genres: records.map(r => r.get('genre')).filter(Boolean) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  } finally {
    await session.close();
  }
}

async function recommend(req, res) {
  const { start_track_id, end_track_id } = req.body;

  if (!start_track_id || !end_track_id) {
    return res.status(400).json({ success: false, error: 'Se requieren start_track_id y end_track_id' });
  }
  if (start_track_id === end_track_id) {
    return res.status(400).json({ success: false, error: 'Las canciones de inicio y destino deben ser diferentes' });
  }

  const session = driver.session();
  try {
    const { records: existsRec } = await session.run(
      'CALL gds.graph.exists($name) YIELD exists RETURN exists',
      { name: GRAPH_ROUTE }
    );
    if (!existsRec[0]?.get('exists')) {
      return res.status(400).json({
        success: false,
        error: 'El grafo no está inicializado. Ejecuta primero POST /api/init-graph',
      });
    }

    const { records: epRecs } = await session.run(ENDPOINTS_QUERY, {
      startId: start_track_id,
      endId:   end_track_id,
    });
    const byId      = Object.fromEntries(epRecs.map(r => [r.get('track_id'), recToNode(r)]));
    const startNode = byId[start_track_id];
    const endNode   = byId[end_track_id];

    if (!startNode || !endNode) {
      return res.status(404).json({ success: false, error: 'Una o ambas canciones no existen en el grafo.' });
    }

    let astarResult = await astarSearch({
      session, startNode, endNode,
      maxDepth:      20,
      genres:        [],
      maxExpansions: MAX_EXPANSIONS_A,
    });

    if (!astarResult) {
      astarResult = await astarSearch({
        session, startNode, endNode,
        maxDepth:      15,
        genres:        [],
        maxExpansions: MAX_EXPANSIONS_B,
      });
    }

    let finalNodes, finalWeights, pathType;

    if (astarResult) {
      const enriched = await enrichPath(session, astarResult.path, TARGET_MIN_INTERMEDIATES);
      finalNodes   = enriched;
      finalWeights = enriched.slice(1).map((n, i) =>
        parseFloat(cosineDist(enriched[i], n).toFixed(4))
      );
      pathType = 'optimal';
    } else {
      const bridge = await acousticBridge(session, startNode, endNode, 3);
      const bridgeNodes = bridge?.nodes ?? [startNode, endNode];
      const enriched    = await enrichPath(session, bridgeNodes, Math.min(TARGET_MIN_INTERMEDIATES, 4));
      finalNodes   = enriched;
      finalWeights = enriched.slice(1).map((n, i) =>
        parseFloat(cosineDist(enriched[i], n).toFixed(4))
      );
      pathType = 'bridge';
    }

    const costs = finalWeights.reduce(
      (acc, w) => { acc.push(acc[acc.length - 1] + w); return acc; },
      [0.0]
    );
    const rawTotal = finalWeights.reduce((s, w) => s + w, 0);

    const playlist = finalNodes.map((node, i) => ({
      track_id:        node.track_id,
      track_name:      node.track_name,
      artists:         node.artists,
      album_name:      node.album_name,
      genre:           node.genre,
      bpm:             node.bpm,
      key:             node.key,
      mode:            node.mode,
      energy:          node.energy,
      danceability:    node.danceability,
      valence:         node.valence,
      acousticness:    node.acousticness,
      popularity:      node.popularity,
      step:            i + 1,
      is_start:        i === 0,
      is_end:          i === finalNodes.length - 1,
      cumulative_cost: parseFloat(costs[i].toFixed(4)),
      step_cost:       i > 0 ? parseFloat((costs[i] - costs[i - 1]).toFixed(4)) : 0,
    }));

    res.json({
      success:    true,
      playlist,
      total_cost: parseFloat(rawTotal.toFixed(4)),
      total_hops: finalNodes.length,
      algorithm:  'astar',
      path_type:  pathType,
    });

  } catch (err) {
    console.error('[recommend]', err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    await session.close();
  }
}

module.exports = { searchTracks, recommend, getGenres };
