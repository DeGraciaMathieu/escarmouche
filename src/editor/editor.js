import { cv, ctx, px } from '../canvas.js';
import { BW, BH, DEPLOY_ZONE_ALPHA, DEPLOY_ZONES, EDITOR_GRID, EDITOR_GRID_OPTIONS, EDITOR_MIN_RECT,
  EDITOR_HANDLE, EDITOR_HANDLE_HIT, EDITOR_OBJ_HIT, OBJECTIVES, OBJECTIVE_RADIUS } from '../config.js';
import { state, createModels } from '../state/game.js';
import { mat, drawTerrain, drawObjectives } from '../render/board.js';
import { pointInRect, dist } from '../rules/geometry.js';
import { checkMap } from '../rules/mapcheck.js';
import { placeSpawns } from '../rules/deploy.js';
import { saveCustomMap } from './storage.js';

// Éditeur de map : module consommateur isolé (comme src/ai/). Le cœur l'ignore ; seuls main.js
// (câblage) et input/controls.js (qui bloque la main de jeu pendant l'édition) le connaissent.
// Le brouillon vit dans state (terrain / objectives / deploy), ce qui laisse drawTerrain et
// drawObjectives l'afficher tel quel ; l'éditeur n'ajoute que la grille, la sélection et les zones.
// Trois outils : « terrain » (décor), « objective » (marqueurs) et « deploy » (zones par camp).

// Skins proposés par type de décor (variant cosmétique ; '' = rendu brut selon le type).
const VARIANTS = {
  wall: [['building', 'Bâtiment'], ['ruin', 'Ruine'], ['container', 'Conteneur'], ['tank', 'Cuve'], ['', 'Brut']],
  low: [['barricade', 'Barricade'], ['crates', 'Caisses'], ['', 'Brut']],
};
// Teinte de zone par camp (identique au rendu de jeu).
const ZONE_TINT = { A: '92,127,158', B: '180,85,58' };
// Consigne affichée selon l'outil actif.
const TOOL_HINT = {
  terrain: 'Glisse pour tracer un décor · clique-le pour le sélectionner · Suppr efface.',
  objective: 'Clique pour poser un objectif · glisse-le pour le déplacer · Suppr l’enlève.',
  deploy: 'Glisse une zone pour la déplacer · saisis un coin pour la redimensionner.',
};

const ed = { active: false, tool: 'terrain', type: 'wall', variant: 'building', grid: EDITOR_GRID,
  draft: null, sel: -1, osel: -1, dsel: null, op: null };
let hooks = {}, els = {};

export function isEditing() { return ed.active; }

const cloneDeploy = d => ({ A: { ...d.A }, B: { ...d.B } });

