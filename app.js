"use strict";
const FACTIONS = {
  winter: "Winter", ironclad: "Ironclad", shadowfen: "Shadowfen", swarm: "Swarm",
};
const DECK_SIZE = 12;
const KEY = "sb-decks-v1";

let CARDS = [], BYID = {};
let state = { decks: [] };
let ui = { search: "", kind: "all", tab: "cards" };

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/* ---------- storage ---------- */
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && Array.isArray(s.decks)) state = s; } catch (e) {}
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { toast("Could not save (storage full or blocked)"); }
}
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 1800);
}

/* ---------- routing ---------- */
function route() {
  if (location.hash === "#/tools") return renderTools();
  const m = location.hash.match(/^#\/deck\/(.+)$/);
  if (m && state.decks.find(d => d.id === m[1])) renderEditor(m[1]); else renderList();
}
window.addEventListener("hashchange", () => { closeModal(); route(); });

/* ---------- modal ---------- */
function openModal(html) { const o = $("#overlay"); o.innerHTML = html; o.hidden = false; return o; }
function closeModal() { const o = $("#overlay"); o.hidden = true; o.innerHTML = ""; }
$("#overlay").addEventListener("pointerdown", e => { if (e.target.id === "overlay") closeModal(); });

/* ---------- deck list ---------- */
function groupDecks() {
  const t = {};
  for (const d of state.decks) {
    const a = (t[d.faction] ??= {}), b = (a[d.archetype || "—"] ??= {}), c = (b[d.type || "—"] ??= []);
    c.push(d);
  }
  return t;
}
const openKeys = new Set(JSON.parse(sessionStorage.getItem("sb-open") || "[]"));
function renderList() {
  const g = groupDecks();
  let h = `<div class="bar"><h1>Stormbound Decks</h1><button id="tools">⚔ Battle tools</button></div><div class="scroll">`;
  if (!state.decks.length) h += `<div class="empty">No decks yet.<br>Tap <b>+ New deck</b> to start.</div>`;
  for (const f of Object.keys(FACTIONS)) {
    if (!g[f]) continue;
    const n = Object.values(g[f]).flatMap(a => Object.values(a)).flat().length;
    h += `<details data-k="${f}" class="f-${f}" ${openKeys.has(f) ? "open" : ""}><summary><span class="dot"></span>${FACTIONS[f]}<span class="cnt">${n}</span></summary>`;
    for (const a of Object.keys(g[f]).sort()) {
      const ka = `${f}/${a}`, na = Object.values(g[f][a]).flat().length;
      h += `<details data-k="${esc(ka)}" ${openKeys.has(ka) ? "open" : ""}><summary>${esc(a)}<span class="cnt">${na}</span></summary>`;
      for (const t of Object.keys(g[f][a]).sort()) {
        const kt = `${ka}/${t}`;
        h += `<details data-k="${esc(kt)}" ${openKeys.has(kt) ? "open" : ""}><summary>${esc(t)}<span class="cnt">${g[f][a][t].length}</span></summary>`;
        for (const d of g[f][a][t].sort((x, y) => y.updated - x.updated)) {
          h += `<div class="deckrow" data-id="${d.id}"><span class="nm">${d.saved === false ? "Unsaved draft" : esc(d.name || "Untitled")}</span>
            <span class="meta ${d.cards.length === DECK_SIZE ? "full" : ""}">${d.cards.length}/${DECK_SIZE}</span></div>`;
        }
        h += `</details>`;
      }
      h += `</details>`;
    }
    h += `</details>`;
  }
  h += `<div class="footer-tools"><button id="expc">Export for PC (decks folder)</button><button id="exp">Export backup</button><button id="imp">Import deck / backup</button></div></div>
    <button class="primary fab" id="new">+ New deck</button>`;
  $("#app").innerHTML = h;
  $("#new").onclick = pickFaction;
  $("#tools").onclick = () => { location.hash = "#/tools"; };
  $("#exp").onclick = exportBackup;
  $("#expc").onclick = () => exportForPc(state.decks.filter(d => d.saved !== false));
  $("#imp").onclick = importBackup;
  $("#app").querySelectorAll("details").forEach(el => el.addEventListener("toggle", () => {
    el.open ? openKeys.add(el.dataset.k) : openKeys.delete(el.dataset.k);
    sessionStorage.setItem("sb-open", JSON.stringify([...openKeys]));
  }));
  $("#app").onclick = e => { const r = e.target.closest(".deckrow"); if (r) location.hash = "#/deck/" + r.dataset.id; };
}

/* ---------- export for the PC: deck files in the convention of the Stormbound project's data/decks ---------- */
const FOLDER = { winter: "winter_pact", swarm: "swarm", ironclad: "ironclad", shadowfen: "shadowfen" };
const slug = s => norm(s).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
function deckToFile(d) {
  const cards = d.cards.map(i => BYID[i].name);
  return { name: slug(d.name) || "deck", nickname: d.name, faction: FOLDER[d.faction], archetype: slug(d.archetype || ""), type: d.type || "",
    v1: cards, card_pool: cards.slice(), source: { site: "ipad deck app", title: d.name, date: new Date().toISOString().slice(0, 10) } };
}
async function exportForPc(decks) {
  if (!decks.length) return toast("No saved decks to export");
  const one = decks.length === 1;
  const data = one ? deckToFile(decks[0]) : { format: "stormbound-ipad-decks", decks: decks.map(deckToFile) };
  const fname = one ? data.name + ".json" : "ipad-decks-" + new Date().toISOString().slice(0, 10) + ".json";
  const file = new File([JSON.stringify(data, null, 2)], fname, { type: "application/json" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: fname }); return; }
  } catch (e) { if (e.name === "AbortError") return; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(file); a.download = fname;
  document.body.appendChild(a); a.click(); a.remove();
  toast(`Saved ${fname}`);
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(state, null, 1)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = "stormbound-decks-" + new Date().toISOString().slice(0, 10) + ".json";
  document.body.appendChild(a); a.click(); a.remove();
}
const FACTION_KEYS = { winter: "winter", winter_pact: "winter", swarm: "swarm", ironclad: "ironclad", shadowfen: "shadowfen" };
const sameCI = (list, v) => list.find(x => norm(x) === norm(v)) || v;
/** A deck file of the Stormbound project (name, v1, v2..., card_pool; made by the web calculator) -> a deck of this app. */
function deckFromFile(s) {
  const vs = Object.keys(s).filter(k => /^v\d+$/.test(k)).sort((a, b) => a.slice(1) - b.slice(1));
  const names = vs.length ? s[vs[vs.length - 1]] : s.cards;
  if (!Array.isArray(names)) return null;
  const byName = Object.fromEntries(CARDS.map(c => [norm(c.name), c.id]));
  const ids = [...new Set(names.map(n => byName[norm(n)]).filter(Boolean))].slice(0, DECK_SIZE);
  if (!ids.length) return null;
  let faction = FACTION_KEYS[norm(String(s.faction || "")).replace(/ /g, "_")];
  if (!faction) {
    const cnt = {}; ids.forEach(i => { const f = BYID[i].faction; if (f !== "neutral") cnt[f] = (cnt[f] || 0) + 1; });
    faction = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
  }
  if (!faction) return null;
  const cap = x => x ? x.charAt(0).toUpperCase() + x.slice(1) : "";
  const name = s.nickname || cap(String(s.name || "Imported deck").replace(/_/g, " "));
  return { id: uid(), name, faction, archetype: sameCI(uniq(state.decks.map(d => d.archetype)), cap(String(s.archetype || "").replace(/_/g, " "))),
    type: sameCI(uniq(state.decks.map(d => d.type)), String(s.type || "")), cards: ids, saved: true, updated: Date.now() };
}
function importBackup() {
  const i = document.createElement("input"); i.type = "file"; i.accept = "application/json,.json"; i.multiple = true;
  i.onchange = async () => {
    let n = 0, skipped = 0, bad = 0;
    for (const f of i.files) {
      try {
        const s = JSON.parse(await f.text());
        if (Array.isArray(s.decks)) {  // a backup of this app
          const have = new Set(state.decks.map(d => d.id));
          for (const d of s.decks) if (!have.has(d.id)) { state.decks.push(d); n++; }
        } else {  // a deck file
          const d = deckFromFile(s); if (!d) throw 0;
          const key = x => x.faction + "|" + norm(x.name) + "|" + [...x.cards].sort().join();
          if (state.decks.some(x => key(x) === key(d))) { skipped++; continue; }
          state.decks.push(d); n++;
        }
      } catch (e) { bad++; }
    }
    save(); renderList();
    toast(`Imported ${n} deck${n === 1 ? "" : "s"}` + (skipped ? `, ${skipped} already there` : "") + (bad ? `, ${bad} not valid` : ""));
  };
  i.click();
}

