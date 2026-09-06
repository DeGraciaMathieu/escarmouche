import { cv, ctx, px } from '../canvas.js';
import { MAT_TEXTURE_DOTS, OBJECTIVES, OBJECTIVE_RANGE, OBJECTIVE_RADIUS } from '../config.js';
import { TEAMS, state, WEAPONS, ROLE_LOADOUTS } from '../state/game.js';
import { sfx } from '../audio.js';
import { sight, canTarget, canReachAny } from '../rules/sight.js';
import { controlOf } from '../rules/objective.js';
import { weaponsForRole } from '../rules/loadout.js';
import { dist } from '../rules/geometry.js';

// Texture du tapis, pré-rendue une fois hors écran.
export const mat = document.createElement('canvas');
mat.width = cv.width; mat.height = cv.height;
(function () {
  const m = mat.getContext('2d');
  m.fillStyle = '#2b332e'; m.fillRect(0, 0, mat.width, mat.height);
  for (let i = 0; i < MAT_TEXTURE_DOTS; i++) {
    m.fillStyle = Math.random() > .5 ? 'rgba(255,255,255,.033)' : 'rgba(0,0,0,.05)';
    m.fillRect(Math.random() * mat.width, Math.random() * mat.height, 1.6, 1.6);
  }
  const g = m.createRadialGradient(mat.width / 2, mat.height / 2, 60, mat.width / 2, mat.height / 2, mat.width * .7);
  g.addColorStop(0, 'rgba(255,255,255,.03)'); g.addColorStop(1, 'rgba(0,0,0,.35)');
  m.fillStyle = g; m.fillRect(0, 0, mat.width, mat.height);
})();

export function drawTerrain() {
  for (const r of state.terrain) {
    const x = px(r.x), y = px(r.y), w = px(r.w), h = px(r.h), high = r.t === 'wall', lift = high ? 9 : 3;
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x + lift, y + lift, w, h); // ombre portée
    (SKINS[r.variant] || (high ? drawWall : drawLow))(x, y, w, h);
  }
}

// --- Rendus de décor. Un skin dessine dans le rectangle (x, y, w, h) en pixels ; déterministe
//     (redessiné à chaque frame). Repli sur drawWall / drawLow selon le type quand `variant` manque.

function drawWall(x, y, w, h) {
  ctx.fillStyle = '#4a4239'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#584f43'; ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1.5; ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
  ctx.fillStyle = 'rgba(0,0,0,.32)';
  for (let i = 6; i < w - 4; i += 14) for (let j = 6; j < h - 4; j += 14) ctx.fillRect(x + i, y + j, 2, 2);
}

function drawLow(x, y, w, h) {
  ctx.fillStyle = '#6b5a45'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1; ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
  ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.beginPath();
  if (w > h) { for (let i = 8; i < w; i += 11) { ctx.moveTo(x + i, y + 1); ctx.lineTo(x + i, y + h - 1); } }
  else { for (let j = 8; j < h; j += 11) { ctx.moveTo(x + 1, y + j); ctx.lineTo(x + w - 1, y + j); } }
  ctx.stroke();
}

// Conteneur maritime : tôle nervurée colorée, cadre sombre, panneau de portes à une extrémité.
function drawContainer(x, y, w, h) {
  ctx.fillStyle = '#8a4b38'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.strokeStyle = 'rgba(0,0,0,.26)'; ctx.lineWidth = 1; ctx.beginPath();
  const along = w >= h;
  if (along) for (let i = 5; i < w - 3; i += 6) { ctx.moveTo(x + i, y + 3); ctx.lineTo(x + i, y + h - 3); }
  else for (let j = 5; j < h - 3; j += 6) { ctx.moveTo(x + 3, y + j); ctx.lineTo(x + w - 3, y + j); }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1.4;
  if (along) { const d = Math.min(12, w * .24); ctx.strokeRect(x + w - d - 3, y + 3, d, h - 6); }
  else { const d = Math.min(12, h * .24); ctx.strokeRect(x + 3, y + h - d - 3, w - 6, d); }
}

