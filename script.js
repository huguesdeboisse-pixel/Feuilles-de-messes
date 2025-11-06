/*************************
 * CONFIG
 *************************/
const CARNETS = [
  // Ajoutez d’autres carnets ici au besoin
  { value: "frejus", label: "Fréjus-Toulon", file: "carnets/diocese-frejus-toulon-classe.json" }
];

const ORDER_ORDINAIRE = ["entree", "offertoire", "communion", "envoi"];
const ORDER_EXTRA     = ["entree", "offertoire", "communion", "envoi"]; // l’antienne mariale est auto-ajoutée

const LABELS = {
  entree: "Entrée",
  offertoire: "Offertoire",
  communion: "Communion",
  envoi: "Envoi",
  antienne_mariale: "Antienne mariale",
};

/*************************
 * ÉTAT GLOBAL
 *************************/
let chants = [];
let currentCarnet = CARNETS[0].value;
let currentOrder = ORDER_ORDINAIRE.slice();
let stepIndex = 0;                    // position dans currentOrder
let randomSeedByCat = {};             // pour ↻
let selections = {                    // sélections multiples par partie
  entree: [],
  offertoire: [],
  communion: [],
  envoi: [],
  antienne_mariale: []                // utilisé seulement si vous autorisez la sélection manuelle
};

/*************************
 * RÉFÉRENCES DOM
 *************************/
const dateInput     = document.getElementById("dateInput");
const riteSelect    = document.getElementById("riteSelect");
const carnetSelect  = document.getElementById("carnetSelect");
const filterSeason  = document.getElementById("filterBySeason");

// Conteneurs suggestions (déjà dans votre HTML)
const listContainers = {
  entree: document.getElementById("cards-entree"),
  offertoire: document.getElementById("cards-offertoire"),
  communion: document.getElementById("cards-communion"),
  envoi: document.getElementById("cards-envoi"),
  antienne_mariale: document.getElementById("cards-antienne_mariale"),
};
// Sections à masquer/afficher
const sections = {
  entree: document.querySelector('section[data-cat="entree"]'),
  offertoire: document.querySelector('section[data-cat="offertoire"]'),
  communion: document.querySelector('section[data-cat="communion"]'),
  envoi: document.querySelector('section[data-cat="envoi"]'),
  antienne_mariale: document.querySelector('section[data-cat="antienne_mariale"]'),
};

// Sortie A4
const outContainers = {
  entree: document.getElementById("out-entree"),
  offertoire: document.getElementById("out-offertoire"),
  communion: document.getElementById("out-communion"),
  envoi: document.getElementById("out-envoi"),
  antienne_mariale: document.getElementById("out-antienne_mariale"),
};

// Zone de contrôle (créée dynamiquement)
let controlsBar = null;

/*************************
 * INIT
 *************************/
init();

async function init() {
  // Remplit la liste de carnets
  CARNETS.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.value;
    opt.textContent = c.label;
    carnetSelect.appendChild(opt);
  });
  carnetSelect.value = currentCarnet;

  // Date par défaut
  dateInput.valueAsDate = new Date();

  // Écouteurs (MAJ immédiate)
  [dateInput, riteSelect, carnetSelect, filterSeason].forEach(el => {
    el.addEventListener("input", handleParamChange);
  });

  // Transforme les boutons "Autre suggestion" existants en icône ↻
  document.querySelectorAll(".btn-ghost.other").forEach(btn => {
    btn.textContent = "↻";
    btn.title = "Autres suggestions";
    btn.addEventListener("click", () => rerollCurrent());
  });

  // Crée la barre de contrôle (↻ + Partie suivante)
  createControlsBar();

  // Charge le carnet + démarre à la première partie
  await reloadCarnet();
  gotoStep(0);
}

/*************************
 * PARAMÈTRES / RELOAD
 *************************/
async function handleParamChange(e) {
  if (e.target === carnetSelect) {
    currentCarnet = carnetSelect.value;
    await reloadCarnet();
    // On redémarre le parcours
    resetSelections();
    gotoStep(0);
  } else if (e.target === riteSelect) {
    updateOrderForRite();
    // Antienne mariale auto si RE
    handleAntienneAuto();
    // Rien ne “casse” : on reste sur la même étape mais on rafraîchit les suggestions
    renderHeader();
    renderCurrentSuggestions();
  } else {
    // Date / filtre saison → affecte header + suggestions
    renderHeader();
    renderCurrentSuggestions();
  }
}

async function reloadCarnet() {
  const meta = CARNETS.find(c => c.value === currentCarnet) || CARNETS[0];
  try {
    const res = await fetch(meta.file + "?v=" + Date.now());
    const data = await res.json();
    chants = Array.isArray(data) ? data : (Array.isArray(data?.chants) ? data.chants : []);
    console.info(`✅ ${chants.length} chants chargés (${meta.label})`);
  } catch (e) {
    console.error("❌ Erreur de chargement du carnet :", e);
    chants = [];
  }
  renderHeader();
  updateOrderForRite();
  handleAntienneAuto(); // au cas où le rite soit déjà "extraordinaire"
}

