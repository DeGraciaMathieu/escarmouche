import { ctx, px } from '../canvas.js';

// Aspect cosmétique des traçantes selon l'arme (champ `tracer` de l'arme). `headMult` règle la
// vitesse apparente, `tail` la longueur du trait, `glow` un halo (bolt épais).
const TRACER_STYLES = {
  default: { color: '255,228,160', width: 2.2, tail: .22, headMult: 1.25 },
  plasma:  { color: '120,240,205', width: 4.6, tail: .30, headMult: 1.10, glow: true },
  sniper:  { color: '235,240,255', width: 1.3, tail: .60, headMult: 1.35 },
  assaut:  { color: '255,214,150', width: 1.8, tail: .14, headMult: 1.65 },
};

// Teinte `r,g,b` d'une arme (bouche, traçante, impact), ou null si aucun style dédié.
export const tracerColor = style => style && TRACER_STYLES[style] ? TRACER_STYLES[style].color : null;

// Effets visuels éphémères du plateau (traceurs, impacts, boucliers, texte flottant).
let fx = [];

export const addFx = o => fx.push({ t0: performance.now(), ...o });

export function drawFx() {
  const now = performance.now();
  fx = fx.filter(e => now - e.t0 < e.dur);
  for (const e of fx) {
    const k = (now - e.t0) / e.dur;
    ctx.save();
    if (e.type === 'tracer') {
      const st = TRACER_STYLES[e.style] || TRACER_STYLES.default;
      const a = { x: px(e.from.x), y: px(e.from.y) }, b = { x: px(e.to.x), y: px(e.to.y) };
      const head = Math.min(1, k * st.headMult), tail = Math.max(0, head - st.tail);
      const alpha = (1 - k) * .95;
      const x1 = a.x + (b.x - a.x) * tail, y1 = a.y + (b.y - a.y) * tail;
      const x2 = a.x + (b.x - a.x) * head, y2 = a.y + (b.y - a.y) * head;
      ctx.lineCap = 'round';
      if (st.glow) {
        ctx.strokeStyle = 'rgba(' + st.color + ',' + alpha * .35 + ')'; ctx.lineWidth = st.width * 2.4;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(' + st.color + ',' + alpha + ')'; ctx.lineWidth = st.width;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    else if (e.type === 'muzzle') {
      const R = 6 + k * 12;
      ctx.fillStyle = 'rgba(' + (e.color || '255,232,170') + ',' + (1 - k) * .85 + ')';
      ctx.beginPath(); ctx.arc(px(e.x), px(e.y), R, 0, 7); ctx.fill();
    }
    else if (e.type === 'impact') {
      const R = 4 + k * 20;
      ctx.strokeStyle = 'rgba(' + (e.color || '232,128,74') + ',' + (1 - k) * .9 + ')';
      ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(px(e.x), px(e.y), R, 0, 7); ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const a = e.seed + i * 1.05, r1 = R * .5, r2 = R * 1.15;
        ctx.beginPath();
        ctx.moveTo(px(e.x) + Math.cos(a) * r1, px(e.y) + Math.sin(a) * r1);
        ctx.lineTo(px(e.x) + Math.cos(a) * r2, px(e.y) + Math.sin(a) * r2);
        ctx.stroke();
      }
    }
    else if (e.type === 'shield') {
      ctx.strokeStyle = 'rgba(127,166,196,' + (1 - k) * .95 + ')'; ctx.lineWidth = 2.6;
      const R = px(.62) + 6 + k * 9;
      ctx.beginPath(); ctx.arc(px(e.x), px(e.y), R, -2.6, -0.5); ctx.stroke();
      ctx.beginPath(); ctx.arc(px(e.x), px(e.y), R, 0.5, 2.6); ctx.stroke();
    }
    else if (e.type === 'float') {
      const y = px(e.y) - 14 - k * 30;
      ctx.globalAlpha = k < .7 ? 1 : (1 - (k - .7) / .3);
      ctx.font = '600 ' + (e.size || 24) + 'px "Barlow Condensed", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.75)';
      ctx.strokeText(e.text, px(e.x), y); ctx.fillStyle = e.color; ctx.fillText(e.text, px(e.x), y);
    }
    ctx.restore();
  }
}