// --- Câblage (une fois, au démarrage). hooks : { play(map), saved(), back() }.
export function initEditor(h) {
  hooks = h;
  els = {
    panel: document.getElementById('editorPanel'),
    tools: [...document.querySelectorAll('#edTools [data-tool]')],
    terrainRows: document.getElementById('edTerrainRows'),
    typeBtns: [...document.querySelectorAll('#editorPanel [data-t]')],
    variant: document.getElementById('edVariant'),
    grid: document.getElementById('edGrid'),
    del: document.getElementById('edDelete'),
    clear: document.getElementById('edClear'),
    name: document.getElementById('edName'),
    status: document.getElementById('edStatus'),
    validate: document.getElementById('edValidate'),
    save: document.getElementById('edSave'),
    exportBtn: document.getElementById('edExport'),
    play: document.getElementById('edPlay'),
    back: document.getElementById('edBack'),
    exportBox: document.getElementById('edExportBox'),
    exportText: document.getElementById('edExportText'),
    copy: document.getElementById('edCopy'),
    closeExport: document.getElementById('edCloseExport'),
  };

  for (const g of EDITOR_GRID_OPTIONS) {
    const o = document.createElement('option'); o.value = g; o.textContent = g + '″'; o.selected = g === EDITOR_GRID;
    els.grid.appendChild(o);
  }
  els.grid.onchange = () => (ed.grid = parseFloat(els.grid.value));
  els.tools.forEach(b => b.onclick = () => selectTool(b.dataset.tool));
  els.typeBtns.forEach(b => b.onclick = () => {
    ed.type = b.dataset.t; els.typeBtns.forEach(x => x.classList.toggle('on', x === b)); populateVariants();
  });
  els.variant.onchange = () => (ed.variant = els.variant.value);
  els.del.onclick = deleteSelected;
  els.clear.onclick = clearCurrent;
  els.validate.onclick = () => { const v = validate(); setStatus(v.ok ? 'Map jouable ✓' : 'Problèmes : ' + v.issues.join(' · '), v.ok ? 'ok' : 'bad'); };
  els.save.onclick = onSave;
  els.exportBtn.onclick = () => { els.exportText.value = exportCode(els.name.value); els.exportBox.hidden = false; };
  els.copy.onclick = () => navigator.clipboard && navigator.clipboard.writeText(els.exportText.value);
  els.closeExport.onclick = () => (els.exportBox.hidden = true);
  els.play.onclick = () => { const map = currentMap('Test'); leave(); hooks.play(map); };
  els.back.onclick = () => { leave(); hooks.back(); };

  cv.addEventListener('mousedown', ev => {
    if (!ed.active) return;
    const p = board(ev); ed.draft = null;
    if (ed.tool === 'terrain') terrainDown(p);
    else if (ed.tool === 'objective') objectiveDown(p);
    else deployDown(p);
  });
  cv.addEventListener('mousemove', ev => {
    if (!ed.active) return;
    const p = board(ev);
    if (!ed.op) { updateCursor(p); return; }
    applyDrag(p);
  });
  window.addEventListener('mouseup', ev => {
    if (!ed.active || !ed.op) return;
    const op = ed.op; ed.op = null; ed.draft = null;
    if (op.kind === 'draw') finalizeDraw(op, board(ev)); // déplacements/redim. déjà appliqués en direct
  });
  window.addEventListener('keydown', ev => {
    if (!ed.active) return;
    const tag = ev.target && ev.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); deleteSelected(); }
    else if (ev.key === 'Escape') { ed.sel = -1; ed.osel = -1; ed.dsel = null; }
  });
}

// --- Interactions par outil (mousedown).
function terrainDown(p) {
  const hit = topRectAt(p);
  if (hit >= 0) { const r = state.terrain[hit]; ed.sel = hit; ed.op = { kind: 'move', i: hit, ox: r.x, oy: r.y, gx: p.x, gy: p.y }; }
  else ed.op = { kind: 'draw', start: p };
}
function finalizeDraw(op, p) {
  const r = rectFrom(op.start, p);
  if (r.w >= EDITOR_MIN_RECT && r.h >= EDITOR_MIN_RECT) {
    state.terrain.push({ x: r.x, y: r.y, w: r.w, h: r.h, t: ed.type, variant: ed.variant });
    ed.sel = state.terrain.length - 1;
  } else ed.sel = topRectAt(op.start); // clic sur le vide → désélection
}
function objectiveDown(p) {
  let i = objAt(p);
  if (i < 0) { state.objectives.push({ x: clamp(snap(p.x), 0, BW), y: clamp(snap(p.y), 0, BH) }); i = state.objectives.length - 1; }
  const o = state.objectives[i]; ed.osel = i;
  ed.op = { kind: 'obj', i, ox: o.x, oy: o.y, gx: p.x, gy: p.y };
}
function deployDown(p) {
  if (ed.dsel) { // saisir un coin de la zone déjà sélectionnée → redimensionnement
    const corner = handleAt(p, state.deploy[ed.dsel]);
    if (corner) {
      const r = state.deploy[ed.dsel];
      ed.op = { kind: 'dz-resize', zone: ed.dsel, fx: corner.includes('w') ? r.x + r.w : r.x, fy: corner.includes('n') ? r.y + r.h : r.y };
      return;
    }
  }
  const zone = zoneAt(p);
  if (zone) { const r = state.deploy[zone]; ed.dsel = zone; ed.op = { kind: 'dz-move', zone, ox: r.x, oy: r.y, gx: p.x, gy: p.y }; }
  else ed.dsel = null;
}

