"use strict";
/* Battle tools page: hand calculator (port of the Stormbound project's /tools page) + "create a deck from the played cards". */
const HKEY = "sb-hand-v1";
let BUNDLED = null;
let T = { turns: [{ cards: [], done: false }], off: [], cycle: "first", game: uid() };  // game: one id a game, so saving its fragment again updates it
let H = { last: null, seq: 0, openDeck: null, tab: "in" };
try {
  const j = JSON.parse(localStorage.getItem(HKEY) || "null");
  if (j && Array.isArray(j.turns) && j.turns.length) T = { turns: j.turns, off: j.off || [], cycle: j.cycle || "first", game: j.game || uid() };
} catch (e) {}
const hsave = () => { try { localStorage.setItem(HKEY, JSON.stringify(T)); } catch (e) {} };
const pct = (x, d = 0) => (100 * x).toFixed(d) + "%";
const confirmedTurns = () => { const out = []; for (const t of T.turns) { if (!t.done) break; out.push(t.cards); } return out; };
const playedCards = () => [...new Set(T.turns.flatMap(t => t.cards))].filter(id => BYID[id]);
const facName = f => FACTIONS[f] || "Neutral";

async function loadBundled() {
  if (BUNDLED) return;
  try { BUNDLED = await (await fetch("decks-bundled.json")).json(); } catch (e) { BUNDLED = {}; }
}
/** name -> {title, faction, archetype, cards (card names)}: the bundled decks plus your own saved 12-card decks. */
function candidatePool() {
  const out = {};
  for (const [k, d] of Object.entries(BUNDLED || {})) out[k] = d;
  for (const d of state.decks) if (d.saved !== false && d.cards.length === DECK_SIZE)
    out["u:" + d.id] = { title: "★ " + (d.name || "Untitled"), faction: d.faction, archetype: d.archetype || "—", cards: d.cards.map(i => BYID[i].name) };
  return out;
}
const nameOf = id => BYID[id].name;
const poolInfo = () => { const mine = state.decks.filter(d => d.saved !== false);
  const ok = mine.filter(d => d.cards.length === DECK_SIZE).length, bundled = Object.keys(BUNDLED || {}).length;
  return `Candidates: ${bundled} project decks + ${ok} of your ${mine.length} saved deck${mine.length === 1 ? "" : "s"}` +
    (mine.length > ok ? ` (${mine.length - ok} skipped: fewer than ${DECK_SIZE} cards, they would skew the odds)` : "") + ".";
};

function renderTools() {
  loadBundled().then(() => { if (location.hash === "#/tools") { drawInput(); recalc(); } });
  $("#app").innerHTML = `
    <div class="bar"><button class="ghost" id="back">‹ Decks</button><h1>Hand calculator</h1>
      <div class="tabs"><button id="hin">Cards</button><button id="hout">Result</button></div></div>
    <div class="tools ${H.tab === "out" ? "showres" : ""}"><div class="tcol" id="tin"></div><div class="tcol" id="tout"></div></div>
    <div class="bottom"><div class="handbar" id="handbar" hidden></div><div class="deckbar" id="deckbar"></div></div>`;
  $("#back").onclick = () => { location.hash = "#/"; };
  $("#hin").onclick = () => setHTab("in"); $("#hout").onclick = () => setHTab("out");
  setHTab(H.tab); drawInput(); drawResult();
  recalc();
}
function setHTab(t) {
  H.tab = t; $(".tools")?.classList.toggle("showres", t === "out");
  $("#hin")?.classList.toggle("on", t === "in"); $("#hout")?.classList.toggle("on", t === "out");
}

