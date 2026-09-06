import { cv, ctx, px } from '../canvas.js';
import { BW, BH, DEPLOY_ZONE_WIDTH, DEPLOY_ZONE_ALPHA, EDITOR_GRID, EDITOR_GRID_OPTIONS, EDITOR_MIN_RECT, OBJECTIVES } from '../config.js';
import { state, createModels } from '../state/game.js';
import { mat, drawTerrain, drawObjectives } from '../render/board.js';
import { pointInRect } from '../rules/geometry.js';
import { checkMap } from '../rules/mapcheck.js';
import { saveCustomMap } from './storage.js';

// Éditeur de map : module consommateur isolé (comme src/ai/). Le cœur l'ignore ; seuls main.js
// (câblage) et input/controls.js (qui bloque la main de jeu pendant l'édition) le connaissent.
// Le décor en cours de tracé vit dans state.terrain, ce qui laisse drawTerrain/drawObjectives
// l'afficher tel quel ; l'éditeur n'ajoute que la grille, le brouillon et la sélection.

// Skins proposés par type de décor (variant cosmétique ; '' = rendu brut selon le type).
const VARIANTS = {
  wall: [['building', 'Bâtiment'], ['ruin', 'Ruine'], ['container', 'Conteneur'], ['tank', 'Cuve'], ['', 'Brut']],
  low: [['barricade', 'Barricade'], ['crates', 'Caisses'], ['', 'Brut']],
};

const ed = { active: false, type: 'wall', variant: 'building', grid: EDITOR_GRID, draft: null, sel: -1, op: null };
let hooks = {}, els = {};

export function isEditing() { return ed.active; }

// --- Câblage (une fois, au démarrage). hooks : { play(map), saved(), back() }.
export function initEditor(h) {
  hooks = h;
  els = {
    panel: document.getElementById('editorPanel'),
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
  els.typeBtns.forEach(b => b.onclick = () => {
    ed.type = b.dataset.t; els.typeBtns.forEach(x => x.classList.toggle('on', x === b)); populateVariants();
  });
  els.variant.onchange = () => (ed.variant = els.variant.value);
  els.del.onclick = () => { if (ed.sel >= 0) { state.terrain.splice(ed.sel, 1); ed.sel = -1; } };
  els.clear.onclick = () => { state.terrain.length = 0; ed.sel = -1; };
  els.validate.onclick = () => { const v = validate(); setStatus(v.ok ? 'Map jouable ✓' : 'Problèmes : ' + v.issues.join(' · '), v.ok ? 'ok' : 'bad'); };
  els.save.onclick = onSave;
  els.exportBtn.onclick = () => { els.exportText.value = exportCode(els.name.value, state.terrain); els.exportBox.hidden = false; };
  els.copy.onclick = () => navigator.clipboard && navigator.clipboard.writeText(els.exportText.value);
  els.closeExport.onclick = () => (els.exportBox.hidden = true);
  els.play.onclick = () => { const map = currentMap('Test'); leave(); hooks.play(map); };
  els.back.onclick = () => { leave(); hooks.back(); };

  // Glisser sur le vide → trace un décor ; glisser sur un décor posé → le déplace ; clic → sélection.
  cv.addEventListener('mousedown', ev => {
    if (!ed.active) return;
    const p = board(ev), hit = topRectAt(p);
    if (hit >= 0) { const r = state.terrain[hit]; ed.sel = hit; ed.op = { kind: 'move', i: hit, ox: r.x, oy: r.y, gx: p.x, gy: p.y }; }
    else ed.op = { kind: 'draw', start: p };
    ed.draft = null;
  });
  cv.addEventListener('mousemove', ev => {
    if (!ed.active) return;
    const p = board(ev);
    if (!ed.op) { cv.style.cursor = topRectAt(p) >= 0 ? 'move' : 'crosshair'; return; }
    if (ed.op.kind === 'draw') ed.draft = rectFrom(ed.op.start, p);
    else {
      const r = state.terrain[ed.op.i];
      r.x = clamp(snap(ed.op.ox + p.x - ed.op.gx), 0, BW - r.w);
      r.y = clamp(snap(ed.op.oy + p.y - ed.op.gy), 0, BH - r.h);
    }
  });
  window.addEventListener('mouseup', ev => {
    if (!ed.active || !ed.op) return;
    const op = ed.op; ed.op = null; ed.draft = null;
    if (op.kind !== 'draw') return; // déplacement déjà appliqué en direct
    const r = rectFrom(op.start, board(ev));
    if (r.w >= EDITOR_MIN_RECT && r.h >= EDITOR_MIN_RECT) {
      state.terrain.push({ x: r.x, y: r.y, w: r.w, h: r.h, t: ed.type, variant: ed.variant });
      ed.sel = state.terrain.length - 1;
    } else ed.sel = topRectAt(op.start); // clic sur le vide → désélection
  });
  window.addEventListener('keydown', ev => {
    if (!ed.active) return;
    const tag = ev.target && ev.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); if (ed.sel >= 0) { state.terrain.splice(ed.sel, 1); ed.sel = -1; } }
    else if (ev.key === 'Escape') ed.sel = -1;
  });
}

