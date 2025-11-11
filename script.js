/***********************
 * CARNETS DISPONIBLES *
 ***********************/
const carnetsBase = [
  { id: "capmission", nom: "Cap Mission", fichier: "carnets/CARNET-DE-CHANTS-CAP-MISSION.json" },
  { id: "frejus", nom: "Diocèse de Fréjus-Toulon", fichier: "carnets/diocese-frejus-toulon.json" },
  { id: "pothin", nom: "Saint Pothin", fichier: "carnets/Saint-Pothin.json" }
];
// "Tous les carnets" toujours en premier, puis tri alpha
const carnetsDisponibles = [{ id: "tous", nom: "Tous les carnets", fichier: "ALL" }]
  .concat([...carnetsBase].sort((a, b) => a.nom.localeCompare(b.nom)));

/************************
 * SÉLECTEURS PRINCIPAUX *
 ************************/
const dateInput   = document.getElementById("dateInput");
const riteSelect  = document.getElementById("riteSelect");
const carnetSelect= document.getElementById("carnetSelect");
const sheetContent= document.getElementById("sheetContent");
const seasonPill  = document.getElementById("seasonPill");
const ritePill    = document.getElementById("ritePill");
const titreMesse  = document.getElementById("titreMesse");
const dateLisible = document.getElementById("dateLisible");

/***************
 * ÉTAT GLOBAL *
 ***************/
let chants = [];
let indexPartie = 0;
let rite = "ordinaire";

const PARTIES = {
  ordinaire: ["entrée", "offertoire", "communion", "envoi"],
  extraordinaire: ["introït", "offertoire", "communion", "ite missa est"]
};

/************************
 * SANCTORAL SIMPLIFIÉ  *
 * (MM-JJ -> intitulé)  *
 ************************/
const SANCTORAL = {
  "01-01": { nom: "Sainte Marie, Mère de Dieu", couleur: "or" },
  "03-19": { nom: "Saint Joseph, époux de la Vierge Marie", couleur: "or" },
  "06-24": { nom: "Nativité de saint Jean-Baptiste", couleur: "or" },
  "06-29": { nom: "Saints Pierre et Paul", couleur: "rouge" },
  "08-15": { nom: "Assomption de la Vierge Marie", couleur: "or" },
  "11-01": { nom: "Toussaint", couleur: "or" },
  "11-11": { nom: "Saint Martin de Tours", couleur: "or" },
  "12-08": { nom: "Immaculée Conception", couleur: "or" },
  "12-25": { nom: "Nativité du Seigneur (Noël)", couleur: "or" }
};

/**********************
 * OUTILS DE FORMATAGE
 **********************/
function formatDateLisible(d) {
  const jours = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
  const mois  = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
  return `${jours[d.getDay()]} ${String(d.getDate()).padStart(2,"0")} ${mois[d.getMonth()]} ${d.getFullYear()}`;
}

function determinerTempsLiturgique(d) {
  const m = d.getMonth()+1;
  if (m === 11) return { libelle: "Avent", couleur: "violet" };
  if (m === 12 || m === 1) return { libelle: "Temps de Noël", couleur: "or" };
  if (m === 2 || m === 3) return { libelle: "Carême", couleur: "violet" };
  if (m === 4 || m === 5) return { libelle: "Temps pascal", couleur: "or" };
  return { libelle: "Temps ordinaire", couleur: "vert" };
}

function appliquerCouleur(couleur) {
  document.body.setAttribute("data-couleur", couleur);
  seasonPill.className = "pill"; // reset
  if (couleur === "violet") seasonPill.classList.add("violet");
  else if (couleur === "vert") seasonPill.classList.add("vert");
  else if (couleur === "rouge") seasonPill.classList.add("rouge");
  else seasonPill.classList.add("or");
}

/*****************
 * CHARGEMENT JSON
 *****************/
async function fetchJSON(url) {
  try {
    const r = await fetch(url + "?v=" + Date.now());
    if (!r.ok) throw new Error(r.status);
    return await r.json();
  } catch (e) {
    console.error("Erreur de chargement", url, e);
    return [];
  }
}

async function chargerCarnet(fichier) {
  if (fichier === "ALL") {
    let tous = [];
    for (const c of carnetsDisponibles) {
      if (c.fichier !== "ALL") {
        const data = await fetchJSON(c.fichier);
        tous = tous.concat(Array.isArray(data) ? data : []);
      }
    }
    return tous;
  }
  const data = await fetchJSON(fichier);
  return Array.isArray(data) ? data : [];
}

/*************************
 * TITRE + CARTOUCHES TOP
 *************************/