/* ---------- the turns ---------- */
function drawDeckBar() {
  const bar = $("#deckbar"); if (!bar) return;
  const rows = [];
  T.turns.forEach((t, i) => t.cards.forEach(id => { if (BYID[id] && !rows.some(r => r.id === id)) rows.push({ id, turn: i + 1 }); }));
  bar.innerHTML = `<div class="dbh"><b>Deck so far</b> <span class="dim">${rows.length}/${DECK_SIZE} cards seen played</span></div>` +
    (rows.length ? `<div class="dbrow">${rows.map(({ id, turn }) => { const c = BYID[id];
      return `<div class="dbc"><div class="dbi"><img src="${thumb(c)}" alt="" width="256" height="256"><span class="cm">${c.mana}</span><span class="tn">T${turn}</span><span class="cn">${esc(c.name)}</span></div></div>`; }).join("")}</div>`
      : `<div class="dim dbe">No card yet: the cards you add as played appear here.</div>`);
}
function drawInput() {
  drawDeckBar();
  const box = $("#tin"); if (!box) return;
    let h = `<p class="hint left">Add the cards the opponent played each turn, then tap <b>Done</b>. Cards seen played are in its deck for sure.</p><div id="turns">`;
  T.turns.forEach((t, i) => {
    h += `<div class="turn ${t.done ? "done" : ""}"><div class="thead"><b>Turn ${i + 1}</b><div class="tchips">` +
      (t.cards.map((id, k) => `<span class="pick f-${BYID[id].faction}"><span class="m">${BYID[id].mana}</span>${esc(nameOf(id))}${t.done ? "" : `<button data-rm="${i}:${k}" aria-label="remove">✕</button>`}</span>`).join("") ||
        `<span class="dim">${t.done ? "no card seen" : "no card yet"}</span>`) +
      `</div><button class="chip ${t.done ? "" : "on"}" data-done="${i}">${t.done ? "Edit" : "Done"}</button></div>`;
    if (!t.done) h += `<input class="tq" id="tq" type="search" placeholder="Search a card the opponent played…" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"><div id="sugg"></div>`;
    h += `</div>`;
  });
  h += `</div><div class="bar2"><button id="hundo">Undo last turn</button><button id="hnew">New game</button>
    <select id="hcycle"><option value="first">Cycle: before it plays</option><option value="after">Cycle: after it plays</option></select></div>
    <button class="primary wide" id="hmake">Create deck from played cards (${playedCards().length})</button>
    <p class="hint left">${esc(poolInfo())} An opponent with another deck is not found. Fragments saved: ${state.fragments.length}.</p>`;
  box.innerHTML = h;
  $("#hcycle").value = T.cycle;
  $("#hcycle").onchange = e => { T.cycle = e.target.value; hsave(); recalc(); };
  const q = $("#tq");
  if (q) q.addEventListener("input", () => drawSugg(q));
  box.onclick = e => {
    const rm = e.target.closest("[data-rm]"), dn = e.target.closest("[data-done]"), sg = e.target.closest("[data-add]");
    if (rm) { const [i, k] = rm.dataset.rm.split(":").map(Number); T.turns[i].cards.splice(k, 1); hsave(); drawInput(); }
    else if (dn) {
      const i = +dn.dataset.done, t = T.turns[i];
      if (t.done) { t.done = false; T.turns = T.turns.slice(0, i + 1); }
      else { t.done = true; if (i === T.turns.length - 1) T.turns.push({ cards: [], done: false }); }
      hsave(); drawInput(); recalc(); if (!t.done) $("#tq")?.focus();
    } else if (sg) {
      const t = T.turns.find(x => !x.done); t.cards.push(sg.dataset.add); hsave(); drawInput(); $("#tq")?.focus();
    }
  };
  $("#hundo").onclick = () => {
    const done = T.turns.filter(t => t.done); if (!done.length) return;
    T.turns = T.turns.slice(0, done.length - 1); T.turns.push({ cards: [], done: false }); hsave(); drawInput(); recalc();
  };
  $("#hnew").onclick = () => { if (playedCards().length && !confirm("Start a new game? The cards entered are cleared.")) return;
    T.turns = [{ cards: [], done: false }]; T.game = uid(); H.openDeck = null; hsave(); drawInput(); recalc(); };
  $("#hmake").onclick = makeDeckDialog;
}
function drawSugg(q) {
  const t = T.turns.find(x => !x.done), toks = norm(q.value).split(/\s+/).filter(Boolean), sg = $("#sugg");
  if (!toks.length) { sg.innerHTML = ""; return; }
  const list = CARDS.filter(c => !t.cards.includes(c.id) && toks.every(k => norm(c.name + " " + c.units.join(" ")).includes(k)))
    .sort((a, b) => (norm(a.name).startsWith(toks[0]) ? 0 : 1) - (norm(b.name).startsWith(toks[0]) ? 0 : 1) || a.name.localeCompare(b.name)).slice(0, 8);
  sg.innerHTML = list.map(c => `<div class="sg" data-add="${c.id}"><img src="${thumb(c)}" alt="" width="36" height="36"><span class="m">${c.mana}</span><span class="nm">${esc(c.name)}</span><small>${facName(c.faction)}</small></div>`).join("")
    || `<div class="hint">No match</div>`;
}

