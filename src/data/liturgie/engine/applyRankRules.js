// src/data/liturgie/engine/applyRankRules.js

/**
 * Applique les règles de préséance (version simplifiée, mais structurée)
 * du Missel romain 1962 entre :
 *  - le Temporal (temporal)
 *  - le Sanctoral (sanctoral)
 *
 * @param {Object|null} temporal  Entrée du Temporal pour ce jour
 * @param {Object|null} sanctoral Entrée du Sanctoral (fixe) pour ce jour
 * @param {"extraordinaire"|"ordinaire"} rite
 * @returns {{
 *   chosen: Object|null,
 *   suppressed: Object|null,
 *   commemoration: Object|null,
 *   reason: string
 * }}
 */
export function applyRankRules(temporal, sanctoral, rite = "extraordinaire") {
  // Cas triviaux
  if (!temporal && !sanctoral) {
    return {
      chosen: null,
      suppressed: null,
      commemoration: null,
      reason: "no_entry"
    };
  }

  if (temporal && !sanctoral) {
    return {
      chosen: temporal,
      suppressed: null,
      commemoration: null,
      reason: "temporal_only"
    };
  }

  if (!temporal && sanctoral) {
    return {
      chosen: sanctoral,
      suppressed: null,
      commemoration: null,
      reason: "sanctoral_only"
    };
  }

  // À partir d’ici, on a les deux : temporal ET sanctoral

  const temporalRank = getLiturgicalRankScore(temporal, "temporal", rite);
  const sanctoralRank = getLiturgicalRankScore(sanctoral, "sanctoral", rite);

  // 1. Cas où le Temporal domine clairement (dimanches, grandes fêtes, féries privilégiées)
  if (temporalRank > sanctoralRank) {
    const allowComm = allowCommemoration(temporal, sanctoral, "temporal_wins");

    return {
      chosen: temporal,
      suppressed: sanctoral,
      commemoration: allowComm ? sanctoral : null,
      reason: allowComm ? "temporal_with_commemoration" : "temporal_supersedes_sanctoral"
    };
  }

  // 2. Cas où le Sanctoral domine clairement (grande fête, I classe, etc.)
  if (sanctoralRank > temporalRank) {
    const allowComm = allowCommemoration(temporal, sanctoral, "sanctoral_wins");

    return {
      chosen: sanctoral,
      suppressed: temporal,
      commemoration: allowComm ? temporal : null,
      reason: allowComm ? "sanctoral_with_commemoration" : "sanctoral_supersedes_temporal"
    };
  }

  // 3. Cas d’égalité de score : par défaut, le Temporal garde priorité
  const allowComm = allowCommemoration(temporal, sanctoral, "equal_rank");

  return {
    chosen: temporal,
    suppressed: sanctoral,
    commemoration: allowComm ? sanctoral : null,
    reason: allowComm ? "temporal_with_commemoration_equal_rank" : "temporal_supersedes_sanctoral_equal_rank"
  };
}

/**
 * Donne un score numérique de priorité liturgique.
 * Plus le score est élevé, plus la célébration est "forte".
 *
 * On combine :
 *  - la mention de "I classe", "II classe", etc.
 *  - la nature : dimanche, féries de Carême, Semaine Sainte, etc.
 *  - la provenance : temporal vs sanctoral
 *
 * Cette fonction est volontairement structurée pour pouvoir être
 * raffinée plus tard (ajout de cas particuliers).
 */
