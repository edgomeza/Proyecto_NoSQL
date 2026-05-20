// Nombres de tonalidades en notación española (Pitch Class 0–11)
export const KEY_NAMES = ['Do', 'Reb', 'Re', 'Mib', 'Mi', 'Fa', 'Fa#', 'Sol', 'Lab', 'La', 'Sib', 'Si'];

// Tabla de conversión Pitch Class + Mode → Camelot Wheel
const CAMELOT_MAP = {
  '0_0': '10A', '0_1': '8B',
  '1_0': '5A',  '1_1': '3B',
  '2_0': '12A', '2_1': '10B',
  '3_0': '7A',  '3_1': '5B',
  '4_0': '2A',  '4_1': '12B',
  '5_0': '9A',  '5_1': '7B',
  '6_0': '4A',  '6_1': '2B',
  '7_0': '11A', '7_1': '9B',
  '8_0': '6A',  '8_1': '4B',
  '9_0': '1A',  '9_1': '11B',
  '10_0': '8A', '10_1': '6B',
  '11_0': '3A', '11_1': '1B',
};

export function getCamelot(key, mode) {
  return CAMELOT_MAP[`${key}_${mode}`] ?? '?';
}

export function getKeyLabel(key, mode) {
  return `${KEY_NAMES[key] ?? '?'} ${mode === 1 ? 'Mayor' : 'menor'}`;
}

/**
 * Compatibilidad armónica entre dos posiciones Camelot.
 * Devuelve { label, color (Tailwind base) }.
 */
export function getHarmonicInfo(c1, c2) {
  if (!c1 || !c2 || c1 === '?' || c2 === '?') return { label: '?', color: 'slate' };
  if (c1 === c2) return { label: 'Perfecta', color: 'emerald' };

  const n1 = parseInt(c1, 10);
  const n2 = parseInt(c2, 10);
  const l1 = c1.slice(-1);
  const l2 = c2.slice(-1);

  // Misma posición numérica pero diferente letra = relativo mayor/menor
  if (n1 === n2 && l1 !== l2) return { label: 'Relativa', color: 'emerald' };

  // Distancia circular en la rueda de 12 posiciones
  const diff = Math.min(Math.abs(n1 - n2), 12 - Math.abs(n1 - n2));
  if (diff === 1 && l1 === l2) return { label: 'Armónica', color: 'yellow' };
  if (diff <= 2) return { label: 'Compatible', color: 'yellow' };

  return { label: 'Creativa', color: 'red' };
}

/** Clasifica el salto de BPM en suave / moderado / brusco */
export function getBpmCategory(delta) {
  const abs = Math.abs(delta);
  if (abs <= 3)  return { label: `${delta > 0 ? '+' : ''}${delta} BPM`, color: 'emerald' };
  if (abs <= 8)  return { label: `${delta > 0 ? '+' : ''}${delta} BPM`, color: 'yellow' };
  return           { label: `${delta > 0 ? '+' : ''}${delta} BPM`, color: 'red' };
}

/** Porcentaje de energía con signo */
export function getEnergyDelta(prev, curr) {
  if (prev == null) return null;
  const d = Math.round((curr - prev) * 100);
  return { delta: d, label: `${d > 0 ? '+' : ''}${d}%` };
}