function majEntete() {
  const val = dateInput.value;
  if (!val) {
    titreMesse.textContent = "Feuille de Messe";
    dateLisible.textContent = "";
    seasonPill.textContent = "—";
    appliquerCouleur("vert");
    ritePill.textContent = rite === "ordinaire" ? "Rite ordinaire" : "Rite extraordinaire";
    return;
  }
  const d = new Date(val);
  const cle = `${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const fete = SANCTORAL[cle] || null;

  const temps = determinerTempsLiturgique(d);
  const couleur = fete?.couleur || temps.couleur;

  // cartouches
  seasonPill.textContent = fete ? fete.nom : temps.libelle;
  appliquerCouleur(couleur);
  ritePill.textContent = rite === "ordinaire" ? "Rite ordinaire" : "Rite extraordinaire";

  // titre centré
  titreMesse.textContent = fete ? fete.nom : `${formatDateLisible(d)} — ${temps.libelle}`;
  dateLisible.textContent = formatDateLisible(d);
}

/*********************
 * SUGGESTIONS + NAV *
 *********************/
function filtrerChantsPour(partie, riteCourant) {
  return chants.filter(ch => {
    if (typeof ch.categorie === "string") {
      return ch.categorie.toLowerCase() === partie;
    }
    if (ch.categorie && ch.categorie[riteCourant]) {
      return String(ch.categorie[riteCourant]).toLowerCase() === partie;
    }
    return false;
  });
}

function renderSuggestions() {
  const cont = document.getElementById("suggestions");
  cont.innerHTML = "";

  const parties = PARTIES[rite];
  const partieCourante = parties[indexPartie];

  // En-tête de section (titre + bouton ↻)
  const header = document.createElement("div");
  header.className = "section-header";
  header.innerHTML = `<h2>${partieCourante.charAt(0).toUpperCase() + partieCourante.slice(1)}</h2>`;
  const reloadBtn = document.createElement("button");
  reloadBtn.className = "btn-ghost";
  reloadBtn.title = "Autres suggestions";
  reloadBtn.textContent = "↻";
  reloadBtn.addEventListener("click", () => renderSuggestions());
  header.appendChild(reloadBtn);
  cont.appendChild(header);

  // Liste des cartes
  const cards = document.createElement("div");
  cards.className = "cards";
  const liste = filtrerChantsPour(partieCourante, rite);

  if (liste.length === 0) {
    const p = document.createElement("p");
    p.textContent = "Aucune suggestion disponible pour cette partie.";
    cont.appendChild(p);
  } else {
    liste.slice(0, 3).forEach(ch => {
      const card = document.createElement("div");
      card.className = "card card-title-only";
      card.innerHTML = `<h3>${ch.titre}</h3>`;
      card.addEventListener("click", () => {
        card.classList.toggle("selected");
        ajouterDansFeuille(partieCourante, ch);
      });
      cards.appendChild(card);
    });
    cont.appendChild(cards);
  }

  // Barre d'action (Précédent / Suivant)
  const actions = document.createElement("div");
  actions.className = "step-controls";

  const prev = document.createElement("button");
  prev.className = "btn secondary";
  prev.textContent = "Partie précédente";
  prev.disabled = indexPartie === 0;
  prev.addEventListener("click", () => {
    if (indexPartie > 0) {
      indexPartie--;
      renderSuggestions();
    }
  });

  const next = document.createElement("button");
  next.className = "btn";
  next.textContent = "Partie suivante";
  next.disabled = indexPartie >= parties.length - 1;
  next.addEventListener("click", () => {
    if (indexPartie < parties.length - 1) {
      indexPartie++;
      renderSuggestions();
    }
  });

  actions.appendChild(prev);
  actions.appendChild(next);
  cont.appendChild(actions);
}

/*********************
 * FEUILLE DE MESSE  *
 *********************/
function ajouterDansFeuille(partie, chant) {
  // Ajout simple : Titre + texte (si présent)
  const bloc = document.createElement("section");
  bloc.innerHTML = `<h3>${intitulePartie(partie)}</h3><p><strong>${chant.titre}</strong></p>${chant.texte ? `<p>${chant.texte.replace(/\n/g,"<br>")}</p>` : ""}`;
  sheetContent.appendChild(bloc);
}

function intitulePartie(slug) {
  switch (slug) {
    case "entrée": return "Chant d’entrée";
    case "offertoire": return "Chant d’offertoire";
    case "communion": return "Chant de communion";
    case "envoi": return "Chant d’envoi";
    case "introït": return "Introït";
    case "ite missa est": return "Ite, missa est";
    default: return slug;
  }
}

/****************
 * INITIALISATION
 ****************/
async function init() {
  // Remplir la liste des carnets
  carnetsDisponibles.forEach(c => {
    const o = document.createElement("option");
    o.value = c.fichier;
    o.textContent = c.nom;
    carnetSelect.appendChild(o);
  });

  // Écouteurs
  carnetSelect.addEventListener("change", async (e) => {
    chants = await chargerCarnet(e.target.value);
    indexPartie = 0;
    renderSuggestions();
  });

  riteSelect.addEventListener("change", (e) => {
    rite = e.target.value;
    ritePill.textContent = rite === "ordinaire" ? "Rite ordinaire" : "Rite extraordinaire";
    indexPartie = 0;
    majEntete();
    renderSuggestions();
  });

  dateInput.addEventListener("change", () => {
    majEntete();
  });

  // Valeurs par défaut
  ritePill.textContent = "Rite ordinaire";
  dateInput.valueAsDate = new Date(); // aujourd'hui
  majEntete();

  // Charger « Tous les carnets » par défaut
  carnetSelect.value = "ALL";
  chants = await chargerCarnet("ALL");
  renderSuggestions();
}

document.addEventListener("DOMContentLoaded", init);