function getLiturgicalRankScore(entry, source, rite) {
  if (!entry) return 0;

  const rankStr = (entry.rank || "").toLowerCase();
  const season = entry.season || null;
  const temporalClass = entry.temporal_class || null;
  const type = entry.type || null;
  const features = entry.features || {};

  let score = 0;

  // 1. Score de base selon la "classe"
  if (rankStr.includes("i classe")) {
    score += 100;
  } else if (rankStr.includes("ii classe")) {
    score += 80;
  } else if (rankStr.includes("iii classe")) {
    score += 60;
  } else if (rankStr.includes("ferie ii classe")) {
    score += 55;
  } else if (rankStr.includes("ferie")) {
    score += 40;
  } else {
    // rang non spécifié ou "—"
    score += 20;
  }

  // 2. Bonus selon la nature (dimanche, grande fête, vigile)
  if (temporalClass === "sunday") {
    score += 25;
  }

  if (type === "temporal_major_feast" || type === "temporal_feast" || type === "major_feast") {
    score += 20;
  }

  if (type === "temporal_vigil" || type === "vigile") {
    score += 5;
  }

  if (features.octave) {
    score += 10;
  }

  // 3. Bonus/malus selon les temps liturgiques privilégiés (Missel 1962)

  // Féries de Carême (sans compter les dimanches) : très privilégiées.
  if (season === "careme" && temporalClass === "feria") {
    score += 30;
  }

  // Féries de Semaine Sainte : quasi intouchables.
  if (season === "semaine_sainte" && temporalClass === "feria") {
    score += 40;
  }

  // Féries "grandes" du 17 au 23 décembre (Avent) : déjà gérées via rank "II classe",
  // mais on ajoute un léger bonus pour bien les faire dominer un sanctoral quelconque.
  if (season === "avent" && type === "major_feria") {
    score += 15;
  }

  // Dimanches d’Avent et de Carême : on ajoute un bonus,
  // ils prévalent normalement sur beaucoup de fêtes de saints.
  if (
    temporalClass === "sunday" &&
    (season === "avent" || season === "careme" || season === "semaine_sainte")
  ) {
    score += 15;
  }

  // Dimanche de Pâques, Pentecôte, Trinité : cas extrêmement forts
  if (
    entry.id === "easter_sunday" ||
    entry.id === "pentecost_sunday" ||
    entry.id === "trinity_sunday"
  ) {
    score += 50;
  }

  // Fêtes du Seigneur (si vous le marquez plus tard dans vos JSON via type)
  if (type === "feast_of_the_lord") {
    score += 20;
  }

  // 4. Ajustement selon la provenance (Temporal généralement prioritaire)
  if (source === "temporal") {
    score += 5; // léger biais : le Temporal est la structure première
  }

  return score;
}

/**
 * Détermine si une commémoration est autorisée dans
 * la configuration donnée (choix simplifié mais cohérent).
 *
 * On suit quelques lignes directrices :
 *  - Pas de commémoration en Semaine Sainte.
 *  - Pas de commémoration dans l’Octave de Pâques/Pentecôte (sauf choix contraire ultérieur).
 *  - Pas de commémoration contre un dimanche de Ière classe (Avent, Carême, Pâques).
 *  - Possible commémoration d’un sanctoral de IIIe classe sur un dimanche vert
 *    de IIe classe après la Pentecôte.
 */
function allowCommemoration(temporal, sanctoral, context) {
  if (!temporal || !sanctoral) return false;

  const tSeason = temporal.season || null;
  const tClass = temporal.temporal_class || null;
  const tRank = (temporal.rank || "").toLowerCase();
  const tFeatures = temporal.features || {};

  const sRank = (sanctoral.rank || "").toLowerCase();

  // 1. Jamais de commémoration en Semaine Sainte
  if (tSeason === "semaine_sainte") {
    return false;
  }

  // 2. Octaves de Pâques / Pentecôte : on ne commémore pas par défaut
  if (tFeatures.octave && (tSeason === "temps_pascal" || tSeason === "pentecote")) {
    return false;
  }

  // 3. Dimanches d’Avent, Carême, Pâques : très forts, pas de commémoration ordinaire
  if (
    tClass === "sunday" &&
    (tSeason === "avent" || tSeason === "careme" || tSeason === "temps_pascal")
  ) {
    return false;
  }

  // 4. Dimanches verts après la Pentecôte : on autorise une commem
  // si le sanctoral est de IIIe classe (classique : mémoire ajoutée).
  if (tSeason === "post_pentecote" && tClass === "sunday") {
    if (sRank.includes("iii classe")) {
      return true;
    }
  }

  // 5. Féries ordinaires (hors temps forts) : commémoration possible
  if (tClass === "feria" && !isStrongSeason(tSeason)) {
    return true;
  }

  // 6. Cas par défaut : pas de commémoration
  return false;
}

function isStrongSeason(season) {
  return (
    season === "avent" ||
    season === "careme" ||
    season === "semaine_sainte" ||
    season === "temps_pascal"
  );
}