// Ruine : béton érodé gris, haut crénelé, fissure.
function drawRuin(x, y, w, h) {
  ctx.fillStyle = '#5b574e'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#6a655a'; ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  for (let i = 0; i < w - 3; i += 8) if (Math.floor((x + i) / 8) % 2 === 0) ctx.fillRect(x + i, y, 4, 3);
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; ctx.beginPath();
  ctx.moveTo(x + w * .4, y + 3); ctx.lineTo(x + w * .52, y + h * .5); ctx.lineTo(x + w * .42, y + h - 3);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
}

// Bâtiment : bloc massif à fenêtres sombres.
function drawBuilding(x, y, w, h) {
  ctx.fillStyle = '#464a52'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#525761'; ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
  ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 1.5; ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
  ctx.fillStyle = 'rgba(10,12,16,.7)';
  for (let i = 10; i < w - 10; i += 16) for (let j = 10; j < h - 10; j += 16) ctx.fillRect(x + i, y + j, 7, 9);
}

// Cuve/citerne : cylindre métallique, ombrage latéral et anneaux.
function drawTank(x, y, w, h) {
  ctx.fillStyle = '#5b6168'; ctx.fillRect(x, y, w, h);
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, 'rgba(0,0,0,.35)'); g.addColorStop(.5, 'rgba(255,255,255,.12)'); g.addColorStop(1, 'rgba(0,0,0,.4)');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1.5; ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
  ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1; ctx.beginPath();
  ctx.moveTo(x + 2, y + h * .28); ctx.lineTo(x + w - 2, y + h * .28);
  ctx.moveTo(x + 2, y + h * .72); ctx.lineTo(x + w - 2, y + h * .72);
  ctx.stroke();
}

// Barricade : sacs empilés (rangée de bosses sombres).
function drawBarricade(x, y, w, h) {
  ctx.fillStyle = '#6e6144'; ctx.fillRect(x, y, w, h);
  const along = w >= h, n = Math.max(2, Math.round((along ? w : h) / 9));
  ctx.fillStyle = 'rgba(0,0,0,.16)';
  for (let k = 0; k < n; k++) {
    if (along) ctx.fillRect(x + k * (w / n) + 1, y + 1, w / n - 2, h - 2);
    else ctx.fillRect(x + 1, y + k * (h / n) + 1, w - 2, h / n - 2);
  }
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
}

// Caisses : grille de caisses en bois avec croisillons.
function drawCrates(x, y, w, h) {
  ctx.fillStyle = '#7a6440'; ctx.fillRect(x, y, w, h);
  const cols = Math.max(1, Math.round(w / 16)), rows = Math.max(1, Math.round(h / 16)), cw = w / cols, ch = h / rows;
  ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1;
  for (let c = 0; c < cols; c++) for (let rr = 0; rr < rows; rr++) {
    const bx = x + c * cw, by = y + rr * ch;
    ctx.strokeRect(bx + 1.5, by + 1.5, cw - 3, ch - 3);
    ctx.beginPath(); ctx.moveTo(bx + 2, by + 2); ctx.lineTo(bx + cw - 2, by + ch - 2);
    ctx.moveTo(bx + cw - 2, by + 2); ctx.lineTo(bx + 2, by + ch - 2); ctx.stroke();
  }
}

const SKINS = {
  container: drawContainer, ruin: drawRuin, building: drawBuilding,
  tank: drawTank, barricade: drawBarricade, crates: drawCrates,
};

