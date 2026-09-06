import { JOURNAL_MAX } from '../config.js';
import { TEAMS, state } from '../state/game.js';
import { aliveOf, remaining } from '../rules/squad.js';
import { select } from '../loop/turn.js';

// Journal des six derniers événements.
const events = [];
export function journal(html) {
  const el = document.getElementById('journal');
  if (!el) return;
  events.unshift(html); if (events.length > JOURNAL_MAX) events.pop();
  el.innerHTML = events.map(e => `<li>${e}</li>`).join('');
}

function chips(team, box) {
  box.innerHTML = '';
  state.models.filter(m => m.team === team).forEach(m => {
    const c = document.createElement('span');
    c.className = 'chip' + (!m.alive ? ' dead' : (m.activated ? ' played' : '')) + (m === state.selected && m.alive && !m.activated ? ' now' : '');
    c.title = m.name;
    if (m.alive) c.onclick = () => { if (!state.busy && m.team === state.side && !m.activated) select(m); };
    box.appendChild(c);
  });
}

function card(m) {
  const t = TEAMS[m.team], el = document.createElement('div');
  el.className = 'urow' + (m === state.selected ? ' sel' : '') + (m.activated && m.alive ? ' played' : '') + (!m.alive ? ' dead' : '')
    + (state.pending && state.pending.target === m ? ' aimed-at' : '');
  el.style.setProperty('--tc', t.color);
  const statut = !m.alive ? 'hors de combat' : m.activated ? 'activée'
    : (m.team === state.side ? `${m.ap} PA` : 'en attente');
  el.innerHTML = `
    <div class="urow-top"><span class="uname">${m.name}</span><span class="uhp">${m.hp}/${m.w} PV</span></div>
    <div class="hpbar"><i style="width:${100 * m.hp / m.w}%"></i></div>
    <div class="usub">${statut} · ${m.weapon.name} / ${m.meleeWeapon.name}${m.aimed ? ' · en joue' : ''}</div>`;
  if (m.alive) el.onclick = () => { if (!state.busy) select(m); };
  return el;
}

// Redessine tout le panneau latéral et le bandeau d'état depuis l'état courant.
export function refresh() {
  document.getElementById('turnNum').textContent = state.turn;
  for (const t of ['A', 'B']) {
    const sq = document.getElementById('squad' + t);
    sq.classList.toggle('active', t === state.side && !state.over);
    const left = remaining(state.models, t), al = aliveOf(state.models, t).length;
    document.getElementById('state' + t).textContent = state.over ? `${al} debout`
      : (t === state.side ? `à jouer · ${left} figurine${left > 1 ? 's' : ''} restante${left > 1 ? 's' : ''}` : `${left} en attente`);
    document.getElementById('score' + t).textContent = `${state.score[t]} pt`;
    chips(t, document.getElementById('chips' + t));
  }
  const ra = document.getElementById('rosterA'), rb = document.getElementById('rosterB');
  ra.innerHTML = ''; rb.innerHTML = '';
  state.models.forEach(m => (m.team === 'A' ? ra : rb).appendChild(card(m)));

  const name = document.getElementById('actName'), sub = document.getElementById('actSub'), pips = document.getElementById('actPips');
  if (state.selected) {
    name.textContent = state.selected.name; name.classList.remove('empty');
    pips.innerHTML = state.selected.alive && !state.selected.activated
      ? `${'<i class="on"></i>'.repeat(state.selected.ap)}${'<i></i>'.repeat(state.selected.apl - state.selected.ap)}` : '';
    sub.textContent = !state.selected.alive ? 'hors de combat'
      : state.selected.team !== state.side ? 'escouade adverse'
        : state.selected.activated && state.selected.ap <= 0 ? 'activation terminée'
          : `${state.selected.ap} point${state.selected.ap > 1 ? 's' : ''} d'action · ${state.selected.moved ? 'a bougé' : "n'a pas bougé"}${state.selected.shot ? ' · a tiré' : ''}`;
  } else { name.textContent = 'Aucune figurine sélectionnée'; name.classList.add('empty'); pips.innerHTML = ''; sub.textContent = ''; }
  const own = state.selected && state.selected.team === state.side && state.selected.alive && !state.over && !state.pending;
  document.getElementById('btnUndo').disabled = !(own && state.undoState && state.undoState.m === state.selected && !state.selected.shot);
  document.getElementById('btnEnd').disabled = !(own && state.selected.ap > 0);
}