/*************************
 * ÉTAPES / PARCOURS
 *************************/
function updateOrderForRite() {
  const isExtra = riteSelect.value === "extraordinaire";
  currentOrder = isExtra ? ORDER_EXTRA.slice() : ORDER_ORDINAIRE.slice();
  // Affiche/masque la section antienne côté suggestions (on ne s’en sert pas en mode “auto”)
  if (sections.antienne_mariale) {
    sections.antienne_mariale.style.display = isExtra ? "none" : "none"; // on la cache dans tous les cas (sélection auto)
  }
}

function resetSelections() {
  selections = { entree: [], offertoire: [], communion: [], envoi: [], antienne_mariale: [] };
  Object.values(outContainers).forEach(el => el.innerHTML = "");
}

function gotoStep(index) {
  stepIndex = Math.max(0, Math.min(index, currentOrder.length - 1));
  // Masque toutes les sections de gauche sauf l’actuelle
  Object.keys(sections).forEach(cat => {
    if (!sections[cat]) return;
    sections[cat].style.display = "none";
  });
  const currentCat = currentOrder[stepIndex];
  if (sections[currentCat]) sections[currentCat].style.display = "";

  // Rend les suggestions de la partie courante
  renderCurrentSuggestions();
  // Met à jour l’état du bouton "Partie suivante"
  updateControlsBar();
}

/*************************
 * RENDER HEADER (en-tête A4)
 *************************/
function renderHeader() {
  const d = dateInput.value ? new Date(dateInput.value) : new Date();
  document.getElementById("sheetDate").textContent = d.toLocaleDateString("fr-FR");
  document.getElementById("sheetRite").textContent =
    riteSelect.value === "extraordinaire" ? "Rite extraordinaire" : "Rite ordinaire";

  const { name, className, title } = detectSeasonRough(d);
  const pill = document.getElementById("sheetSeason");
  pill.textContent = name;
  pill.className = "season-pill " + className;
  document.querySelector(".mass-title").textContent = title;
}

// Placeholder très simple (vous brancherez votre vrai calcul plus tard)
function detectSeasonRough(d) {
  const m = d.getMonth() + 1;
  if (m === 12 || m === 1) return { name: "Avent", className: "season-avent", title: "Dimanche de l’Avent" };
  if (m === 3)            return { name: "Carême", className: "season-careme", title: "Dimanche de Carême" };
  if (m === 4)            return { name: "Temps pascal", className: "season-solennite", title: "Dimanche de Pâques" };
  return { name: "Temps ordinaire", className: "season-ordinaire", title: "Feuille de Messe" };
}

/*************************
 * SUGGESTIONS (PARTIE COURANTE)
 *************************/
function renderCurrentSuggestions() {
  const cat = currentOrder[stepIndex];
  const cont = listContainers[cat];
  if (!cont) return;

  // Efface et (re)construit
  cont.innerHTML = "";

  const riteWanted = riteSelect.value;
  let pool = chants.filter(c => c.categorie === cat);
  // Filtre rite (si info absente → on accepte)
  pool = pool.filter(c => !Array.isArray(c.rite) || c.rite.length === 0 || c.rite.includes(riteWanted));

  // TODO : filtre par saison si filterSeason.checked et si vos données le permettent

  // Mélange (seed par cat pour que ↻ change le tirage)
  const seed = randomSeedByCat[cat] || 0;
  const candidates = shuffleDeterministic(pool, seed).slice(0, 3);

  if (!candidates.length) {
    const msg = document.createElement("div");
    msg.textContent = "Aucune suggestion disponible pour cette partie.";
    msg.style.color = "#777";
    msg.style.fontSize = "13px";
    cont.appendChild(msg);
    return;
  }

  // Construit des cartes “titre seul” cliquables (sélection multiple)
  candidates.forEach(ch => {
    const card = document.createElement("div");
    card.className = "card";
    card.style.cursor = "pointer";
    card.innerHTML = `<h3>${sanitize(ch.titre || "Sans titre")}</h3>`;
    // survol/état
    const isAlready = selections[cat].some(s => s.id === ch.id);
    if (isAlready) card.classList.add("selected");

    card.addEventListener("click", () => {
      toggleSelection(cat, ch, card);
    });

    cont.appendChild(card);
  });
}

// (dé)sélectionne un chant pour la partie en cours
function toggleSelection(cat, ch, cardEl) {
  const arr = selections[cat];
  const idx = arr.findIndex(x => x.id === ch.id);
  if (idx >= 0) {
    arr.splice(idx, 1);
    cardEl.classList.remove("selected");
  } else {
    arr.push(ch);
    cardEl.classList.add("selected");
  }
}

