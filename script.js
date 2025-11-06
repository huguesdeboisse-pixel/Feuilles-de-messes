/********************
 * CONFIGURATION
 ********************/
const CARNETS = [
  { value: "all", label: "Tous les carnets", file: "carnets/all.json" },
  { value: "maquette", label: "Maquette 2017", file: "carnets/Maquette-carnet-de-chants-final-2017.json" },
  { value: "saint_pothin", label: "Saint-Pothin", file: "carnets/Saint-Pothin.json" },
  { value: "cap_mission", label: "CAP Mission", file: "carnets/CARNET-DE-CHANTS-CAP-MISSION.json" },
];

/********************
 * VARIABLES GLOBALES
 ********************/
let chants = [];
let currentCarnetValue = "all";
let randomSeeds = {
  entree: 0, offertoire: 0, communion: 0, envoi: 0, antienne_mariale: 0
};

/********************
 * INITIALISATION
 ********************/
init();

async function init() {
  const carnetSelect = document.getElementById("carnetSelect");

  // Liste déroulante
  CARNETS.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.value;
    opt.textContent = c.label;
    carnetSelect.appendChild(opt);
  });

  // Date par défaut
  document.getElementById("dateInput").valueAsDate = new Date();

  // Événements : mise à jour instantanée
  document.querySelectorAll("#dateInput, #riteSelect, #carnetSelect, #filterBySeason")
    .forEach(el => el.addEventListener("input", handleParameterChange));

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
  if (e.target.id === "carnetSelect") await handleReload();
  renderHeader();
  renderSuggestions();
}

/********************
 * CHARGEMENT DU CARNET
 ********************/
async function handleReload() {
  currentCarnetValue = document.getElementById("carnetSelect").value || "all";
  const meta = CARNETS.find(c => c.value === currentCarnetValue);

  try {
    const res = await fetch(meta.file + "?v=" + Date.now());
    chants = await res.json();
    console.info(`✅ ${chants.length} chants chargés (${meta.label})`);
  } catch (e) {
    console.error("❌ Erreur de chargement :", e);
    chants = [];
  }

  handleRiteToggle();
  renderHeader();
  renderSuggestions();
}

/********************
 * RITE EXTRA
 ********************/
function handleRiteToggle() {
  if (document.getElementById("riteSelect").value === "extraordinaire")
    document.body.classList.add("extra");
  else
    document.body.classList.remove("extra");
}

/********************
 * ENTÊTE
 ********************/
function renderHeader() {
  const d = document.getElementById("dateInput").valueAsDate;
  const { name, className, title, saint } = detectSeasonRough(d);
  const pill = document.getElementById("sheetSeason");
  pill.textContent = name;
  pill.className = "season-pill " + className;
  document.querySelector(".mass-title").textContent = title;
}

/********************
 * DÉTERMINATION SAISON (placeholder)
 ********************/
function detectSeasonRough(d) {
  const m = d.getMonth() + 1;
  if (m === 12 || m === 1) return { name: "Avent", className: "season-avent", title: "Dimanche de l’Avent", saint: "—" };
  if (m === 3) return { name: "Carême", className: "season-careme", title: "Dimanche de Carême", saint: "—" };
  if (m === 4) return { name: "Temps pascal", className: "season-solennite", title: "Dimanche de Pâques", saint: "—" };
  return { name: "Temps ordinaire", className: "season-ordinaire", title: "Feuille de Messe", saint: "—" };
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
    <div class="cta-row">
      <button class="btn">Choisir ce chant</button>
      <button class="btn secondary">Autre suggestion</button>
    </div>
  `;
  c.querySelector(".btn").onclick = () => placeOnSheet(ch, cat);
  c.querySelector(".btn.secondary").onclick = () => renderSuggestions();
  return c;
}

/********************
 * FEUILLE A4
 ********************/
function placeOnSheet(ch, cat) {
  const target = document.getElementById("out-" + cat);
  target.innerHTML = `
    <h3>${headingFor(cat)} — ${ch.titre || "Sans titre"}</h3>
    ${currentCarnetValue !== "all" && ch.source_pages ? `<div class="ref">p. ${ch.source_pages[0]}</div>` : ""}
    <div class="lyrics">${ch.texte || ""}</div>
  `;
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
function shuffle(arr) {
  return arr.map(a => [Math.random(), a]).sort((a,b)=>a[0]-b[0]).map(a=>a[1]);
}
