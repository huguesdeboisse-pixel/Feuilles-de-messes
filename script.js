// === RÉFÉRENCES DOM ===
const dateInput = document.getElementById("dateInput");
const riteSelect = document.getElementById("riteSelect");
const carnetSelect = document.getElementById("carnetSelect");
const sheetContent = document.getElementById("sheetContent");
const sheetDate = document.getElementById("sheetDate");
const sheetRite = document.getElementById("sheetRite");
const sheetSeason = document.getElementById("sheetSeason");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const reloadBtn = document.getElementById("reloadBtn");

let chants = [];
let currentPartIndex = 0;
let selectedChants = {
  entree: [],
  offertoire: [],
  communion: [],
  envoi: [],
  antienne_mariale: []
};

const parties = ["entree", "offertoire", "communion", "envoi", "antienne_mariale"];

// === ANTENNES MARIALES ===
const antiennesMariales = {
  "Avent": {
    titre: "Alma Redemptoris Mater",
    texte: "Alma Redemptoris Mater, quae pervia caeli porta manes...",
  },
  "Noël": {
    titre: "Alma Redemptoris Mater",
    texte: "Alma Redemptoris Mater, quae pervia caeli porta manes...",
  },
  "Carême": {
    titre: "Ave Regina Caelorum",
    texte: "Ave Regina caelorum, Ave Domina angelorum...",
  },
  "Temps pascal": {
    titre: "Regina Caeli",
    texte: "Regina caeli laetare, alleluia...",
  },
  "Temps ordinaire": {
    titre: "Salve Regina",
    texte: "Salve Regina, mater misericordiae...",
  }
};

// === INITIALISATION ===
document.addEventListener("DOMContentLoaded", async () => {
  await chargerCarnets();
  definirCouleurLiturgique();
  handleReload();
});

dateInput.addEventListener("change", () => {
  definirCouleurLiturgique();
  handleReload();
});
riteSelect.addEventListener("change", () => {
  definirCouleurLiturgique();
  handleReload();
});
carnetSelect.addEventListener("change", handleReload);
reloadBtn.addEventListener("click", handleReload);
nextBtn.addEventListener("click", () => changerPartie(1));
prevBtn.addEventListener("click", () => changerPartie(-1));

// === CHARGEMENT DES CARNETS ===
async function chargerCarnets() {
  try {
    const fichiers = [
      { nom: "Fréjus-Toulon", url: "carnets/diocese-frejus-toulon.json" },
      // Ajoutez ici d’autres carnets plus tard
    ];
    carnetSelect.innerHTML = fichiers.map(f => `<option value="${f.url}">${f.nom}</option>`).join("");
    carnetSelect.insertAdjacentHTML("afterbegin", `<option value="tous">Tous les carnets</option>`);
  } catch (err) {
    console.error("Erreur de chargement des carnets :", err);
  }
}

// === RECHARGEMENT DU CARNET COURANT ===
async function handleReload() {
  try {
    const url = carnetSelect.value;
    if (url === "tous") {
      chants = [];
    } else {
      const response = await fetch(url + "?v=" + Date.now());
      chants = await response.json();
    }
    console.log(`✅ ${chants.length} chants chargés`);
    gererAntienneMariale();
    renderSuggestions();
  } catch (err) {
    console.error("❌ Erreur de chargement :", err);
  }
}

// === COULEUR LITURGIQUE SELON LA DATE ===
function definirCouleurLiturgique() {
  const date = dateInput.value;
  if (!date) return;
  const mois = parseInt(date.split("-")[1]);
  let couleur = "vert", texte = "Temps ordinaire";

  if ([11, 12].includes(mois)) { couleur = "violet"; texte = "Avent"; }
  else if ([2, 3].includes(mois)) { couleur = "violet"; texte = "Carême"; }
  else if ([4, 5].includes(mois)) { couleur = "or"; texte = "Temps pascal"; }
  else if (mois === 6) { couleur = "rouge"; texte = "Pentecôte"; }

  document.body.setAttribute("data-couleur", couleur);
  sheetSeason.textContent = texte;
  sheetSeason.style.backgroundColor = getCouleurHex(couleur);
}

function getCouleurHex(c) {
  switch (c) {
    case "vert": return "#317a35";
    case "violet": return "#6a1b9a";
    case "rouge": return "#b71c1c";
    case "or": return "#c4a000";
    default: return "#444";
  }
}

// === NOM DU JOUR (TEMPORAIRE) ===
function nomDuJourLiturgique(dateStr) {
  if (!dateStr) return "Feuille de Messe";
  const d = new Date(dateStr);
  const jour = d.getDate(), mois = d.getMonth() + 1;

  if (mois === 12 && jour < 25) return "3e dimanche de l’Avent";
  if (mois === 12 && jour === 25) return "Noël – Nativité du Seigneur";
  if (mois === 4 && jour < 10) return "Dimanche de Pâques";
  if (mois === 11 && jour === 1) return "Toussaint";
  return `${jour}ᵉ dimanche du temps ordinaire`;
}

// === GESTION DES ANTENNES MARIALES ===
function gererAntienneMariale() {
  const rite = riteSelect.value;
  const saison = sheetSeason.textContent;

  if (rite === "extraordinaire") {
    const antienne = antiennesMariales[saison] || antiennesMariales["Temps ordinaire"];
    selectedChants.antienne_mariale = [{
      titre: antienne.titre,
      texte: antienne.texte
    }];
  } else {
    selectedChants.antienne_mariale = [];
  }
  majFeuilleMesse();
}

// === AFFICHAGE DES SUGGESTIONS ===
function renderSuggestions() {
  const part = parties[currentPartIndex];
  const rite = riteSelect.value;
  const saison = sheetSeason.textContent;

  // masquer toutes les sections
  document.querySelectorAll(".suggestions section").forEach(s => s.style.display = "none");
  const currentSecti

