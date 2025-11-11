// === PARAMÈTRES GÉNÉRAUX ===
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


// === CHARGEMENT INITIAL ===
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


// === COULEURS LITURGIQUES SIMPLIFIÉES ===
function definirCouleurLiturgique() {
  const date = dateInput.value;
  if (!date) return;
  const mois = date.split("-")[1];
  let couleur = "vert", texte = "Temps ordinaire";

  if (["12", "01"].includes(mois)) { couleur = "violet"; texte = "Avent"; }
  else if (["02", "03"].includes(mois)) { couleur = "violet"; texte = "Carême"; }
  else if (["04", "05"].includes(mois)) { couleur = "or"; texte = "Temps pascal"; }
  else if (["06"].includes(mois)) { couleur = "rouge"; texte = "Pentecôte"; }

  document.body.setAttribute("data-couleur", couleur);
  sheetSeason.textContent = texte;
  sheetSeason.style.backgroundColor = getCouleurHex(couleur);
}

function getCouleurHex(c) {
  switch (c) {
    ca
