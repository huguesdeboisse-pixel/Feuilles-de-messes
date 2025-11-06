// --- Configuration carnets disponibles (adaptez les noms si besoin)
const CARNETS = [
  { value: "all", label: "Tous les carnets", file: "carnets/all.json" },
  { value: "maquette", label: "Maquette 2017", file: "carnets/maquette_carnet_de_chants_final_2017.json" },
  { value: "saint_pothin", label: "Saint-Pothin", file: "carnets/saint_pothin.json" },
  { value: "cap_mission", label: "CAP Mission", file: "carnets/carnet_de_chants_cap_mission.json" },
];

// --- État global simple
let chants = [];              // chants chargés du carnet choisi
let currentCarnetValue = "all";
let randomSeeds = {           // pour changer les suggestions
  entree: 0, offertoire: 0, communion: 0, envoi: 0, antienne_mariale: 0
};

// --- DOM refs
const dateInput   = document.getElementById("dateInput");
const riteSelect  = document.getElementById("riteSelect");
const carnetSelect= document.getElementById("carnetSelect");
const filterBySeason = document.getElementById("filterBySeason");

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

// --- Initialisation
init();

async function init(){
  // Date par défaut = aujourd’hui
  dateInput.valueAsDate = new Date();

  // Alimente le select des carnets
  CARNETS.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.value;
    opt.textContent = c.label;
    carnetSelect.appendChild(opt);
  });

  // Écouteurs
  carnetSelect.addEventListener("change", handleReload);
  riteSelect.addEventListener("change", handleRiteToggle);
  dateInput.addEventListener("change", renderHeader);
  filterBySeason.addEventListener("change", handleReload);
  document.querySelectorAll(".btn-ghost.other").forEach(btn => {
    btn.addEventListener("click", () => {
      const cat = btn.dataset.cat;
      randomSeeds[cat] = Math.floor(Math.random()*1e9);
      renderSuggestions();
    });
  });

  // Premier chargement
  await handleReload();
}

// --- Chargement du carnet choisi
async function handleReload(){
  currentCarnetValue = carnetSelect.value || "all";
  const meta = CARNETS.find(c => c.value === currentCarnetValue) || CARNETS[0];

  try{
    const res = await fetch(meta.file + "?v=" + Date.now()); // anti-cache
    chants = await res.json();
  }catch(e){
    console.error("Erreur de chargement du carnet:", e);
    chants = [];
  }

  // Rituel : afficher ou non antienne mariale
  handleRiteToggle();

  // Mettre à jour en-tête et suggestions
  renderHeader();
  renderSuggestions();

  // Vider la feuille A4
  Object.values(printIds).forEach(id => document.getElementById(id).innerHTML = "");
}

// --- Rite toggle (montre la section antienne mariale si RE)
function handleRiteToggle(){
  const body = document.body;
  if(riteSelect.value === "extraordinaire") body.classList.add("extra");
  else body.classList.remove("extra");
}

// --- Header : date / saison / rite
function renderHeader(){
  const d = dateInput.value ? new Date(dateInput.value) : new Date();
  document.getElementById("sheetDate").textContent = d.toLocaleDateString("fr-FR");

  const rite = riteSelect.value === "extraordinaire" ? "Rite extraordinaire" : "Rite ordinaire";
  document.getElementById("sheetRite").textContent = rite;

  // Détection ultra-simple (placeholder) : vous brancherez votre vrai calcul plus tard
  const {name, className} = detectSeasonRough(d);
  const pill = document.getElementById("sheetSeason");
  pill.textContent = name;
  pill.className = "season-pill " + className;
}

// Très simple : par défaut Temps ordinaire. (À remplacer par votre vrai calcul)
function detectSeasonRough(date){
  // Placeholder : vert par défaut
  return { name: "Temps ordinaire", className: "season-ordinaire" };
}

// --- Suggestions (3 par catégorie)
function renderSuggestions(){
  const filterSeason = filterBySeason.checked;
  const riteWanted = riteSelect.value; // 'ordinaire' | 'extraordinaire'

  const categories = Object.keys(outIds);
  categories.forEach(cat => {
    const container = document.getElementById(outIds[cat]);
    container.innerHTML = "";

    let pool = chants.filter(c => (c.categorie === cat));

    // Filtre rite (si le chant n'a pas d'info rite, on l'autorise)
    pool = pool.filter(c => !Array.isArray(c.rite) || c.rite.length === 0 || c.rite.includes(riteWanted));

    // Filtre par saison si demandé : on prend une heuristique très permissive
    if(filterSeason){
      // sans vrai calcul de la saison du jour, on ne filtre pas agressivement
      // (vous brancherez votre détecteur liturgique ici)
      // pool = pool.filter(c => c.temps && c.temps.includes("Temps ordinaire"));
    }

    // Mélange déterministe selon la graine pour “Autre suggestion”
    const seed = randomSeeds[cat] || 0;
    const mixed = shuffleDeterministic(pool, seed).slice(0, 3);

    mixed.forEach(ch => {
      container.appendChild(cardSuggestion(ch, cat));
    });
  });
}

// Carte suggestion
function cardSuggestion(ch, cat){
  const card = document.createElement("div");
  card.className = "card";

  const h3 = document.createElement("h3");
  h3.textContent = ch.titre || "Titre inconnu";
  card.appendChild(h3);

  const excerpt = document.createElement("div");
  excerpt.className = "excerpt";
  excerpt.textContent = (ch.texte || "").split("\n").slice(0,3).join(" ");
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
    randomSeeds[cat] = Math.floor(Math.random()*1e9);
    renderSuggestions();
  });
  row.appendChild(more);

  card.appendChild(row);
  return card;
}

// Placement sur la feuille A4 (texte intégral + renvoi de page si carnet précis)
function placeOnSheet(ch, cat){
  const host = document.getElementById(printIds[cat]);
  host.innerHTML = ""; // on remplace l'existant

  const title = document.createElement("h3");
  title.textContent = headingFor(cat) + " — " + (ch.titre || "Sans titre");
  host.appendChild(title);

  // Renvoi de page uniquement si carnet ≠ "all" ET info disponible
  if(currentCarnetValue !== "all" && (ch.source_pages || ch.source_pdf)){
    const ref = document.createElement("div");
    ref.className = "ref";
    let refText = "";
    if(ch.source_pages && Array.isArray(ch.source_pages) && ch.source_pages.length){
      refText = `p. ${ch.source_pages[0]}`;
    }
    if(ch.source_pdf){
      const pdfName = (ch.source_pdf.split(/[\\/]/).pop() || "").replace(/\.\w+$/,"");
      refText = (refText ? refText + " • " : "") + pdfName;
    }
    if(refText){
      ref.textContent = refText;
      host.appendChild(ref);
    }
  }

  const lyrics = document.createElement("div");
  lyrics.className = "lyrics";
  lyrics.textContent = ch.texte || "";
  host.appendChild(lyrics);
}

function headingFor(cat){
  switch(cat){
    case "entree": return "Chant d’entrée";
    case "offertoire": return "Chant d’offertoire";
    case "communion": return "Chant de communion";
    case "envoi": return "Chant d’envoi";
    case "antienne_mariale": return "Antienne mariale";
    default: return "Chant";
  }
}

// Mélange déterministe simple (Fisher–Yates avec seed)
function shuffleDeterministic(arr, seed=0){
  const a = arr.slice();
  let s = seed;
  function rnd(){
    // LCG trivial
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  }
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(rnd() * (i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