/* ---------- combo box (dropdown of existing + create new) ---------- */
function combo(host, { value, options, placeholder, onChange }) {
  host.classList.add("combo");
  host.innerHTML = `<input autocomplete="off" autocapitalize="words" placeholder="${esc(placeholder)}"><button type="button" class="caret">▾</button><div class="dd" hidden></div>`;
  const input = $("input", host), dd = $(".dd", host);
  input.value = value || "";
  const show = () => {
    const q = norm(input.value.trim()), opts = options();
    const list = opts.filter(o => !q || norm(o).includes(q));
    let h = list.map(o => `<div data-v="${esc(o)}">${esc(o)}</div>`).join("");
    if (q && !opts.some(o => norm(o) === q)) h += `<div class="new" data-v="${esc(input.value.trim())}">＋ Create “${esc(input.value.trim())}”</div>`;
    if (!h) h = `<div class="none">Type a name to create it</div>`;
    dd.innerHTML = h; dd.hidden = false;
  };
  input.addEventListener("focus", show);
  input.addEventListener("input", () => { show(); onChange(input.value.trim()); });
  input.addEventListener("blur", () => setTimeout(() => dd.hidden = true, 120));
  dd.addEventListener("pointerdown", e => {
    const it = e.target.closest("[data-v]"); if (!it) return;
    e.preventDefault(); input.value = it.dataset.v; dd.hidden = true; onChange(input.value); input.blur();
  });
  $(".caret", host).addEventListener("pointerdown", e => {
    e.preventDefault(); if (dd.hidden) { input.focus(); show(); } else { dd.hidden = true; input.blur(); }
  });
  return input;
}
const uniq = a => [...new Set(a.filter(x => x && x !== "—"))].sort((x, y) => x.localeCompare(y));

