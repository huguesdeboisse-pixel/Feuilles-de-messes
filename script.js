/*
 * Script minimal de test du moteur liturgique.
 * Version totalement neutre : il s’appuie uniquement
 * sur vos fichiers JSON sanctoral + temporal.
 */

async function loadJSON(path) {
    const res = await fetch(path);
    return res.json();
}

let TEMPORAL = null;
let SANCTORAL = null;

/* Charge les fichiers une fois au début */
(async () => {
    SANCTORAL = await loadJSON("src/data/liturgie/sanctoral.json");
    TEMPORAL  = await loadJSON("src/data/liturgie/temporal.json");
})();


/* ========= LOGIQUE LITURGIQUE MINIMALE ========= */

function findSanctoral(date) {
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return SANCTORAL.filter(x => x.month === m && x.day === d);
}

function findTemporal(date) {
    const key = date.toISOString().slice(0,10);
    return TEMPORAL[key] || null;
}

/* Détermination de la couleur liturgique strictement contrôlée */
function classForColor(c) {
    switch (c) {
        case "violet": return "color-violet";
        case "vert":   return "color-vert";
        case "rouge":  return "color-rouge";
        case "noir":   return "color-noir";
        case "blanc":
        case "doré":
        case "or":
            return "color-blanc";
        default:
            return "color-blanc";
    }
}


/* ======== MOTEUR DE FÊTE ======== */

function computeCelebration(date, rite) {

    const temporal = findTemporal(date);
    const sanctoral = findSanctoral(date);

    // Sélection naïve pour l’instant :
    // règle : temporal > sanctoral (mais on affiche les commémorations)
    let celebration = temporal || sanctoral[0] || null;

    return {
        primary: celebration,
        commemorations: celebration === temporal ? sanctoral : sanctoral.slice(1)
    };
}


/* ========= AFFICHAGE ========= */

function renderCelebration(result) {
    const card = document.getElementById("feteBlock");
    const bar  = document.getElementById("liturgicalColorBar");

    const title = document.getElementById("feteTitle");
    const rank  = document.getElementById("feteRank");
    const season = document.getElementById("feteSeason");
    const comm  = document.getElementById("commemorations");

    if (!result.primary) {
        card.classList.add("hidden");
        return;
    }

    const c = result.primary;

    // Couleur liturgique
    bar.className = "color-bar " + classForColor(c.color);

    title.textContent = c.title;
    rank.textContent = c.rank || "";
    season.textContent = c.season ? ("Temps liturgique : " + c.season) : "";

    // Commémorations
    comm.textContent = result.commemorations.length
        ? "Commémorations : " + result.commemorations.map(x => x.title).join(", ")
        : "";

    card.classList.remove("hidden");
}


/* ========= BOUTON ========= */

document.getElementById("computeBtn").addEventListener("click", () => {
    const dateVal = document.getElementById("dateInput").value;
    const rite    = document.getElementById("rite").value;

    if (!dateVal) return;

    const date = new Date(dateVal);

    const result = computeCelebration(date, rite);
    renderCelebration(result);
});