// --- Application d'un glisser en cours (mousemove).
function applyDrag(p) {
  const op = ed.op;
  if (op.kind === 'draw') { ed.draft = rectFrom(op.start, p); return; }
  if (op.kind === 'move') { const r = state.terrain[op.i]; r.x = clamp(snap(op.ox + p.x - op.gx), 0, BW - r.w); r.y = clamp(snap(op.oy + p.y - op.gy), 0, BH - r.h); return; }
  if (op.kind === 'obj') { const o = state.objectives[op.i]; o.x = clamp(snap(op.ox + p.x - op.gx), 0, BW); o.y = clamp(snap(op.oy + p.y - op.gy), 0, BH); return; }
  if (op.kind === 'dz-move') { const r = state.deploy[op.zone]; r.x = clamp(snap(op.ox + p.x - op.gx), 0, BW - r.w); r.y = clamp(snap(op.oy + p.y - op.gy), 0, BH - r.h); return; }
  if (op.kind === 'dz-resize') {
    const r = state.deploy[op.zone];
    const qx = clamp(snap(p.x), 0, BW), qy = clamp(snap(p.y), 0, BH);
    r.x = Math.min(op.fx, qx); r.y = Math.min(op.fy, qy);
    r.w = Math.max(EDITOR_MIN_RECT, Math.abs(qx - op.fx)); r.h = Math.max(EDITOR_MIN_RECT, Math.abs(qy - op.fy));
    r.w = Math.min(r.w, BW - r.x); r.h = Math.min(r.h, BH - r.y);
  }
}

function updateCursor(p) {
  if (ed.tool === 'terrain') { cv.style.cursor = topRectAt(p) >= 0 ? 'move' : 'crosshair'; return; }
  if (ed.tool === 'objective') { cv.style.cursor = objAt(p) >= 0 ? 'move' : 'copy'; return; }
  const corner = ed.dsel && handleAt(p, state.deploy[ed.dsel]);
  if (corner) cv.style.cursor = (corner === 'nw' || corner === 'se') ? 'nwse-resize' : 'nesw-resize';
  else cv.style.cursor = zoneAt(p) ? 'move' : 'default';
}

function deleteSelected() {
  if (ed.tool === 'terrain') { if (ed.sel >= 0) { state.terrain.splice(ed.sel, 1); ed.sel = -1; } }
  else if (ed.tool === 'objective') { if (ed.osel >= 0) { state.objectives.splice(ed.osel, 1); ed.osel = -1; } }
  // déploiement : les deux zones sont permanentes, rien à supprimer.
}
function clearCurrent() {
  if (ed.tool === 'terrain') { state.terrain.length = 0; ed.sel = -1; }
  else if (ed.tool === 'objective') { state.objectives.length = 0; ed.osel = -1; }
}

// --- Entrée / sortie du mode.
function selectTool(tool) {
  ed.tool = tool; ed.op = null; ed.draft = null;
  els.tools.forEach(b => b.classList.toggle('on', b.dataset.tool === tool));
  els.terrainRows.hidden = tool !== 'terrain';
  cv.style.cursor = 'default';
  setStatus(TOOL_HINT[tool], '');
}