/* ---------- the answer ---------- */
function recalc() {
  const turns = confirmedTurns(), my = ++H.seq;
  if (!BUNDLED || !turns.some(t => t.length)) { H.last = null; drawResult(); return; }
  $("#tout") && ($("#tout").innerHTML = `<p class="hint">thinking…</p>`);
  setTimeout(() => {
    if (my !== H.seq) return;
    const pool = candidatePool(), decks = {};
    for (const [n, d] of Object.entries(pool)) decks[n] = d.cards;
    const res = HC.analyse(decks, turns.map(t => t.map(nameOf)), { cycleFirst: T.cycle !== "after" });
    res.pool = Object.keys(decks).length; res.poolMeta = pool;
    H.last = res; drawResult();
  }, 30);
}
function probCard(name, p, seen) {
  const c = CARDS.find(x => x.name === name);
  const kind = c.units.length ? c.units.join(", ") : c.type;
  return `<div class="pcard ${seen ? "seen" : ""}"><div class="pimg"><img src="${thumb(c)}" alt="" width="256" height="256"><span class="cm">${c.mana}</span>` +
    (c.str != null ? `<span class="cs">${c.str}</span>` : "") + (c.spd ? `<span class="cv">${c.spd}</span>` : "") +
    `<span class="cn">${esc(name)}<small>${esc(kind)}</small></span></div>
    <div class="pbar"><i style="width:${Math.min(100, p * 100)}%"></i><span>${pct(p)}</span></div></div>`;
}
function drawHandBar() {
  const bar = $("#handbar"); if (!bar) return;
  const r = H.last;
  if (!r || !r.decks || !r.decks.length) { bar.innerHTML = ""; bar.hidden = true; return; }
  bar.hidden = false;
  const seen = new Set(confirmedTurns().flat().map(nameOf));
  const ranked = Object.entries(r.hand).sort((a, b) => b[1] - a[1]);
  const hand = r.best_hand ? r.best_hand.cards.slice().sort((a, b) => (r.hand[b] || 0) - (r.hand[a] || 0)) : ranked.slice(0, HC.HAND_SIZE).map(x => x[0]);
  const others = ranked.filter(([c]) => !hand.includes(c)).slice(0, 6);
  const nT = confirmedTurns().length;
  const odds = `<div class="hbs"><div class="dbh"><b>Which deck?</b> <span class="dim">${r.decks.length} of ${r.pool} candidates fit, after ${nT} turn${nT > 1 ? "s" : ""}</span></div>` +
    r.decks.slice(0, 8).map(d => { const m = r.poolMeta[d.name], open = H.openDeck === d.name;
      return `<div class="drow2 ${open ? "on" : ""}" data-dk="${esc(d.name)}"><div class="nm">${esc(m.title)}<small>${facName(m.faction)} · ${esc(m.archetype)}</small></div><div class="track"><i style="width:${d.p * 100}%"></i></div><div class="v">${pct(d.p)}</div></div>` +
        (open ? `<div class="mini" style="margin:2px 6px 8px">${d.cards.map(c => `<span class="${seen.has(c) ? "seen" : ""}">${esc(c)}<b>${pct(r.hand[c] || 0)}</b></span>`).join("")}</div>` : ""); }).join("") +
    (r.decks.length > 8 ? `<p class="hint left">+ ${r.decks.length - 8} less likely decks</p>` : "") + `</div>`;
  bar.onclick = e => { const d = e.target.closest("[data-dk]"); if (d) { H.openDeck = H.openDeck === d.dataset.dk ? null : d.dataset.dk; drawHandBar(); } };
  bar.innerHTML = odds + `<div class="hbs"><div class="dbh"><b>Most probable hand now</b>${r.best_hand ? ` <span class="dim">exact hand ${pct(r.best_hand.p, 1)}</span>` : ""}</div>
      <div class="hbrow">${hand.map(c => probCard(c, r.hand[c] || 0, seen.has(c))).join("")}</div></div>
    <div class="hbs"><div class="dbh"><b>Other cards it could hold</b></div>
      <div class="hbrow">${others.map(([c, p]) => probCard(c, p, seen.has(c))).join("")}</div></div>`;
}
function drawResult() {
  drawHandBar();
  const box = $("#tout"); if (!box) return;
  const r = H.last, n = confirmedTurns().length;
  if (!r) { box.innerHTML = `<p class="hint">${n ? "No card seen yet: nothing to work from." : "Add the cards of turn 1 and tap Done."}</p>`; return; }
  const seen = new Set(confirmedTurns().flat().map(nameOf));
  if (!r.decks.length) {
    box.innerHTML = `<div class="note"><b>No candidate deck fits.</b> ${r.candidates ? `${r.candidates} deck(s) hold all the cards seen, but none can have produced these plays with a cycle every turn.` : "No candidate deck holds all these cards."} The opponent has a deck this tool does not know, or a card is wrong (use Edit on a turn). Create a deck from the played cards to remember it.</div>`;
    return;
  }
  let h = "";
  h += `<h3>After its next cycle</h3><div class="mini">${Object.entries(r.next).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([c, p]) => `<span class="${seen.has(c) ? "seen" : ""}">${esc(c)}<b>${pct(p)}</b></span>`).join("")}</div>`;
  h += `<h3>Cards seen: in the hand again?</h3><div class="mini">${Object.entries(r.seen).sort((a, b) => b[1].p_hand - a[1].p_hand).map(([c, v]) => `<span class="seen">${esc(c)}<b>${pct(v.p_hand)}</b></span>`).join("")}</div>
    <p class="hint left">Gold: seen played, so in the deck for certain. Assumes the opponent cycles a card every turn; estimated from simulated games, so small percentages move a little between runs.</p>`;
  box.innerHTML = h;
  box.onclick = e => { const d = e.target.closest("[data-dk]"); if (d) { H.openDeck = H.openDeck === d.dataset.dk ? null : d.dataset.dk; drawResult(); } };
}