/* ---------- new deck: faction only ---------- */
function pickFaction() {
  const o = openModal(`<div class="modal"><h2>New deck – choose faction</h2><div class="factions">
    ${Object.entries(FACTIONS).map(([k, n]) => `<button type="button" class="f-${k}" data-f="${k}">${n}</button>`).join("")}</div>
    <div class="actions"><button id="cancel">Cancel</button></div></div>`);
  $("#cancel").onclick = closeModal;
  o.querySelectorAll("[data-f]").forEach(b => b.onclick = () => {
    const d = { id: uid(), name: "", faction: b.dataset.f, archetype: "", type: "", cards: [], saved: false, updated: Date.now() };
    state.decks.push(d); save(); closeModal(); location.hash = "#/deck/" + d.id;
  });
}

/* ---------- save / edit deck details dialog ---------- */
function deckDialog(deck) {
  const isNew = false, draft = deck.saved === false;
  const v = { ...deck };
  const o = openModal(`<div class="modal"><h2>${draft ? "Save deck" : "Deck details"}</h2>
    <div class="field"><label>Faction</label><div class="factions">
      ${Object.entries(FACTIONS).map(([k, n]) => `<button type="button" class="f-${k} ${v.faction === k ? "sel" : ""}" data-f="${k}">${n}</button>`).join("")}
    </div></div>
    <div class="field"><label>Nickname</label><input id="dn" autocomplete="off" placeholder="e.g. Goat spam" value="${esc(v.name)}"></div>
    <div class="field"><label>Archetype</label><div id="ca"></div></div>
    <div class="field"><label>Type</label><div id="ct"></div></div>
    <div class="actions"><button class="danger" id="del" style="margin-right:auto">Delete</button>
      ${draft ? "" : `<button id="expone">Export for PC</button>`}
      <button id="cancel">Cancel</button><button class="primary" id="ok">Save</button></div></div>`);
  o.querySelectorAll("[data-f]").forEach(b => b.onclick = () => {
    v.faction = b.dataset.f;
    o.querySelectorAll("[data-f]").forEach(x => x.classList.toggle("sel", x === b));
  });
  const others = (key, pred) => state.decks.filter(d => d !== deck && pred(d)).map(d => d[key]);
  combo($("#ca"), { value: v.archetype, placeholder: "Pick or create archetype…", onChange: x => v.archetype = x,
    options: () => { const same = uniq(others("archetype", d => d.faction === v.faction)); return same.concat(uniq(others("archetype", () => true)).filter(a => !same.includes(a))); } });
  combo($("#ct"), { value: v.type, placeholder: "Pick or create type…", onChange: x => v.type = x,
    options: () => { const same = uniq(others("type", d => d.faction === v.faction && (d.archetype || "") === (v.archetype || ""))); return same.concat(uniq(others("type", () => true)).filter(a => !same.includes(a))); } });
  $("#cancel").onclick = closeModal;
  if (!draft) $("#expone").onclick = () => exportForPc([deck]);
  $("#del").onclick = () => {
    if (confirm(`Delete “${deck.name || "Untitled"}”?`)) { state.decks = state.decks.filter(d => d !== deck); save(); closeModal(); location.hash = "#/"; renderList(); }
  };
  $("#ok").onclick = () => {
    v.name = $("#dn").value.trim();
    if (!v.faction) return toast("Pick a faction");
    if (!v.name) { $("#dn").focus(); return toast("Give the deck a nickname"); }
    if (isNew) {
      const d = { id: uid(), name: v.name, faction: v.faction, archetype: v.archetype.trim(), type: v.type.trim(), cards: [], updated: Date.now() };
      state.decks.push(d); save(); closeModal(); location.hash = "#/deck/" + d.id;
    } else {
      deck.cards = deck.cards.filter(c => BYID[c].faction === "neutral" || BYID[c].faction === v.faction);
      Object.assign(deck, { name: v.name, faction: v.faction, archetype: v.archetype.trim(), type: v.type.trim() });
      deck.saved = true; deck.updated = Date.now(); save(); closeModal(); renderEditor(deck.id); if (draft) toast("Deck saved");
    }
  };
  if (draft) setTimeout(() => $("#dn").focus(), 50);
}

