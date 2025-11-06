/********************
 * CONFIGURATION
 ********************/
const CARNETS = [
  { value: "frejus", label: "Fréjus-Toulon", file: "carnets/diocese-frejus-toulon-classe.json" }
];

/********************
 * VARIABLES GLOBALES
 ********************/
let chants = [];
let currentCarnetValue = "frejus";
let randomSeeds = {
  entree: 0,
  offertoire: 0,
  communion: 0,
  envoi: 0,
  antienne_mariale: 0
};

/********************
 * INITIALISATION
 ********************/
init();

async function init() {
  const carnetSelect = document.getElementById("carnetSelect");

  // Liste déroulante des carnets disponibles
  CARNETS.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.value;
    opt.textContent = c.label;
    carnetSelect.appendChild(opt);
  });

  document.getElementById("dateInput").valueAsDate = new Date();

  // Mise à jour automatique à chaque changement de paramètre
  document.querySelectorAll("#dateInput, #riteSelect, #carnetSelect, #filterBySeason")
    .forEach(el => el.addEventListener("input", handleParameterChange));

  // Boutons "Autre suggestion"
  document.querySelectorAll(".btn-ghost.other").forEach(btn => {
    btn.addEventListener("click", () => {
      const cat = btn.dataset.cat;
      randomSeeds[cat] = Math.random();
      renderSuggestions();
    });
  });

  await handleReload();
}

/********************
 * CHANGEMENT DE PARAMÈTRE
 ********************/
async function handleParameterChange(e) {
  if (e.target.id === "carnetSelect") {
    await handleReload();
  }
  renderHeader();
  renderSuggestions();
}

/********************
 * CHARGEMENT DU CARNET
 ********************/
async function handleReload() {
  currentCarnetValue = document.getElementById("carnetSelect").value || "frejus";
  const meta = CARNETS.find(c => c.value === currentCarnetValue);

  try {
    const res = await fetch(meta.file + "?v=" + Date.now());
    const data = await res.json();

    if (Array.isArray(data)) {
      chants = data;
    } else if (typeof data === "object" && Array.isArray(data.chants)) {
      chants = data.chants;
    } else {
      console.error("Format JSON inattendu :", data);
      chants = [];
    }

    console.info(`✅ ${chants.length} chants chargés (${meta.label})`);
  } catch (e) {
    console.error("❌ Erreur de chargement du carnet :", e);
    chants = [];
  }

  handleRiteToggle();
  renderHeader();
  renderSuggestions();
}

/********************
 * RITE EXTRAORDINAIRE
 ********************/
function handleRiteToggle() {
  if (document.getElementById("riteSelect").value === "extraordinaire") {
    document.body.classList.add("extra");
  } else {
    document.body.classList.remove("extra");
  }
}

/********************
 * EN-TÊTE
 ********************/
function renderHeader() {
  const d = document.getElementById("dateInput").valueAsDate || new Date();
  const rite = document.getElementById("riteSelect").value === "extraordinaire"
    ? "Rite extraordinaire"
    : "Rite ordinaire";

  document.getElementById("sheetDate").textContent = d.toLocaleDateString("fr-FR");
  document.getElementById("sheetRite").textContent = rite;

  const { name, className, title } = detectSeasonRough(d);
  const pill = document.getElementById("sheetSeason");
  pill.textContent = name;
  pill.className = "season-pill " + className;
  document.querySelector(".mass-title").textContent = title;
}

/********************
 * SAISON LITURGIQUE (placeholder)
 ********************/
function detectSeasonRough(d) {
  const m = d.getMonth() + 1;
  if (m === 12 || m === 1)
    return { name: "Avent", className: "season-avent", title: "Dimanche de l’Avent" };
  if (m === 3)
    return { name: "Carême", className: "season-careme", title: "Dimanche de Carême" };
  if (m === 4)
    return { name: "Temps pascal", className: "season-solennite", title: "Dimanche de Pâques" };
  return { name: "Temps ordinaire", className: "season-ordinaire", title: "Feuille de Messe" };
}

/********************
 * SUGGESTIONS
 ********************/
function renderSuggestions() {
  const cats = ["entree", "offertoire", "communion", "envoi", "antienne_mariale"];
  const riteWanted = document.getElementById("riteSelect").value;

  cats.forEach(cat => {
    const cont = document.getElementById("cards-" + cat);
    cont.innerHTML = "";

    let pool = chants.filter(c => c.categorie === cat);
    pool = pool.filter(c => !Array.isArray(c.rite) || c.rite.includes(riteWanted));

    if (!pool.length) {
      const msg = document.createElement("div");
      msg.textContent = "Aucune suggestion disponible.";
      msg.style.color = "#777";
      cont.appendChild(msg);
      return;
    }

    const shuffled = shuffle(pool).slice(0, 3);
    shuffled.forEach(ch => cont.appendChild(cardSuggestion(ch, cat)));
  });
}

/********************
 * CARTE DE SUGGESTION
 ********************/
function cardSuggestion(ch, cat) {
  const c = document.createElement("div");
  c.className = "card";
  c.innerHTML = `
    <h3>${ch.titre || "Sans titre"}</h3>
    <div class="excerpt">${(ch.texte || "").split("\n").slice(0,3).join(" ")}</div>