// Marqueurs d'objectif : halo de portée + palet losangé teinté par le camp qui le contrôle
// (doré si disputé). Dessiné entre le décor et les figurines.
export function drawObjectives() {
  for (const o of OBJECTIVES) {
    const cx = px(o.x), cy = px(o.y), owner = controlOf(state.models, o, OBJECTIVE_RANGE);
    const col = owner ? TEAMS[owner].color : '#c9a227';
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, px(OBJECTIVE_RANGE), 0, 7);
    ctx.setLineDash([4, 6]); ctx.strokeStyle = col + '66'; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.setLineDash([]);
    const r = px(OBJECTIVE_RADIUS);
    ctx.translate(cx, cy); ctx.rotate(Math.PI / 4);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-r + 2, -r + 2, r * 2, r * 2);
    ctx.fillStyle = col; ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.strokeStyle = '#15180f'; ctx.lineWidth = 2; ctx.strokeRect(-r, -r, r * 2, r * 2);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-r * .32, -r * .32, r * .64, r * .64);
    ctx.restore();
  }
}

// Point situé à la fraction `frac` (0..1) le long d'une polyligne, par longueur cumulée.
function pointAlong(path, frac) {
  let total = 0;
  for (let i = 1; i < path.length; i++) total += dist(path[i - 1], path[i]);
  let target = frac * total;
  for (let i = 1; i < path.length; i++) {
    const seg = dist(path[i - 1], path[i]);
    if (target <= seg || i === path.length - 1) {
      const t = seg === 0 ? 0 : target / seg, a = path[i - 1], b = path[i];
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    target -= seg;
  }
  return path[path.length - 1];
}

// Position interpolée d'une figurine en cours d'animation de déplacement, le long de son chemin.
export function modelPos(m) {
  if (m.anim) {
    const k = Math.min(1, (performance.now() - m.anim.t0) / m.anim.dur);
    const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    const path = m.anim.path, last = path[path.length - 1];
    if (k >= 1) { m.anim = null; m.x = last.x; m.y = last.y; sfx.drop(); return { x: m.x, y: m.y, lift: 0 }; }
    const p = pointAlong(path, e);
    return { x: p.x, y: p.y, lift: Math.sin(k * Math.PI) };
  }
  return { x: m.x, y: m.y, lift: 0 };
}

function tag(x, y, text, bg = '#c9a227', fg = '#191b12') {
  ctx.font = '600 14px "Barlow Condensed", sans-serif';
  const w = ctx.measureText(text).width + 14;
  ctx.fillStyle = bg; ctx.fillRect(x - w / 2, y - 11, w, 21);
  ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y);
}

