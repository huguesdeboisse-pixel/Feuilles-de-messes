// ===========================================
// SCRIPT PRINCIPAL POUR TEST DU MOTEUR
// ===========================================

import { computeLiturgicalDay } from "./src/data/liturgie/engine/computeLiturgicalDay.js";

// Logs pour vérifier le chargement
console.log(">>> script_v2.js chargé");
console.log(">>> IMPORT computeLiturgicalDay =", computeLiturgicalDay);

// Exposer au scope global pour tests console
window.computeLiturgicalDay = computeLiturgicalDay;


// ===========================================
// DOMContentLoaded
// ===========================================

document.addEventListener("DOMContentLoaded", () => {

    console.log(">>> DOM chargé");

    const btn = document.getElementById("computeBtn");
    const dateInput = document.getElementById("dateInput");
    const riteSelect = document.getElementById("rite");

    const blockTitle  = document.getElementById("feteTitle");
    const blockRank   = document.getElementById("feteRank");
    const blockSeason = document.getElementById("feteSeason");
    const blockComm   = document.getElementById("commemorations");

    if (!btn) {
        console.error("Bouton #computeBtn introuvable");
        return;
    }

    btn.addEventListener("click", async () => {

        const dateValue = dateInput?.value;
        const rite      = riteSelect?.value;

        if (!dateValue) {
            alert("Veuillez choisir une date.");
            return;
        }

        console.log(`>>> Calcul pour ${dateValue}, rite=${rite}`);

        try {
            // Appel du moteur liturgique
            const res = await computeLiturgicalDay(dateValue, rite);

            console.log(">>> Résultat liturgique :", res);

            // ---------------------------
            // Mise à jour de l’affichage
            // ---------------------------

            if (res?.primary) {
                blockTitle.textContent  = res.primary.title ?? "(titre indisponible)";
                blockRank.textContent   = res.primary.rank  ?? "";
                blockSeason.textContent = res.primary.season ?? ""; // si vous ajoutez la saison plus tard
            } else {
                blockTitle.textContent  = "(Aucune fête trouvée)";
                blockRank.textContent   = "";
                blockSeason.textContent = "";
            }

            // Commemorations
            if (Array.isArray(res.commemorations) && res.commemorations.length > 0) {
                blockComm.innerHTML = res.commemorations
                    .map(c => `— ${c.title} (${c.rank})`)
                    .join("<br>");
            } else {
                blockComm.textContent = "Aucune commémoration";
            }

        } catch (err) {
            console.error("ERREUR moteur liturgique :", err);
            alert("Erreur : impossible de calculer la fête du jour.");
        }

    });
});
