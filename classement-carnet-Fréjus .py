import json
import unicodedata

# --- Fonction utilitaire pour supprimer les accents et mettre en minuscule
def normaliser(texte):
    return ''.join(
        c for c in unicodedata.normalize('NFD', texte.lower())
        if unicodedata.category(c) != 'Mn'
    )

# --- Dictionnaire de mots-clés liturgiques
mots_cles = {
    "Avent": [
        "avent", "messie", "attends", "viens", "emmanuel", "prépare", "préparez",
        "attente", "venez", "veille", "veillez", "attentif"
    ],
    "Noël": [
        "noel", "nativité", "divin enfant", "bethlehem", "berger", "crèche",
        "paix", "nuit", "gloire à dieu", "naissance", "roi des cieux"
    ],
    "Carême": [
        "careme", "quarante", "penitence", "croix", "passion", "desert", "peche",
        "repentir", "pardonne", "jeune", "souffle", "misericorde"
    ],
    "Temps pascal": [
        "paques", "pascal", "resurrection", "alleluia", "lumiere", "vie nouvelle",
        "christ est ressuscite", "tombeau", "victime", "regina caeli"
    ],
    "Temps ordinaire": [
        "amour", "louange", "eglise", "communion", "foi", "esperance", "charite",
        "joie", "dieu", "seigneur", "adorons", "gloire", "chantons"
    ],
    "Fêtes mariales": [
        "marie", "vierge", "immaculee", "reine", "mère", "magnificat", "notre dame",
        "assomption", "rosaire"
    ],
    "Saints et martyrs": [
        "saint", "sainte", "martyr", "martyrs", "confesseur", "apotre", "docteur",
        "pape", "eveque"
    ]
}

# --- Couleurs terminal
COULEURS = {
    "Avent": "\033[95m",            # Violet
    "Noël": "\033[93m",             # Jaune / Or
    "Carême": "\033[94m",           # Bleu-violet
    "Temps pascal": "\033[92m",     # Vert clair
    "Temps ordinaire": "\033[32m",  # Vert
    "Fêtes mariales": "\033[96m",   # Cyan
    "Saints et martyrs": "\033[91m",# Rouge
    "reset": "\033[0m"
}

# --- Lecture du fichier source
with open("diocese-frejus-toulon.json", "r", encoding="utf-8") as f:
    data = json.load(f)

chants = data["chants"]

# --- Initialisation du résultat
classes = {cle: [] for cle in mots_cles.keys()}

# --- Classement des chants
for chant in chants:
    titre = normaliser(chant["titre"])
    trouve = False
    for categorie, mots in mots_cles.items():
        if any(mot in titre for mot in mots):
            classes[categorie].append(chant)
            trouve = True
            break
    if not trouve:
        classes["Temps ordinaire"].append(chant)

# --- Nettoyage des catégories vides
classes = {k: v for k, v in classes.items() if v}

# --- Sauvegarde du fichier final
with open("chants_par_temps.json", "w", encoding="utf-8") as f:
    json.dump(classes, f, ensure_ascii=False, indent=2)

# --- Sortie console colorée
print("\n📖 Récapitulatif du tri liturgique :\n")
for categorie, liste in classes.items():
    couleur = COULEURS.get(categorie, "")
    print(f"{couleur}• {categorie:<18} → {len(liste)} chants{COULEURS['reset']}")
print("\n✅ Fichier 'chants_par_temps.json' créé avec succès !\n")