export function drawModel(m) {
  const p = modelPos(m), isSel = m === state.selected, held = state.drag && state.drag.m === m;
  const playable = !state.over && m.team === state.side && !m.activated && m.alive && !state.busy;
  const lift = p.lift * .9 + (isSel ? .35 : 0) + (held ? .9 : 0);
  const cx = px(p.x), cy = px(p.y) - lift * 7, R = px(m.r), col = TEAMS[m.team];
  if (playable && !isSel) {
    const pulse = .5 + .5 * Math.sin(performance.now() / 560);
    ctx.beginPath(); ctx.arc(cx, cy, R + 6 + pulse * 2.5, 0, 7);
    ctx.strokeStyle = 'rgba(201,162,39,' + (.2 + pulse * .24) + ')'; ctx.lineWidth = 3; ctx.stroke();
  }
  if (state.pending && state.pending.target === m) {
    const pulse = .5 + .5 * Math.sin(performance.now() / 260);
    ctx.beginPath(); ctx.arc(cx, cy, R + 9 + pulse * 3, 0, 7);
    ctx.strokeStyle = 'rgba(196,80,58,' + (.5 + pulse * .4) + ')'; ctx.lineWidth = 2.4; ctx.stroke();
  }
  ctx.fillStyle = 'rgba(0,0,0,' + (.42 - lift * .08) + ')';
  ctx.beginPath(); ctx.ellipse(px(p.x) + 3 + lift * 4, px(p.y) + 4 + lift * 5, R * (1 + lift * .12), R * .72 * (1 + lift * .12), 0, 0, 7); ctx.fill();
  const done = m.activated && !isSel; if (done) ctx.globalAlpha = .5;
  const g = ctx.createRadialGradient(cx - R * .4, cy - R * .5, 2, cx, cy, R);
  g.addColorStop(0, col.color); g.addColorStop(1, col.deep);
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 2.4; ctx.strokeStyle = '#15180f'; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, R - 4, 0, 7); ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.font = '600 13px "Barlow Condensed", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(m.role === 'meneur' ? '★' : (m.role === 'appui' ? '▲' : '●'), cx, cy + 1);
  if (m.flash > 0) {
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7);
    ctx.fillStyle = 'rgba(255,255,255,' + Math.min(.8, m.flash) + ')'; ctx.fill();
    m.flash -= 0.045;
  }
  const frac = m.hp / m.w;
  if (frac < 1) {
    ctx.beginPath(); ctx.arc(cx, cy, R + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
    ctx.strokeStyle = frac > .5 ? '#8fbf6a' : (frac > .25 ? '#d9b03a' : '#c4503a'); ctx.lineWidth = 3; ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (m.activated && m.alive) {
    const tx = cx + R * .82, ty = cy + R * .82;
    ctx.beginPath(); ctx.arc(tx, ty, 7, 0, 7); ctx.fillStyle = '#171b15'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(tx - 3, ty); ctx.lineTo(tx - .6, ty + 2.6); ctx.lineTo(tx + 3.2, ty - 2.6); ctx.stroke();
  }
  if (isSel) {
    ctx.beginPath(); ctx.arc(cx, cy, R + 8, 0, 7);
    ctx.strokeStyle = 'rgba(201,162,39,.95)'; ctx.lineWidth = 2.2; ctx.stroke();
    if (m.ap > 0 && m.team === state.side && !state.over) {
      const n = m.apl, w = n * 9, y0 = cy - R - 14;
      for (let i = 0; i < n; i++) {
        ctx.beginPath(); ctx.arc(cx - w / 2 + 4.5 + i * 9, y0, 3.4, 0, 7);
        ctx.fillStyle = i < m.ap ? '#c9a227' : 'rgba(255,255,255,.18)'; ctx.fill();
      }
    }
  }
}

export function drawTargets() {
  if (!state.selected || state.drag || state.busy || state.over) return;
  if (state.selected.team !== state.side || state.selected.ap < 1 || state.selected.shot) return;
  for (const e of state.models) {
    if (!e.alive || e.team === state.selected.team) continue;
    const chk = canTarget(state.selected, e, state.terrain, state.models), cx = px(e.x), cy = px(e.y), R = px(e.r) + 9;
    ctx.save();
    if (chk.ok) {
      ctx.strokeStyle = chk.s.cover ? 'rgba(217,176,58,.9)' : chk.s.masked ? 'rgba(180,144,201,.9)' : 'rgba(143,191,106,.95)'; ctx.lineWidth = 1.8;
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + Math.PI / 4;
        ctx.beginPath(); ctx.arc(cx, cy, R, a - .28, a + .28); ctx.stroke();
      }
    } else {
      ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
    }
    ctx.restore();
  }
}

export function drawRange(m) {
  ctx.save();
  ctx.setLineDash([6, 7]); ctx.strokeStyle = 'rgba(201,162,39,.5)'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(px(m.x), px(m.y), px(m.M), 0, 7); ctx.stroke();
  ctx.fillStyle = 'rgba(201,162,39,.045)'; ctx.fill();
  if (m.weapon.range && !m.shot) {
    ctx.setLineDash([2, 6]); ctx.strokeStyle = 'rgba(230,225,211,.22)'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(px(m.x), px(m.y), px(m.weapon.range), 0, 7); ctx.stroke();
  }
  ctx.restore();
}