/* ---------- editor ---------- */
const KINDS = [["all", "All"], ["unit", "Units"], ["spell", "Spells"], ["structure", "Structures"]];
const thumb = c => `img/t/${c.id}.webp`, full = c => `img/f/${c.id}.webp`;

function candidates(deck) {
  const toks = norm(ui.search).split(/\s+/).filter(Boolean);
  const list = CARDS.filter(c => (c.faction === "neutral" || c.faction === deck.faction) &&
    (ui.kind === "all" || c.type === ui.kind) &&
    toks.every(t => c._s.includes(t)));
  const q = norm(ui.search).trim();
  const rank = c => { const n = norm(c.name); return !q ? 0 : n.startsWith(q) ? 0 : n.split(/\s+/).some(w => w.startsWith(q)) ? 1 : n.includes(q) ? 2 : 3; };
  return list.sort((a, b) => rank(a) - rank(b) || a.mana - b.mana || a.name.localeCompare(b.name));
}

function renderEditor(id) {
  const deck = state.decks.find(d => d.id === id);
  const sub = [deck.archetype, deck.type].filter(Boolean).join(" · ");
  $("#app").innerHTML = `
    <div class="bar f-${deck.faction}">
      <button class="ghost" id="back">‹ Decks</button>
      <h1 id="title"><span class="dot"></span>${deck.saved === false ? "New deck" : esc(deck.name)} <span class="sub">${FACTIONS[deck.faction]}${sub ? " · " + esc(sub) : ""} ✎</span></h1>
      <button class="primary" id="savebtn">${deck.saved === false ? "Save" : "Details"}</button>
      <div class="tabs"><button id="tcards">Cards</button><button id="tdeck">Deck <span id="cnt1"></span></button></div>
    </div>
    <div class="editor ${ui.tab === "deck" ? "showdeck" : ""}">
      <div class="picker">
        <div class="searchrow"><input id="q" type="search" enterkeyhint="search" placeholder="Search name, ability, tribe…" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" value="${esc(ui.search)}"></div>
        <div class="chips">${KINDS.map(([k, n]) => `<button class="chip ${ui.kind === k ? "on" : ""}" data-k="${k}">${n}</button>`).join("")}</div>
        <div class="grid" id="grid"></div>
      </div>
      <div class="side"><h3><span>Deck <span id="cnt2"></span></span><span id="avg" style="color:var(--muted);font-weight:400"></span></h3>
        <div class="curve" id="curve"></div><div class="dlist" id="dlist"></div></div>
    </div>`;
  const q = $("#q");
  $("#back").onclick = () => { if (deck.saved === false && !deck.cards.length) { state.decks = state.decks.filter(d => d !== deck); save(); } location.hash = "#/"; };
  $("#savebtn").onclick = () => deckDialog(deck);
  $("#title").onclick = () => deckDialog(deck);
  q.addEventListener("input", () => { ui.search = q.value; drawGrid(deck); });
  $(".chips").onclick = e => { const b = e.target.closest("[data-k]"); if (!b) return; ui.kind = b.dataset.k; $(".chips").querySelectorAll(".chip").forEach(x => x.classList.toggle("on", x === b)); drawGrid(deck); };
  $("#tcards").onclick = () => setTab("cards");
  $("#tdeck").onclick = () => setTab("deck");
  wireGrid(deck, q);
  wireDeckList(deck);
  drawGrid(deck); drawDeck(deck); setTabs();
}
function setTab(t) { ui.tab = t; $(".editor").classList.toggle("showdeck", t === "deck"); setTabs(); }
function setTabs() { $("#tcards")?.classList.toggle("on", ui.tab === "cards"); $("#tdeck")?.classList.toggle("on", ui.tab === "deck"); }

