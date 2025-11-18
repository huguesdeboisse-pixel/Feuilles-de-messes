let temporal = null;
let sanctoral = null;

async function loadJSON(path) {
    const r = await fetch(path);
    if (!r.ok) throw new Error("Impossible de charger : " + path);
    return r.json();
}

async function ensureLoaded() {
    if (!temporal) {
        temporal = await loadJSON("/Feuilles-de-messes/src/data/liturgie/temporal.json?v=2001");
    }
    if (!sanctoral) {
        sanctoral = await loadJSON("/Feuilles-de-messes/src/data/liturgie/sanctoral.json?v=2001");
    }
}

export async function computeLiturgicalDay(dateStr, rite) {
    await ensureLoaded();
    
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();

    // --- SANCTORAL FIXE ---
    const sanctoralMatch = sanctoral.find(
        f => f.month === month && f.day === day
    );

    return {
        primary: sanctoralMatch || null,
        commemorations: []
    };
}