export function drawTape() {
  if (!state.drag) return;
  const drag = state.drag, ok = drag.chk.ok;
  const a = { x: px(drag.m.x), y: px(drag.m.y) }, b = { x: px(drag.to.x), y: px(drag.to.y) };
  const path = (ok && drag.chk.path) ? drag.chk.path : [{ x: drag.m.x, y: drag.m.y }, drag.to];
  ctx.save();
  ctx.strokeStyle = ok ? 'rgba(201,162,39,.95)' : 'rgba(196,80,58,.9)'; ctx.lineWidth = 2.2; ctx.setLineDash(ok ? [] : [7, 6]);
  ctx.beginPath(); ctx.moveTo(px(path[0].x), px(path[0].y));
  for (let i = 1; i < path.length; i++) ctx.lineTo(px(path[i].x), px(path[i].y));
  ctx.stroke(); ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(b.x, b.y, px(drag.m.r), 0, 7);
  ctx.fillStyle = ok ? 'rgba(255,255,255,.14)' : 'rgba(196,80,58,.18)'; ctx.fill();
  ctx.strokeStyle = ok ? 'rgba(255,255,255,.5)' : 'rgba(196,80,58,.8)'; ctx.lineWidth = 1.5; ctx.stroke();
  const label = ok ? drag.chk.d.toFixed(1) + '″  (reste ' + Math.max(0, drag.m.M - drag.chk.d).toFixed(1) + '″)' : drag.chk.why;
  tag((a.x + b.x) / 2, (a.y + b.y) / 2 - 16, label, ok ? '#c9a227' : '#c4503a', ok ? '#191b12' : '#fff');
  ctx.restore();
}

export function drawFiringLine() {
  if (!state.pending) return;
  const pending = state.pending;
  const a = { x: px(pending.shooter.x), y: px(pending.shooter.y) }, b = { x: px(pending.target.x), y: px(pending.target.y) };
  const col = pending.s.cover ? '#d9b03a' : pending.s.masked ? '#b490c9' : '#8fbf6a';
  const status = pending.s.cover ? 'à couvert' : pending.s.masked ? 'masquée' : 'à découvert';
  ctx.save();
  ctx.setLineDash([9, 6]); ctx.lineDashOffset = -performance.now() / 45;
  ctx.strokeStyle = col; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  ctx.restore();
  tag((a.x + b.x) / 2, (a.y + b.y) / 2 - 16, pending.s.len.toFixed(1) + '″ · ' + status, col, '#191b12');
}

export function drawSight() {
  if (!state.selected || !state.hoverModel || state.drag || state.busy) return;
  if (state.hoverModel.team === state.selected.team) return;
  const roleWeapons = weaponsForRole(state.selected.role, ROLE_LOADOUTS).map(k => WEAPONS[k]);
  const chk = canReachAny(state.selected, state.hoverModel, state.terrain, state.models, roleWeapons), s = chk.s || sight(state.selected, state.hoverModel, state.terrain, state.models);
  const a = { x: px(state.selected.x), y: px(state.selected.y) }, b = { x: px(state.hoverModel.x), y: px(state.hoverModel.y) };
  let col, label;
  if (!s.los) { col = '#c4503a'; label = 'vue bloquée'; }
  else if (!chk.ok) { col = '#c4503a'; label = chk.why; }
  else if (s.cover) { col = '#d9b03a'; label = s.len.toFixed(1) + '″ · à couvert'; }
  else if (s.masked) { col = '#b490c9'; label = s.len.toFixed(1) + '″ · masquée'; }
  else { col = '#8fbf6a'; label = s.len.toFixed(1) + '″ · à découvert'; }
  ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 1.7;
  if (!chk.ok) ctx.setLineDash([5, 6]);
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.restore();
  tag((a.x + b.x) / 2, (a.y + b.y) / 2 - 16, label, col, '#191b12');
}

export function drawHoverName() {
  if (!state.hoverModel || state.drag) return;
  const p = modelPos(state.hoverModel);
  tag(px(p.x), px(p.y) + px(state.hoverModel.r) + 18, state.hoverModel.name + ' · ' + state.hoverModel.hp + ' PV', '#1b211b', '#e6e1d3');
}
