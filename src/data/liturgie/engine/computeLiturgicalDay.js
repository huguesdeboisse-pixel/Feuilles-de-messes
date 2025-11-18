// ===============================
//  MODULE LITURGIQUE – Missel 1962
// ===============================

// Caches internes
let temporal = null;
let sanctoral = null;

// -------------------------------
// Chargement JSON
// -------------------------------
async function loadJSON(path) {
    const r = await fetch(path);
    if (!r.ok) throw new Error("Impossible de charger : " + path);
    return r.json();
}

// -------------------------------
// Chargement des données (lazy)
// -------------------------------
async function ensureLoaded() {
    if (!temporal) {
        temporal = await loadJSON("/src/data/liturgie/temporal.json");
    }
    if (!sanctoral) {
        sanctoral = await loadJSON("/src/data/liturgie/sanctoral.json");
    }
}

// -------------------------------
// Cherche fête fixe dans le sanctoral
// -------------------------------
function findSanctoral(date) {
    const m = date.getMonth() + 1;
    const d = date.getDate();

    return sanctoral.find(entry => entry.month === m && entry.day === d) || null;
}

// -------------------------------
// Cherche fête mobile dans le temporal
// -------------------------------
function findTemporal(dateISO, rite) {
    // temporal.json doit contenir des entrées avec "date": "AAAA-MM-JJ"

    return temporal.find(entry => entry.date === dateISO) || null;
}

// -------------------------------
// Choix de la fête principale (version simplifiée)
// -------------------------------
function resolveLiturgicalDay(dTemp, dSanc) {
    if (dTemp && dSanc) {
        // Ici, appliquer vos règles de priorité Missel 1962 si besoin.
        // Pour l'instant : priorité au temporal.
        return {
            primary: dTemp,
            commemorations: [dSanc]
        };
    }

    if (dTemp) {
        return { primary: dTemp, commemorations: [] };
    }

    if (dSanc) {
        return { primary: dSanc, commemorations: [] };
    }

    // Rien trouvé → férie
    return {
        primary: {
            title: "Férie",
            rank: "Férie",
            color: "vert",
            type: "ferial"
        },
        commemorations: []
    };
}

// -------------------------------
// Fonction interne principale
// -------------------------------
async function compute(dateISO, rite) {
    await ensureLoaded();

    const dateObj = new Date(dateISO);

    const temp = findTemporal(dateISO, rite);
    const sanc = findSanctoral(dateObj);

    return resolveLiturgicalDay(temp, sanc);
}

// -------------------------------
// Export public
// -------------------------------
export async function computeLiturgicalDay(dateISO, rite) {
    return compute(dateISO, rite);
}
