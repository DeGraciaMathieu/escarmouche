import { ctx, px } from '../canvas.js';

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
      const a = { x: px(e.from.x), y: px(e.from.y) }, b = { x: px(e.to.x), y: px(e.to.y) };
      const head = Math.min(1, k * 1.25), tail = Math.max(0, head - .22);
      ctx.strokeStyle = 'rgba(255,228,160,' + (1 - k) * .95 + ')'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(a.x + (b.x - a.x) * tail, a.y + (b.y - a.y) * tail);
      ctx.lineTo(a.x + (b.x - a.x) * head, a.y + (b.y - a.y) * head);
      ctx.stroke();
    }
    else if (e.type === 'muzzle') {
      const R = 6 + k * 12;
      ctx.fillStyle = 'rgba(255,232,170,' + (1 - k) * .85 + ')';
      ctx.beginPath(); ctx.arc(px(e.x), px(e.y), R, 0, 7); ctx.fill();
    }
    else if (e.type === 'impact') {
      const R = 4 + k * 20;
      ctx.strokeStyle = (e.color || 'rgba(232,128,74,') + ((1 - k) * .9) + ')';
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