export function openEditor() {
  ed.active = true; ed.tool = 'terrain'; ed.sel = -1; ed.osel = -1; ed.dsel = null; ed.draft = null; ed.op = null;
  ed.type = 'wall'; els.typeBtns.forEach(x => x.classList.toggle('on', x.dataset.t === 'wall'));
  els.tools.forEach(b => b.classList.toggle('on', b.dataset.tool === 'terrain'));
  els.terrainRows.hidden = false;
  populateVariants();
  state.terrain = []; state.objectives = OBJECTIVES.map(o => ({ ...o })); state.deploy = cloneDeploy(DEPLOY_ZONES);
  state.models = []; state.selected = null;
  els.name.value = '';
  document.body.classList.add('editing');
  document.getElementById('start').classList.remove('show');
  els.panel.hidden = false; els.exportBox.hidden = true;
  setStatus(TOOL_HINT.terrain, '');
}

function leave() {
  ed.active = false; ed.draft = null; ed.op = null;
  cv.style.cursor = 'default';
  document.body.classList.remove('editing');
  els.panel.hidden = true; els.exportBox.hidden = true;
}

function onSave() {
  const name = (els.name.value || '').trim();
  if (!name) { setStatus('Donne un nom à la map avant de sauvegarder.', 'bad'); return; }
  const v = validate();
  if (!v.ok) { setStatus('Map injouable : ' + v.issues.join(' · '), 'bad'); return; }
  saveCustomMap(currentMap(name));
  hooks.saved();
  setStatus(`Map « ${name} » sauvegardée — disponible dans le sélecteur.`, 'ok');
}

// --- Rendu (appelé par la boucle de rendu quand isEditing()).
export function drawEditor() {
  ctx.save();
  ctx.setTransform(cv.width / px(BW), 0, 0, cv.height / px(BH), 0, 0);
  ctx.drawImage(mat, 0, 0);
  drawDeploy();
  drawGrid();
  drawTerrain();
  drawObjectives();
  if (ed.tool === 'terrain' && ed.sel >= 0 && state.terrain[ed.sel]) outline(state.terrain[ed.sel], '#c9a227');
  if (ed.tool === 'objective' && ed.osel >= 0 && state.objectives[ed.osel]) outlineObjective(state.objectives[ed.osel]);
  if (ed.tool === 'deploy' && ed.dsel) drawZoneHandles(state.deploy[ed.dsel]);
  if (ed.draft) {
    ctx.fillStyle = 'rgba(201,162,39,.22)'; ctx.fillRect(px(ed.draft.x), px(ed.draft.y), px(ed.draft.w), px(ed.draft.h));
    outline(ed.draft, '#e4c552');
  }
  ctx.restore();
}

function drawDeploy() {
  for (const z of ['A', 'B']) {
    const r = state.deploy[z];
    ctx.fillStyle = `rgba(${ZONE_TINT[z]},${DEPLOY_ZONE_ALPHA})`;
    ctx.fillRect(px(r.x), px(r.y), px(r.w), px(r.h));
    if (ed.tool === 'deploy') { ctx.strokeStyle = `rgba(${ZONE_TINT[z]},.55)`; ctx.lineWidth = 1.5; ctx.strokeRect(px(r.x), px(r.y), px(r.w), px(r.h)); }
  }
}
function drawZoneHandles(r) {
  outline(r, '#c9a227');
  const h = px(EDITOR_HANDLE);
  ctx.fillStyle = '#c9a227';
  for (const [cx, cy] of [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]])
    ctx.fillRect(px(cx) - h / 2, px(cy) - h / 2, h, h);
}
function outlineObjective(o) {
  const r = px(OBJECTIVE_RADIUS) + 4;
  ctx.strokeStyle = '#c9a227'; ctx.lineWidth = 2; ctx.strokeRect(px(o.x) - r, px(o.y) - r, r * 2, r * 2);
}
function drawGrid() {
  ctx.strokeStyle = 'rgba(255,255,255,.055)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let x = 0; x <= BW + 1e-6; x += ed.grid) { ctx.moveTo(px(x), 0); ctx.lineTo(px(x), px(BH)); }
  for (let y = 0; y <= BH + 1e-6; y += ed.grid) { ctx.moveTo(0, px(y)); ctx.lineTo(px(BW), px(y)); }
  ctx.stroke();
}
function outline(r, color) { ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.strokeRect(px(r.x), px(r.y), px(r.w), px(r.h)); }