function drawGrid(deck) {
  const list = candidates(deck), have = new Set(deck.cards);
  $("#grid").innerHTML = list.length ? list.map(c =>
    `<div class="card ${have.has(c.id) ? "in" : ""}" data-id="${c.id}"><img width="256" height="256" src="${thumb(c)}" alt="${esc(c.name)}" loading="lazy" decoding="async"><span class="cm">${c.mana}</span><span class="cn">${esc(c.name)}</span><div class="tick">✓</div><button class="zoom" data-z="${c.id}" aria-label="Preview">⤢</button></div>`).join("")
    : `<div class="noresult">No cards match “${esc(ui.search)}”</div>`;
}

function wireGrid(deck, q) {
  const grid = $("#grid"); let timer = null, held = false;
  const cancel = () => clearTimeout(timer);
  grid.addEventListener("pointerdown", e => {
    const el = e.target.closest(".card"); held = false; if (!el || e.target.closest(".zoom")) return;
    timer = setTimeout(() => { held = true; navigator.vibrate?.(10); preview(deck, el.dataset.id); }, 450);
  });
  ["pointerup", "pointercancel", "pointerleave", "scroll"].forEach(ev => grid.addEventListener(ev, cancel, true));
  grid.addEventListener("contextmenu", e => e.preventDefault());
  grid.addEventListener("click", e => {
    const z = e.target.closest(".zoom");
    if (z) return preview(deck, z.dataset.z);
    const el = e.target.closest(".card"); if (!el) return;
    if (held) { held = false; return; }
    toggleCard(deck, el.dataset.id);
    if (ui.search) { ui.search = ""; q.value = ""; drawGrid(deck); q.focus(); }
  });
}
function toggleCard(deck, id) {
  const i = deck.cards.indexOf(id);
  if (i >= 0) deck.cards.splice(i, 1);
  else {
    if (deck.cards.length >= DECK_SIZE) return toast(`Deck is full (${DECK_SIZE} cards)`);
    deck.cards.push(id); navigator.vibrate?.(8);
  }
  deck.updated = Date.now(); save();
  $("#grid")?.querySelectorAll(`.card[data-id="${id}"]`).forEach(el => el.classList.toggle("in", i < 0));
  drawDeck(deck);
}

