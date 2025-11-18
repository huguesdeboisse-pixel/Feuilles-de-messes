// -----------------------------------------------------------------------------
// computeLiturgicalDay.js
// Moteur liturgique simplifié : charge temporal + sanctoral + renvoie la fête.
// -----------------------------------------------------------------------------

const PATH_TEMPORAL  = "src/data/liturgie/temporal.json";
const PATH_SANCTORAL = "src/data/liturgie/sanctoral.json";

let temporal = null;
let sanctoral = null;

// ---------- Chargement des JSON ----------------------------------------------
async function loadJSON(path) {
    const resp = await fetch(path);
    if (!resp.ok) throw new Error("Impossible de charger : " + path);
    return resp.json();
}

async function ensureLoaded() {
    if (temporal && sanctoral) return;

    const [t, s] = await Promise.all([
        loadJSON(PATH_TEMPORAL),
        loadJSON(PATH_SANCTORAL)
    ]);

    temporal = t;
    sanctoral = s;
}

// ---------- Moteur sanctoral --------------------------------------------------
function lookupSanctoral(date) {
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return sanctoral.filter(e => e.month === m && e.day === d);
}

// ---------- Placeholder Temporal (à remplacer plus tard) -----------------------
function lookupTemporal(date) {
    return null; // pour l'instant
}

// ---------- Priorité (plus petit = plus important) ----------------------------
function priorityOf(x) {
    return typeof x?.priority === "number" ? x.priority : 999;
}

// ---------- Fonction principale ------------------------------------------------
export async function computeLiturgicalDay(dateInput, rite = "extra") {

    await ensureLoaded();

    const date = new Date(dateInput);
    if (isNaN(date.getTime())) throw new Error("Date invalide");

    const san = lookupSanctoral(date);
    const tmp = lookupTemporal(date);

    let primary = null;
    let commemorations = [];

    if (san.length && tmp) {
        const bestSan = san.reduce((a, b) =>
            priorityOf(a) < priorityOf(b) ? a : b
        );
        const tmpBetter = priorityOf(tmp) < priorityOf(bestSan);

        if (tmpBetter) {
            primary = tmp;
            commemorations = san;
        } else {
            primary = bestSan;
            commemorations = san.filter(x => x !== bestSan).concat(tmp);
        }
    }
    else if (san.length) {
        primary = san.reduce((a, b) =>
            priorityOf(a) < priorityOf(b) ? a : b
        );
        commemorations = san.filter(x => x !== primary);
    }
    else if (tmp) {
        primary = tmp;
    }

    return {
        date: date.toISOString().slice(0, 10),
        rite,
        primary,
        commemorations
    };
}

// ---------- Exposition globale (console navigateur) ---------------------------
if (typeof window !== "undefined") {
    window.computeLiturgicalDay = computeLiturgicalDay;
}