// --- Entrée / sortie du mode.
export function openEditor() {
  ed.active = true; ed.sel = -1; ed.draft = null; ed.op = null;
  ed.type = 'wall'; els.typeBtns.forEach(x => x.classList.toggle('on', x.dataset.t === 'wall'));
  populateVariants();
  state.terrain = []; state.models = []; state.selected = null;
  els.name.value = '';
  document.body.classList.add('editing');
  document.getElementById('start').classList.remove('show');
  els.panel.hidden = false; els.exportBox.hidden = true;
  setStatus('Glisse pour tracer un décor · clique-le pour le sélectionner.', '');
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
  ctx.fillStyle = `rgba(92,127,158,${DEPLOY_ZONE_ALPHA})`; ctx.fillRect(0, 0, px(DEPLOY_ZONE_WIDTH), px(BH));
  ctx.fillStyle = `rgba(180,85,58,${DEPLOY_ZONE_ALPHA})`; ctx.fillRect(px(BW - DEPLOY_ZONE_WIDTH), 0, px(DEPLOY_ZONE_WIDTH), px(BH));
  drawGrid();
  drawTerrain();
  drawObjectives();
  if (ed.sel >= 0 && state.terrain[ed.sel]) outline(state.terrain[ed.sel], '#c9a227');
  if (ed.draft) {
    ctx.fillStyle = 'rgba(201,162,39,.22)'; ctx.fillRect(px(ed.draft.x), px(ed.draft.y), px(ed.draft.w), px(ed.draft.h));
    outline(ed.draft, '#e4c552');
  }
  ctx.restore();
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

function populateVariants() {
  els.variant.innerHTML = '';
  for (const [val, label] of VARIANTS[ed.type]) { const o = document.createElement('option'); o.value = val; o.textContent = label; els.variant.appendChild(o); }
  ed.variant = VARIANTS[ed.type][0][0];
  els.variant.value = ed.variant;
}
function validate() { return checkMap(state.terrain, createModels(), OBJECTIVES); }
function currentMap(fallback) {
  const name = (els.name.value || '').trim() || fallback;
  return { name, desc: 'Map personnalisée.', terrain: state.terrain.map(r => ({ ...r })) };
}
function setStatus(msg, kind) { els.status.textContent = msg; els.status.className = 'ed-status' + (kind ? ' ' + kind : ''); }

const num = v => (Number.isInteger(v) ? v : +v.toFixed(2));
function slug(name) {
  const s = (name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
    .split(' ').filter(Boolean).map((w, i) => (i ? w[0].toUpperCase() + w.slice(1) : w)).join('');
  return s || 'maMap';
}
function exportCode(name, terrain) {
  const rects = terrain.map(r =>
    `      { x: ${num(r.x)}, y: ${num(r.y)}, w: ${num(r.w)}, h: ${num(r.h)}, t: '${r.t}'${r.variant ? `, variant: '${r.variant}'` : ''} },`
  ).join('\n');
  return `  ${slug(name)}: {\n    name: '${(name || 'Ma map').trim()}',\n    desc: 'Map personnalisée.',\n    terrain: [\n${rects}\n    ],\n  },`;
}