/* ---------- create a deck from the played cards ---------- */
function makeDeckDialog() {
  const ids = playedCards();
  if (!ids.length) return toast("No card played yet");
  const facs = [...new Set(ids.map(i => BYID[i].faction).filter(f => f !== "neutral"))];
  const top = H.last && H.last.decks && H.last.decks[0];
  const v = { faction: facs.length === 1 ? facs[0] : (top ? H.last.poolMeta[top.name].faction : ""), name: "", archetype: "", type: "" };
  const cut = ids.length > DECK_SIZE;
  const o = openModal(`<div class="modal"><h2>Deck from played cards (${Math.min(ids.length, DECK_SIZE)})</h2>
    <div class="mini" style="margin-bottom:12px">${ids.map(i => `<span class="seen">${esc(nameOf(i))}<b>${BYID[i].mana}</b></span>`).join("")}</div>
    ${facs.length > 1 ? `<p class="hint left">These cards come from more than one faction: check the faction.</p>` : ""}
    ${cut ? `<p class="hint left">More than ${DECK_SIZE} cards: only the first ${DECK_SIZE} are kept.</p>` : ""}
    <div class="field"><label>Faction</label><div class="factions">${Object.entries(FACTIONS).map(([k, n]) => `<button type="button" class="f-${k} ${v.faction === k ? "sel" : ""}" data-f="${k}">${n}</button>`).join("")}</div></div>
    <div class="field"><label>Nickname</label><input id="dn" autocomplete="off" placeholder="e.g. Frost opponent"></div>
    <div class="field"><label>Archetype</label><div id="ca"></div></div>
    <div class="field"><label>Type</label><div id="ct"></div></div>
    <p class="hint left"><b>Create fragment</b> keeps these cards as statistics only (not a deck) and needs just the faction: no nickname, archetype or type. Tap it again in the same game to update the fragment.</p>
    <div class="actions"><button id="cancel">Cancel</button><button id="frag">Create fragment</button><button class="primary" id="ok">Save to my decks</button></div></div>`);
  o.querySelectorAll("[data-f]").forEach(b => b.onclick = () => { v.faction = b.dataset.f; o.querySelectorAll("[data-f]").forEach(x => x.classList.toggle("sel", x === b)); });
  const opts = key => () => { const same = uniq(state.decks.filter(d => d.faction === v.faction).map(d => d[key])); return same.concat(uniq(state.decks.map(d => d[key])).filter(a => !same.includes(a))); };
  combo($("#ca"), { value: "", placeholder: "Pick or create archetype…", onChange: x => v.archetype = x, options: opts("archetype") });
  combo($("#ct"), { value: "", placeholder: "Pick or create type…", onChange: x => v.type = x, options: opts("type") });
  $("#cancel").onclick = closeModal;
  $("#frag").onclick = () => {
    if (facs.length > 1) return toast("These cards come from more than one faction: a fragment holds one");
    if (!v.faction) return toast("Pick a faction");
    if (facs.length === 1 && facs[0] !== v.faction) return toast(`These cards are ${FACTIONS[facs[0]]}, not ${FACTIONS[v.faction]}`);
    const lastWithCards = T.turns.reduce((m, t, i) => t.cards.length ? i + 1 : m, 0);
    const rec = { id: uid(), game: T.game, cards: ids.slice(0, DECK_SIZE), faction: v.faction, date: new Date().toISOString().slice(0, 10),
      turns: Math.max(T.turns.filter(t => t.done).length, lastWithCards), updated: Date.now() };
    const at = state.fragments.findIndex(f => f.game === T.game);
    if (at >= 0) { rec.id = state.fragments[at].id; rec.date = state.fragments[at].date; state.fragments[at] = rec; } else state.fragments.push(rec);
    save(); closeModal(); drawInput();
    toast(`${at >= 0 ? "Fragment updated" : "Fragment saved"}: ${rec.cards.length} card${rec.cards.length === 1 ? "" : "s"}, ${FACTIONS[v.faction]} (${state.fragments.length} in all)`);
  };
  $("#ok").onclick = () => {
    v.name = $("#dn").value.trim();
    if (!v.faction) return toast("Pick a faction");
    if (!v.name) { $("#dn").focus(); return toast("Give the deck a nickname"); }
    state.decks.push({ id: uid(), name: v.name, faction: v.faction, archetype: v.archetype.trim(), type: v.type.trim(),
      cards: ids.slice(0, DECK_SIZE), saved: true, updated: Date.now() });
    save(); closeModal(); drawInput(); toast(`Saved “${v.name}” to your decks`);
  };
}