// --- Helpers.
function board(ev) { const r = cv.getBoundingClientRect(); return { x: (ev.clientX - r.left) / r.width * BW, y: (ev.clientY - r.top) / r.height * BH }; }
const snap = v => Math.round(v / ed.grid) * ed.grid;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function rectFrom(a, b) {
  const x1 = snap(a.x), y1 = snap(a.y), x2 = snap(b.x), y2 = snap(b.y);
  return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) };
}
function topRectAt(p) { for (let i = state.terrain.length - 1; i >= 0; i--) if (pointInRect(p, state.terrain[i])) return i; return -1; }
function objAt(p) { for (let i = state.objectives.length - 1; i >= 0; i--) if (dist(p, state.objectives[i]) <= EDITOR_OBJ_HIT) return i; return -1; }
function zoneAt(p) { if (pointInRect(p, state.deploy.B)) return 'B'; if (pointInRect(p, state.deploy.A)) return 'A'; return null; }
function handleAt(p, r) {
  const corners = { nw: [r.x, r.y], ne: [r.x + r.w, r.y], sw: [r.x, r.y + r.h], se: [r.x + r.w, r.y + r.h] };
  for (const name in corners) { const [cx, cy] = corners[name]; if (Math.abs(p.x - cx) <= EDITOR_HANDLE_HIT && Math.abs(p.y - cy) <= EDITOR_HANDLE_HIT) return name; }
  return null;
}

function populateVariants() {
  els.variant.innerHTML = '';
  for (const [val, label] of VARIANTS[ed.type]) { const o = document.createElement('option'); o.value = val; o.textContent = label; els.variant.appendChild(o); }
  ed.variant = VARIANTS[ed.type][0][0];
  els.variant.value = ed.variant;
}
function validate() { return checkMap(state.terrain, placeSpawns(createModels(), state.deploy), state.objectives); }
function currentMap(fallback) {
  const name = (els.name.value || '').trim() || fallback;
  return {
    name, desc: 'Map personnalisée.',
    terrain: state.terrain.map(r => ({ ...r })),
    objectives: state.objectives.map(o => ({ ...o })),
    deploy: cloneDeploy(state.deploy),
  };
}
function setStatus(msg, kind) { els.status.textContent = msg; els.status.className = 'ed-status' + (kind ? ' ' + kind : ''); }

const num = v => (Number.isInteger(v) ? v : +v.toFixed(2));
function slug(name) {
  const s = (name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
    .split(' ').filter(Boolean).map((w, i) => (i ? w[0].toUpperCase() + w.slice(1) : w)).join('');
  return s || 'maMap';
}
function exportCode(name) {
  const rects = state.terrain.map(r =>
    `      { x: ${num(r.x)}, y: ${num(r.y)}, w: ${num(r.w)}, h: ${num(r.h)}, t: '${r.t}'${r.variant ? `, variant: '${r.variant}'` : ''} },`
  ).join('\n');
  const objs = state.objectives.map(o => `{ x: ${num(o.x)}, y: ${num(o.y)} }`).join(', ');
  const zone = r => `{ x: ${num(r.x)}, y: ${num(r.y)}, w: ${num(r.w)}, h: ${num(r.h)} }`;
  return `  ${slug(name)}: {\n    name: '${(name || 'Ma map').trim()}',\n    desc: 'Map personnalisée.',\n    terrain: [\n${rects}\n    ],\n    objectives: [${objs}],\n    deploy: { A: ${zone(state.deploy.A)}, B: ${zone(state.deploy.B)} },\n  },`;
}
