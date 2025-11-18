import { computeTemporal } from "./computeTemporal";
import { computeSanctoral } from "./computeSanctoral";
import { getLiturgicalColor } from "./liturgicalColors";
import { applyRankRules } from "./rules_1962";

/**
 * Fonction principale
 * @param {Date} dateJS
 * @param {"extraordinaire"|"ordinaire"} rite
 */
export function computeLiturgicalDay(dateJS, rite = "extraordinaire") {
  const temporal = computeTemporal(dateJS);
  const sanctoral = computeSanctoral(dateJS);

  const chosen = applyRankRules(temporal, sanctoral, rite); // applique les priorités Missel 1962
  const color = getLiturgicalColor(chosen);

  return {
    date: dateJS.toISOString().split("T")[0],
    temporal,
    sanctoral,
    chosen,
    color,
    rite
  };
}