/*************************
 * CONTRÔLES (↻ / PARTIE SUIVANTE)
 *************************/
function createControlsBar() {
  // Création si absente, insérée après le bloc .suggestions
  if (controlsBar) return;
  const suggestionsWrap = document.querySelector(".suggestions");
  controlsBar = document.createElement("div");
  controlsBar.id = "stepControls";
  controlsBar.style.display = "flex";
  controlsBar.style.gap = "8px";
  controlsBar.style.marginTop = "12px";
  controlsBar.style.alignItems = "center";
  controlsBar.style.justifyContent = "space-between";

  const reloadBtn = document.createElement("button");
  reloadBtn.className = "btn-ghost";
  reloadBtn.textContent = "↻";
  reloadBtn.title = "Autres suggestions";
  reloadBtn.addEventListener("click", () => rerollCurrent());

  const nextBtn = document.createElement("button");
  nextBtn.className = "btn";
  nextBtn.textContent = "Partie suivante";
  nextBtn.addEventListener("click", () => commitAndNext());

  controlsBar.appendChild(reloadBtn);
  controlsBar.appendChild(nextBtn);
  suggestionsWrap.parentNode.insertBefore(controlsBar, suggestionsWrap.nextSibling);
}

function updateControlsBar() {
  // Ici, vous pouvez griser “Partie suivante” si vous exigez au moins un choix
  // (actuellement non obligatoire)
}

function rerollCurrent() {
  const cat = currentOrder[stepIndex];
  randomSeedByCat[cat] = Math.floor(Math.random() * 1e9);
  renderCurrentSuggestions();
}

function commitAndNext() {
  // Valide la partie courante : écrit les chants sélectionnés dans la feuille A4
  const cat = currentOrder[stepIndex];
  renderPartToSheet(cat);

  // Si on est à la dernière partie de la séquence, on ne va pas plus loin
  if (stepIndex >= currentOrder.length - 1) return;

  // Sinon on passe à la partie suivante
  gotoStep(stepIndex + 1);
}

/*************************
 * RENDU FEUILLE A4
 *************************/
function renderPartToSheet(cat) {
  const host = outContainers[cat];
  if (!host) return;
  host.innerHTML = ""; // on remplace tout pour refléter la sélection finale

  const chosen = selections[cat] || [];
  if (!chosen.length) {
    // rien choisi → section vide
    return;
  }

  chosen.forEach(ch => {
    const block = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = `${headingFor(cat)} — ${ch.titre || "Sans titre"}`;
    block.appendChild(title);

    // Renvoi page si carnet spécifique (≠ “all”) et info disponible
    if (currentCarnet !== "all" && (ch.source_pages || ch.source_pdf)) {
      const ref = document.createElement("div");
      ref.className = "ref";
      let refText = "";
      if (Array.isArray(ch.source_pages) && ch.source_pages.length) {
        refText = `p. ${ch.source_pages[0]}`;
      }
      if (ch.source_pdf) {
        const pdfName = (ch.source_pdf.split(/[\\/]/).pop() || "").replace(/\.\w+$/, "");
        refText = (refText ? refText + " • " : "") + pdfName;
      }
      if (refText) block.appendChild(ref);
    }

    const lyrics = document.createElement("div");
    lyrics.className = "lyrics";
    lyrics.textContent = ch.texte || "";
    block.appendChild(lyrics);

    host.appendChild(block);
  });
}

function headingFor(cat) {
  switch (cat) {
    case "entree": return "Chant d’entrée";
    case "offertoire": return "Chant d’offertoire";
    case "communion": return "Chant de communion";
    case "envoi": return "Chant d’envoi";
    case "antienne_mariale": return "Antienne mariale";
    default: return "Chant";
  }
}

/*************************
 * ANTENNE MARIALE AUTO (RE)
 *************************/
function handleAntienneAuto() {
  const isExtra = riteSelect.value === "extraordinaire";
  const host = outContainers.antienne_mariale;
  if (!host) return;

  host.innerHTML = "";

  if (!isExtra) return; // rien en rite ordinaire

  // Cherche une antienne mariale par défaut
  const pool = chants.filter(c =>
    c.categorie === "antienne_mariale" &&
    (!Array.isArray(c.rite) || c.rite.length === 0 || c.rite.includes("extraordinaire"))
  );

  if (!pool.length) return;

  // Choix simple : premier de la liste (ou random si vous préférez)
  const ch = pool[0];

  const block = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = `Antienne mariale — ${ch.titre || "Sans titre"}`;
  block.appendChild(title);

  const lyrics = document.createElement("div");
  lyrics.className = "lyrics";
  lyrics.textContent = ch.texte || "";
  block.appendChild(lyrics);

  host.appendChild(block);
}

/*************************
 * OUTILS
 *************************/
function shuffleDeterministic(arr, seed = 0) {
  const a = arr.slice();
  let s = seed >>> 0;
  function rnd() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  }
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sanitize(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}
