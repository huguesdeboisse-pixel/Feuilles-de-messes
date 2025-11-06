/********************
 * CONFIGURATION
 ********************/
const CARNETS = [
  { value: "all", label: "Tous les carnets", file: "carnets/all.json" },
  { value: "maquette", label: "Maquette 2017", file: "carnets/maquette_carnet_de_chants_final_2017.json" },
  { value: "saint_pothin", label: "Saint-Pothin", file: "carnets/saint_pothin.json" },
  { value: "cap_mission", label: "CAP Mission", file: "carnets/carnet_de_chants_cap_mission.json" },
];

/********************
 * VARIABLES GLOBALES
 ********************/
let chants = [];
let currentCarnetValue = "all";
let randomSeeds = {
  entree: 0, offertoire: 0, communion: 0, envoi: 0, antienne_mariale: 0
};

const outIds = {
  entree: "cards-entree",
  offertoire: "cards-offertoire",
  communion: "cards-communion",
  envoi: "cards-envoi",
  antienne_mariale: "cards-antienne_mariale",
};

const printIds = {
  entree: "out-entree",
  offertoire: "out-offertoire",
  communion: "out-communion",
  envoi: "out-envoi",
  antienne_mariale: "out-antienne_mariale",
};

/********************
 * INITIALISATION
 ********************/
init();

async function init() {
  // Alimente la liste des carnets
  const carnetSelect = document.getElementById("carnetSelect");
  CARNETS.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.value;
    opt.textContent = c.label;
    carnetSelect.appendChild(opt);
  });

  // Date du jour par défaut
  document.getElementById("dateInput").valueAsDate = new Date();

  // Écouteurs de paramètres (mise à jour automatique)
  document.querySelectorAll("#dateInput, #riteSelect, #carnetSelect, #filterBySeason")
    .forEach(el => el.addEventListener("input", handleParameterChange));

  // Boutons "Autre suggestion"
  document.querySelectorAll(".btn-ghost.other").forEach(btn => {
    btn.addEventListener("click", () => {
      const cat = btn.dataset.cat;
      randomSeeds[cat] = Math.floor(Math.random() * 1e9);
      renderSuggestions();
    });
  });

  // Initialisation interface redimensionnable
  initResizableSidebar();

  // Premier chargement
  await handleReload();
}

/********************
 * MISE À JOUR AUTOMATIQUE
 ********************/
async function handleParameterChange(event) {
  const id = event.target.id;
  if (id === "carnetSelect") {
    await handleReload(); // recharger le carnet complet
  } else {
    // Réactualisation instantanée sans recharger le JSON
    renderHeader();
    renderSuggestions();
  }
}

/********************
 * CHARGEMENT DES CARNETS
 ********************/
async function handleReload() {
  currentCarnetValue = document.getElementById("carnetSelect").value || "all";
  const meta = CARNETS.find(c => c.value === currentCarnetValue) || CARNETS[0];

  try {
    const res = await fetch(meta.file + "?v=" + Date.now());
    chants = await res.json();
    console.info(`✅ ${chants.length} chants chargés depuis ${meta.label}`);
  } catch (e) {
    console.error("❌ Erreur de chargement du carnet :", e);
    chants = [];
  }

  handleRiteToggle();
  renderHeader();
  renderSuggestions();
  Object.values(printIds).forEach(id => document.getElementById(id).innerHTML = "");
}

/********************
 * RITE EXTRA / ORDINAIRE
 ********************/
function handleRiteToggle() {
  const body = document.body;
  if (document.getElementById("riteSelect").value === "extraordinaire")
    body.classList.add("extra");
  else
    body.classList.remove("extra");
}

/********************
 * ENTÊTE DYNAMIQUE
 ********************/
function renderHeader() {
  const dateInput = document.getElementById("dateInput");
  const riteSelect = document.getElementById("riteSelect");

  const d = dateInput.value ? new Date(dateInput.value) : new Date();
  document.getElementById("sheetDate").textContent = d.toLocaleDateString("fr-FR");

  const rite = riteSelect.value === "extraordinaire" ? "Rite extraordinaire" : "Rite ordinaire";
  document.getElementById("sheetRite").textContent = rite;

  const { name, className, title, saint } = detectSeasonRough(d);
  const pill = document.getElementById("sheetSeason");
  pill.textContent = name;
  pill.className = "season-pill " + className;

  // Nouveau : titre liturgique + sous-titre préparé pour sanctoral
  const h1 = document.querySelector(".mass-title");
  h1.textContent = title;
  const subtitle = `${d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} — ${saint}`;
  document.querySelector(".date-line").title = subtitle; // info-bulle
}

