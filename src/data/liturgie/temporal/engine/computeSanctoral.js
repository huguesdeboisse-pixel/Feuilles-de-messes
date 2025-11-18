import sanctoral from "@/data/liturgie/sanctoral/sanctoral.json";

/**
 * Retourne l’entrée sanctorale du jour
 */
export function computeSanctoral(dateJS) {
  const mm = dateJS.getMonth() + 1;
  const dd = dateJS.getDate();

  return sanctoral.find(s => s.month === mm && s.day === dd) || null;
}