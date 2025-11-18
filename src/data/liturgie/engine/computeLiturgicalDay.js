// src/data/liturgie/engine/computeLiturgicalDay.js
// ---------------------------------------------------------------------
// Moteur "orchestrateur" :
// - charge temporal.json et sanctoral.json
// - calcule la fête du jour à partir d'une date civile et d'un rite
// - applique une règle simple de priorité
// - renvoie un objet unique prêt à être affiché
//
// NB :
//  - Le calcul détaillé du temporal (dimanches mobiles, Pâques, etc.)
//    sera centralisé plus tard dans computeTemporal.js.
//  - Ici on prépare la structure et on fait déjà fonctionner le sanctoral.
// ---------------------------------------------------------------------

const TEMPORAL_PATH  = "src/data/liturgie/temporal.json";
const SANCTORAL_PATH = "src/data/liturgie/sanctoral.json";

let _temporalData  = null;
let _sanctoralData = null;
let _dataLoaded    = false;

/**
 * Charge un JSON (helper générique)
 */
async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`Impossible de charger ${path} (HTTP ${res.status})`);
  }
  return res.json();
}

/**
 * Charge temporal.json + sanctoral.json une seule fois
 */
async function ensureLiturgicalDataLoaded() {
  if (_dataLoaded) return;

  const [temporal, sanctoral] = await Promise.all([
    loadJSON(TEMPORAL_PATH).catch(err => {
      console.error("Erreur de chargement du temporal :", err);
      return null;
    }),
    loadJSON(SANCTORAL_PATH).catch(err => {
      console.error("Erreur de chargement du sanctoral :", err);
      return [];
    })
  ]);

  _temporalData  = temporal;
  _sanctoralData = sanctoral;
  _dataLoaded    = true;
}

/**
 * Sanctoral : trouve toutes les fêtes fixes pour une date civile donnée
 * (sanctoral.json est un simple tableau d'objets avec month/day)
 */
function findSanctoralForDate(date, rite) {
  if (!Array.isArray(_sanctoralData)) return [];

  const month = date.getMonth() + 1;
  const day   = date.getDate();

  return _sanctoralData.filter(entry =>
    entry.month === month && entry.day === day
  );
}

/**
 * Temporal : placeholder pour le moment.
 *
 * Plus tard, on déléguera à computeTemporal.js
 * qui fera tout le calcul (Pâques, dimanches, féries privilégiées, etc.).
 *
 * Ici, on prévoit simplement le hook.
 */
function findTemporalForDate(date, rite) {
  // Si vous avez déjà un computeTemporal() global dans computeTemporal.js,
  // vous pouvez le brancher ici :
  //
  //   if (typeof computeTemporal === "function") {
  //     return computeTemporal(date, _temporalData, rite);
  //   }
  //
  // Pour l'instant, on renvoie null pour ne PAS bloquer le reste du moteur.
  return null;
}

/**
 * Compare deux célébrations par priorité.
 * Convention : plus le nombre est petit, plus la priorité est grande.
 */
function compareByPriority(a, b) {
  const pa = typeof a.priority === "number" ? a.priority : 999;
  const pb = typeof b.priority === "number" ? b.priority : 999;
  return pa - pb;
}

/**
 * Détermine la couleur liturgique à partir de la célébration principale.
 * Si aucune couleur n'est définie, on met "blanc" par défaut.
 */
function resolveColor(primary) {
  if (!primary) return "blanc";
  return primary.color || "blanc";
}

/**
 * Fonction principale :
 *  - dateInput : Date ou string "YYYY-MM-DD"
 *  - rite      : "ordinaire" ou "extraordinaire" (pour la suite)
 *
 * Retourne un objet :
 * {
 *   date: "2025-03-19",
 *   rite: "extraordinaire",
 *   temporal: {...} | null,
 *   sanctoral: [...],
 *   primary: {...} | null,
 *   commemorations: [...],
 *   color: "blanc",
 *   debug: { ... }
 * }
 */
export async function computeLiturgicalDay(dateInput, rite = "extraordinaire") {
  await ensureLiturgicalDataLoaded();

  // Normalisation de la date
  let date;
  if (dateInput instanceof Date) {
    date = dateInput;
  } else if (typeof dateInput === "string") {
    date = new Date(dateInput);
  } else {
    throw new Error("computeLiturgicalDay() : dateInput doit être une Date ou une string.");
  }

  if (Number.isNaN(date.getTime())) {
    throw new Error("computeLiturgicalDay() : date invalide.");
  }

  // Récupération temporal + sanctoral
  const temporal   = findTemporalForDate(date, rite);
  const sanctoral  = findSanctoralForDate(date, rite);

  // Décision simple pour l’instant :
  // - Si temporal ET sanctoral : on garde celui qui a la plus forte priorité.
  // - Si un seul des deux : on le prend.
  // - Plus tard : cette logique sera raffinée selon rules_1962.js
  let primary = null;
  let commemorations = [];

  if (temporal && sanctoral.length) {
    // On compare la priorité de temporal et de la meilleure fête sanctorale
    const bestSanctoral = [...sanctoral].sort(compareByPriority)[0];
    const hasTemporalPriority =
      temporal.priority !== undefined &&
      compareByPriority(temporal, bestSanctoral) < 0;

    if (hasTemporalPriority) {
      primary = temporal;
      commemorations = sanctoral;
    } else {
      primary = bestSanctoral;
      commemorations = sanctoral.filter(x => x !== bestSanctoral);
      if (temporal) commemorations.push(temporal);
    }
  } else if (temporal) {
    primary = temporal;
    commemorations = sanctoral;
  } else if (sanctoral.length) {
    primary = [...sanctoral].sort(compareByPriority)[0];
    commemorations = sanctoral.filter(x => x !== primary);
  } else {
    // Cas théorique : ni temporal ni sanctoral (ne devrait pas arriver)
    primary = null;
    commemorations = [];
  }

  const color = resolveColor(primary);

  // Construction de la réponse complète
  const result = {
    date: date.toISOString().slice(0, 10),
    rite,
    temporal: temporal || null,
    sanctoral,
    primary,
    commemorations,
    color,
    debug: {
      temporalFound: !!temporal,
      sanctoralCount: sanctoral.length
    }
  };

  return result;
}

// Optionnel : si on veut aussi exposer la fonction au global (pour un <script> non-module)
if (typeof window !== "undefined") {
  window.computeLiturgicalDay = computeLiturgicalDay;
}