/********************
 * DÉTECTION LITURGIQUE (placeholder)
 ********************/
function detectSeasonRough(date) {
  // Simplifié en attendant le sanctoral complet
  const month = date.getMonth() + 1;
  let name = "Temps ordinaire", className = "season-ordinaire";
  let title = "Feuille de Messe", saint = "Saint du jour à venir";

  if (month === 12 || month <= 1) { name = "Avent"; className = "season-avent"; }
  if (month === 3) { name = "Carême"; className = "season-careme"; }
  if (month === 4) { name = "Temps pascal"; className = "season-solennite"; title = "Dimanche de Pâques"; }
  return { name, className, title, saint };
}

/********************
 * GÉNÉRATION DES SUGGESTIONS
 ********************/
function renderSuggestions() {
  const filterSeason = document.getElementById("filterBySeason").checked;
  const riteWanted = document.getElementById("riteSelect").value;

  const categories = Object.keys(outIds);
  categories.forEach(cat => {
    const container = document.getElementById(outIds[cat]);
    container.innerHTML = "";

    if (!chants.length) {
      const info = document.createElement("div");
      info.textContent = "Aucun chant trouvé.";
      info.style.color = "#777";
      info.style.fontSize = "13px";
      container.appendChild(info);
      return;
    }

    let pool = chants.filter(c => c.categorie === cat);
    pool = pool.filter(c => !Array.isArray(c.rite) || c.rite.includes(riteWanted));

    if (filterSeason && pool.length) {
      // plus tard : filtrage fin par saison
    }

    const seed = randomSeeds[cat] || 0;
    const mixed = shuffleDeterministic(pool, seed).slice(0, 3);

    if (!mixed.length) {
      const info = document.createElement("div");
      info.textContent = "Aucune suggestion disponible.";
      info.style.color = "#999";
      container.appendChild(info);
      return;
    }

    mixed.forEach(ch => container.appendChild(cardSuggestion(ch, cat)));
  });
}

/********************
 * CONSTRUCTION D’UNE CARTE DE SUGGESTION
 ********************/
function cardSuggestion(ch, cat) {
  const card = document.createElement("div");
  card.className = "card";

  const h3 = document.createElement("h3");
  h3.textContent = ch.titre || "Titre inconnu";
  card.appendChild(h3);

  const excerpt = document.createElement("div");
  excerpt.className = "excerpt";
  excerpt.textContent = (ch.texte || "").split("\n").slice(0, 3).join(" ");
  card.appendChild(excerpt);

  const row = document.createElement("div");
  row.className = "cta-row";

  const choose = document.createElement("button");
  choose.className = "btn";
  choose.textContent = "Choisir ce chant";
  choose.addEventListener("click", () => placeOnSheet(ch, cat));
  row.appendChild(choose);

  const more = document.createElement("button");
  more.className = "btn secondary";
  more.textContent = "Autre suggestion";
  more.addEventListener("click", () => {
    randomSeeds[cat] = Math.floor(Math.random() * 1e9);
    renderSuggestions();
  });
  row.appendChild(more);

  card.appendChild(row);
  return card;
}

/********************
 * INSERTION SUR LA FEUILLE A4
 ********************/
function placeOnSheet(ch, cat) {
  const host = document.getElementById(printIds[cat]);
  host.innerHTML = "";

  const title = document.createElement("h3");
  title.textContent = headingFor(cat) + " — " + (ch.titre || "Sans titre");
  host.appendChild(title);

  if (currentCarnetValue !== "all" && (ch.source_pages || ch.source_pdf)) {
    const ref = document.createElement("div");
    ref.className = "ref";
    let refText = "";
    if (ch.source_pages && ch.source_pages.length)
      refText = `p. ${ch.source_pages[0]}`;
    if (ch.source_pdf) {
      const pdfName = ch.source_pdf.split(/[\\/]/).pop().replace(/\.\w+$/, "");
      refText = (refText ? refText + " • " : "") + pdfName;
    }
    if (refText) { ref.textContent = refText; host.appendChild(ref); }
  }

  const lyrics = document.createElement("div");
  lyrics.className = "lyrics";
  lyrics.textContent = ch.texte || "";
  host.appendChild(lyrics);
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

/********************
 * UTILITAIRES
 ********************/
function shuffleDeterministic(arr, seed = 0) {
  const a = arr.slice();
  let s = seed;
  function rnd() {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  }
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}


