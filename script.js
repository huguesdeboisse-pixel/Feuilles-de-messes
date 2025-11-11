// --- Configuration initiale ---
const partiesMesseRE = ["Entrée", "Offertoire", "Communion", "Envoi", "Antienne mariale"];
const partiesMesseRO = ["Entrée", "Offertoire", "Communion", "Envoi"];
let partieIndex = 0;

let chants = [];
let selections = {};
let partieCourante = "Entrée";

const carnetSelect = document.getElementById("carnet");
const riteSelect = document.getElementById("rite");
const suggestionsDiv = document.getElementById("suggestions");
const feuilleDiv = document.getElementById("feuille");
const btnSuivante = document.getElementById("suivante");
const btnPrecedente = document.getElementById("precedente");
function definirCouleurLiturgique() {
  const date = document.getElementById("date").value;
  const mois = date.split("-")[1];
  let couleur = "vert";

  if (["12", "01"].includes(mois)) couleur = "violet"; // Avent
  if (["02", "03"].includes(mois)) couleur = "violet"; // Carême
  if (["04", "05"].includes(mois)) couleur = "or";     // Pâques
  if (["06"].includes(mois)) couleur = "rouge";        // Pentecôte
  if (["11"].includes(mois)) couleur = "vert";         // Temps ordinaire
  document.body.setAttribute("data-couleur", couleur);
}

// --- Charger un carnet JSON ---
async function chargerCarnet(fichier) {
  try {
    const res = await fetch(`./carnets/${fichier}`);
    chants = await res.json();
    console.log(`✅ ${chants.length} chants chargés (${fichier})`);
    renderSuggestions();
  } catch (err) {
    console.error("Erreur de chargement :", err);
    suggestionsDiv.innerHTML = "<p>Erreur de chargement du carnet.</p>";
  }
}

// --- Filtrer les chants selon la partie ---
function getSuggestions(partie) {
  let suggestions = chants.filter(c => c.categorie?.toLowerCase() === partie.toLowerCase());
  if (suggestions.length === 0) {
    console.warn("Aucune suggestion directe trouvée — recherche élargie");
    suggestions = chants.filter(c => c.categorie && c.categorie !== partie);
  }
  return suggestions.sort(() => 0.5 - Math.random()).slice(0, 3);
}

// --- Afficher les suggestions ---
function renderSuggestions() {
  suggestionsDiv.innerHTML = "";
  const suggestions = getSuggestions(partieCourante);
  const titrePartie = document.createElement("h3");
  titrePartie.textContent = partieCourante;
  suggestionsDiv.appendChild(titrePartie);

  suggestions.forEach(chant => {
    const card = document.createElement("div");
    card.className = "chant-card";
    card.textContent = chant.titre;

    // gestion clic sélection / désélection
    card.addEventListener("click", () => {
      const id = chant.id;
      if (!selections[partieCourante]) selections[partieCourante] = [];
      if (selections[partieCourante].includes(id)) {
        selections[partieCourante] = selections[partieCourante].filter(x => x !== id);
        card.classList.remove("selected");
      } else {
        selections[partieCourante].push(id);
        card.classList.add("selected");
      }
      renderFeuille();
    });

    suggestionsDiv.appendChild(card);
  });
}

// --- Afficher la feuille de messe complète ---
function renderFeuille() {
  feuilleDiv.innerHTML = `
    <h2>Feuille de Messe</h2>
    <p>${new Date().toLocaleDateString("fr-FR")} • ${riteSelect.value}</p>
  `;

  Object.entries(selections).forEach(([partie, ids]) => {
    const chantsPartie = chants.filter(c => ids.includes(c.id));
    if (chantsPartie.length === 0) return;

    const section = document.createElement("section");
    section.innerHTML = `<h3>${partie}</h3>`;
    chantsPartie.forEach(c => {
      const bloc = document.createElement("div");
      bloc.innerHTML = `
        <p><strong>${c.titre}</strong></p>
        <pre>${c.texte}</pre>
      `;
      section.appendChild(bloc);
    });
    feuilleDiv.appendChild(section);
  });
}

// --- Navigation entre les parties ---
function partieSuivante() {
  const parties = riteSelect.value === "Extraordinaire" ? partiesMesseRE : partiesMesseRO;
  if (partieIndex < parties.length - 1) partieIndex++;
  partieCourante = parties[partieIndex];
  renderSuggestions();
}
function partiePrecedente() {
  const parties = riteSelect.value === "Extraordinaire" ? partiesMesseRE : partiesMesseRO;
  if (partieIndex > 0) partieIndex--;
  partieCourante = parties[partieIndex];
  renderSuggestions();
}

// --- Événements ---
btnSuivante.addEventListener("click", partieSuivante);
btnPrecedente.addEventListener("click", partiePrecedente);
carnetSelect.addEventListener("change", e => chargerCarnet(e.target.value));
riteSelect.addEventListener("change", renderSuggestions);

// --- Initialisation ---
document.addEventListener("DOMContentLoaded", () => {
  chargerCarnet("diocese-frejus-toulon.json");
});
document.getElementById("date").addEventListener("change", definirCouleurLiturgique);
riteSelect.addEventListener("change", () => { definirCouleurLiturgique(); renderSuggestions(); });

