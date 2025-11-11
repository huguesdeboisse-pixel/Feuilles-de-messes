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
riteSelect.addEventListener("change", handleReload);
carnetSelect.addEventListener("change", handleReload);
reloadBtn.addEventListener("click", handleReload);
nextBtn.addEventListener("click", () => changerPartie(1));
prevBtn.addEventListener("click", () => changerPartie(-1));

// === CHARGEMENT DES CARNETS DISPONIBLES ===
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
      chants = []; // fusion multiple à venir
    } else {
      const response = await fetch(url + "?v=" + Date.now());
      chants = await response.json();
    }
    console.log(`✅ ${chants.length} chants chargés`);
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

// === CALCUL DU NOM DU JOUR (TEMPORAIRE EN ATTENDANT SANCTORAL) ===
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

// === AFFICHAGE DES SUGGESTIONS ===
function renderSuggestions() {
  const part = parties[currentPartIndex];
  const rite = riteSelect.value;
  const saison = sheetSeason.textContent;

  // masquer toutes les sections
  document.querySelectorAll(".suggestions section").forEach(s => s.style.display = "none");
  const currentSection = document.querySelector(`.suggestions section[data-cat="${part}"]`);
  currentSection.style.display = "block";

  const cardsContainer = document.getElementById(`cards-${part}`);
  cardsContainer.innerHTML = "";

  // Filtrage intelligent
  let resultats = chants.filter(c =>
    (c.categorie?.toLowerCase() || "").includes(part) &&
    (!c.rite || c.rite.includes(rite)) &&
    (!c.temps || c.temps.includes(saison))
  );

  // Si rien trouvé, on prend des chants généraux
  if (resultats.length === 0 && chants.length > 0) {
    resultats = chants.sort(() => 0.5 - Math.random()).slice(0, 5);
  }

  // Afficher les suggestions
  resultats.slice(0, 5).forEach(chant => {
    const div = document.createElement("div");
    div.className = "card card-title-only";
    div.innerHTML = `<h3>${chant.titre}</h3>`;

    if (selectedChants[part].includes(chant)) div.classList.add("selected");

    div.addEventListener("click", () => {
      if (selectedChants[part].includes(chant)) {
        selectedChants[part] = selectedChants[part].filter(c => c !== chant);
        div.classList.remove("selected");
      } else {
        selectedChants[part].push(chant);
        div.classList.add("selected");
      }
      majFeuilleMesse();
    });

    cardsContainer.appendChild(div);
  });

  majFeuilleMesse();
}

// === NAVIGATION ENTRE PARTIES ===
function changerPartie(direction) {
  currentPartIndex += direction;
  if (currentPartIndex < 0) currentPartIndex = 0;
  if (currentPartIndex >= parties.length) currentPartIndex = parties.length - 1;
  renderSuggestions();
}

// === MISE À JOUR DE LA FEUILLE DE MESSE ===
function majFeuilleMesse() {
  const rite = riteSelect.value;
  const date = dateInput.value || "—";

  // Mise à jour des infos d’en-tête
  sheetDate.textContent = date.split("-").reverse().join("/");
  sheetRite.textContent = rite === "ordinaire" ? "Rite ordinaire" : "Rite extraordinaire";
  document.querySelector(".mass-title").textContent = nomDuJourLiturgique(date);

  sheetContent.innerHTML = "";

  parties.forEach(part => {
    if (selectedChants[part].length === 0) return;
    const bloc = document.createElement("section");
    bloc.innerHTML = `<h3>${titrePartie(part)}</h3>`;
    selectedChants[part].forEach(ch => {
      bloc.innerHTML += `<p><strong>${ch.titre}</strong></p>`;
    });
    sheetContent.appendChild(bloc);
  });
}

// === TRADUCTION DES NOMS DE PARTIES ===
function titrePartie(part) {
  switch (part) {
    case "entree": return "Chant d'entrée";
    case "offertoire": return "Chant d'offertoire";
    case "communion": return "Chant de communion";
    case "envoi": return "Chant d'envoi";
    case "antienne_mariale": return "Antienne mariale";
    default: return part;
  }
}
