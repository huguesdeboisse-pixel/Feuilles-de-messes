/**
 * Détermine la couleur en fonction du temporal/sanctoral
 */
export function getLiturgicalColor(entry) {
  if (!entry) return null;

  return entry.color || null;
}
