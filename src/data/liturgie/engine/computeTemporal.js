// src/data/liturgie/engine/computeTemporal.js

import avent from "@/data/liturgie/temporal/temporal_avent.json";
import noel from "@/data/liturgie/temporal/temporal_noel_epiphanie.json";
import precareme from "@/data/liturgie/temporal/temporal_precareme.json";
import careme from "@/data/liturgie/temporal/temporal_careme.json";
import semaineSainte from "@/data/liturgie/temporal/temporal_semaine_sainte.json";
import paques from "@/data/liturgie/temporal/temporal_paques.json";
import pentecote from "@/data/liturgie/temporal/temporal_pentecote.json";
import postPentecote from "@/data/liturgie/temporal/temporal_post_pentecote.json";

import { computeEasterDate } from "./rules_1962"; // fonction fournie plus bas

/**
 * Retourne l’objet du temporal correspondant à la date
 * @param {Date} dateJS
 * @returns {Object|null}
 */
export function computeTemporal(dateJS) {
  const year = dateJS.getFullYear();
  const easter = computeEasterDate(year);

  // Étapes logiques strictes (1962)
  // 1. De l'Avent à Noël inclus
  const dateStr = dateJS.toISOString().slice(5, 10); // format MM-DD

  // Helper pour chercher dans un JSON
  const find = (collection, predicate) => collection.find(predicate) || null;

  // LOGIQUE LITURGIQUE :
  // (1) Temps de l'Avent et Noël (facile car dates fixes)
  if (dateStr >= "11-27" || dateStr <= "12-31") {
    return find([...avent, ...noel], e => matchTemporal(e, dateJS));
  }

  // (2) Après l'Épiphanie → Pré-Carême
  return (
    find(noel, e => matchTemporal(e, dateJS)) ||
    find(precareme, e => matchTemporal(e, dateJS)) ||
    find(careme, e => matchTemporal(e, dateJS)) ||
    find(semaineSainte, e => matchTemporal(e, dateJS)) ||
    find(paques, e => matchTemporal(e, dateJS)) ||
    find(pentecote, e => matchTemporal(e, dateJS)) ||
    find(postPentecote, e => matchTemporal(e, dateJS)) ||
    null
  );
}

/**
 * Vérifie si une entrée du temporal correspond à une date.
 * Chaque entrée du JSON possède des clés de type:
 *   fixed_date: "MM-DD"
 *   or date_range: { start: "MM-DD", end: "MM-DD" }
 */
function matchTemporal(entry, dateJS) {
  const mmdd = dateJS.toISOString().slice(5, 10);

  if (entry.fixed_date) {
    return entry.fixed_date === mmdd;
  }

  if (entry.date_range) {
    return mmdd >= entry.date_range.start && mmdd <= entry.date_range.end;
  }

  return false;
}
