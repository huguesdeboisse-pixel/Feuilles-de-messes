#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fusion_carnets.py
Agrège tous les fichiers JSON de /carnets (sauf all.json) en un seul: /carnets/all.json

- Chaque fichier est supposé contenir un tableau de chants [{...}, {...}, ...].
- Ajoute "source_carnet" (nom de fichier source sans extension).
- Déduplique par titre normalisé (sans accents, en minuscules). Le premier rencontré gagne.
- Trie par titre avant écriture.
- N'écrit all.json que s'il y a un changement effectif (pour éviter des commits inutiles).
"""

import json, os, re, unicodedata, hashlib
from pathlib import Path
from typing import Dict, Any, List

ROOT = Path(__file__).resolve().parent
CARNETS_DIR = ROOT / "carnets"
ALL_PATH = CARNETS_DIR / "all.json"

def normalize_title(s: str) -> str:
    s = "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))
    s = s.casefold().strip()
    s = re.sub(r"\s+", " ", s)
    return s

def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)

def dump_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".json.tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    # Remplacement atomique
    tmp.replace(path)

def file_hash(path: Path) -> str:
    if not path.exists():
        return ""
    h = hashlib.sha256()
    with path.open("rb") as f:
        while True:
            chunk = f.read(8192)
            if not chunk: break
            h.update(chunk)
    return h.hexdigest()

def main() -> int:
    if not CARNETS_DIR.exists():
        print("Dossier 'carnets' introuvable.")
        return 1

    sources: List[Path] = []
    for p in sorted(CARNETS_DIR.glob("*.json")):
        if p.name.lower() == "all.json":
            continue
        sources.append(p)

    if not sources:
        print("Aucun fichier JSON source dans 'carnets/'.")
        # On peut quand même créer un all.json vide si souhaité
        dump_json(ALL_PATH, [])
        return 0

    # Agrégation + dédup
    seen: Dict[str, dict] = {}
    aggregated: List[Dict[str, Any]] = []

    for src in sources:
        base = src.stem  # nom sans .json
        data = load_json(src)
        if not isinstance(data, list):
            print(f"Ignoré (pas un tableau): {src}")
            continue
        for chant in data:
            if not isinstance(chant, dict):
                continue
            titre = str(chant.get("titre", "")).strip()
            if not titre:
                continue
            key = normalize_title(titre)
            if key in seen:
                # doublon → on ignore ce chant (le premier conserve la priorité)
                continue
            # enrichir
            c = dict(chant)  # copie
            c.setdefault("source_carnet", base)
            aggregated.append(c)
            seen[key] = c

    # Tri par titre
    aggregated.sort(key=lambda c: normalize_title(str(c.get("titre", ""))))

    # Écriture si contenu différent
    before = file_hash(ALL_PATH)
    dump_json(ALL_PATH, aggregated)
    after = file_hash(ALL_PATH)

    if before != after:
        print(f"Mise à jour de {ALL_PATH.name} ({len(aggregated)} chants).")
    else:
        print("Aucun changement dans all.json.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