function drawDeck(deck) {
  const cs = deck.cards.map(i => BYID[i]).sort((a, b) => a.mana - b.mana || a.name.localeCompare(b.name));
  const n = deck.cards.length;
  $("#cnt1").textContent = `${n}/${DECK_SIZE}`; $("#cnt2").textContent = `${n}/${DECK_SIZE}`;
  $("#avg").textContent = n ? `avg ${(cs.reduce((s, c) => s + c.mana, 0) / n).toFixed(1)} mana` : "";
  const buckets = Array(9).fill(0); cs.forEach(c => buckets[Math.min(c.mana, 8)]++);
  const mx = Math.max(1, ...buckets);
  $("#curve").innerHTML = buckets.map((b, i) => `<div style="height:${Math.max(4, b / mx * 100)}%" title="${b}"><span>${i === 8 ? "8+" : i}</span></div>`).join("");
  $("#dlist").innerHTML = cs.length ? cs.map(c =>
    `<div class="drow" data-id="${c.id}"><span class="mana">${c.mana}</span><span class="n">${esc(c.name)}<div class="t">${c.faction === "neutral" ? "Neutral" : FACTIONS[c.faction]} · ${c.type}</div></span><button class="x" data-rm="${c.id}" aria-label="Remove">✕</button></div>`).join("")
    : `<div class="hint">Tap cards to add them.<br>Press and hold a card to preview it.</div>`;
}
function wireDeckList(deck) {
  $("#dlist").addEventListener("click", e => {
    const rm = e.target.closest("[data-rm]");
    if (rm) return toggleCard(deck, rm.dataset.rm);
    const r = e.target.closest(".drow"); if (r) preview(deck, r.dataset.id);
  });
}

function preview(deck, id) {
  const c = BYID[id], inDeck = deck.cards.includes(id);
  const o = openModal(`<div class="preview"><img src="${full(c)}" alt="${esc(c.name)}">
    <div class="txt">${esc(c.name)} · ${c.mana} mana · ${c.rarity}${c.units.length ? " · " + esc(c.units.join(", ")) : ""}</div>
    <div class="pc"><button id="pc">Close</button><button class="primary" id="pa">${inDeck ? "Remove from deck" : "Add to deck"}</button></div></div>`);
  $("#pc", o).onclick = closeModal;
  $("#pa", o).onclick = () => { closeModal(); toggleCard(deck, id); };
}

/* ---------- boot ---------- */
(async function () {
  load();
  CARDS = await (await fetch("cards.json")).json();
  CARDS.forEach(c => { BYID[c.id] = c; c._s = norm([c.name, c.ability, c.units.join(" "), c.type, c.rarity].join(" ")); });
  route();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
