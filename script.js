// =============================
// CONFIGURATION DES CARNETS
// =============================
const carnetsDisponibles = [
  { id: "frejus", nom: "Diocèse de Fréjus-Toulon", fichier: "carnets/diocese-frejus-toulon.json" },
  { id: "pothin", nom: "Saint Pothin", fichier: "carnets/Saint-Pothin.json" },
  { id: "capmission", nom: "Cap Mission", fichier: "carnets/CARNET-DE-CHANTS-CAP-MISSION.json" }
];

// Ajoute aussi l’option “tous les carnets”
carnetsDisponibles.push({ id: "tous", nom: "Tous les carnets", fichier: "ALL" });

// =============================
// VARIABLES GLOBALES
// =============================
let chants = [];
let indexPartie = 0;
let rite = "ordinaire";

const partiesMesse = {
  ordinaire: ["entrée", "offertoire", "communion", "envoi"],
  extraordinaire: ["introït", "offertoire", "communion", "ite missa est"]
};

// =============================
// CHARGEMENT DES CARNETS
// =============================
async function chargerCarnet(fichier) {
  try {
    const response = await fetch(fichier);
    const data = await response.json();
    return data;
  } catch (err) {
    console.error("❌ Erreur de chargement :", err);
    return [];
  }
}

async function chargerTousLesCarnets() {
  let tous = [];
  for (const c of carnetsDisponibles) {
    if (c.fichier !== "ALL") {
      const data = await chargerCarnet(c.fichier);
      tous = tous.concat(data);
    }
  }
  return tous;
}

// =============================
// AFFICHAGE DU MENU DES CARNETS
// =============================
const selectCarnet = document.getElementById("carnet");
carnetsDisponibles.forEach(c => {
  const opt = document.createElement("option");
  opt.value = c.fichier;
  opt.textContent = c.nom;
  selectCarnet.appendChild(opt);
});

// =============================
// GESTION DES SUGGESTIONS
// =============================
function filtrerChants(chants, partie, rite) {
  return chants.filter(ch => {
    if (typeof ch.categorie === "string") return ch.categorie === partie;
    if (ch.categorie && ch.categorie[rite]) return ch.categorie[rite] === partie;
    return false;
  });
}

function renderSuggestions() {
  const suggestionsDiv = document.getElementById("suggestions");
  suggestionsDiv.innerHTML = "";

  const parties = partiesMesse[rite];
  const partieCourante = parties[indexPartie];
  const suggestions = filtrerChants(chants, partieCourante, rite);

  const titre = document.createElement("h3");
  titre.textContent = partieCourante.charAt(0).toUpperCase() + partieCourante.slice(1);
  suggestionsDiv.appendChild(titre);

  if (suggestions.length === 0) {
    const p = document.createElement("p");
    p.textContent = "Aucun chant trouvé pour cette partie.";
    suggestionsDiv.appendChild(p);
  } else {
    suggestions.slice(0, 3).forEach(ch => {
      const card = document.createElement("div");
      card.className = "suggestion-card";
      card.innerHTML = `<strong>${ch.titre}</strong>`;
      card.addEventListener("click", () => {
        card.classList.toggle("selected");
        ajouterAFeuille(ch);
      });
      suggestionsDiv.appendChild(card);
    });
  }

  // Boutons navigation
  const navDiv = document.createElement("div");
  navDiv.className = "nav-buttons";

  const btnPrev = document.createElement("button");
  btnPrev.textContent = "◀ Partie précédente";
  btnPrev.disabled = indexPartie === 0;
  btnPrev.addEventListener("click", () => {
    if (indexPartie > 0) {
      indexPartie--;
      renderSuggestions();
    }
  });

  const btnNext = document.createElement("button");
  btnNext.textContent = "Partie suivante ▶";
  btnNext.disabled = indexPartie >= parties.length - 1;
  btnNext.addEventListener("click", () => {
    if (indexPartie < parties.length - 1) {
      indexPartie++;
      renderSuggestions();
    }
  });

  navDiv.appendChild(btnPrev);
  navDiv.appendChild(btnNext);
  suggestionsDiv.appendChild(navDiv);
}

// =============================
// FEUILLE DE MESSE
// =============================
function ajouterAFeuille(chant) {
  const feuille = document.getElementById("feuille");
  const section = document.createElement("div");
  section.className = "chant-section";

  const titre = document.createElement("h4");
  titre.textContent = chant.titre;
  section.appendChild(titre);

  const texte = document.createElement("pre");
  texte.textContent = chant.texte;
  section.appendChild(texte);

  feuille.appendChild(section);
}

// =============================
// CHARGEMENT INITIAL
// =============================
async function init() {
  selectCarnet.addEventListener("change", async e => {
    const fichier = e.target.value;
    if (fichier === "ALL") chants = await chargerTousLesCarnets();
    else chants = await chargerCarnet(fichier);

    console.log(`✅ ${chants.length} chants chargés`);
    renderSuggestions();
  });

  const riteSelect = document.getElementById("rite");
  riteSelect.addEventListener("change", e => {
    rite = e.target.value;
    indexPartie = 0;
    renderSuggestions();
  });
}

init();
