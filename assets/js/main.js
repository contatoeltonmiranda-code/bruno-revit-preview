import { waLink, DEFAULT_MESSAGE } from './config.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const params = new URLSearchParams(location.search);

/* ---------- WhatsApp CTAs: one constant, one default message ---------- */
$$('[data-wa]').forEach((a) => { a.href = waLink(DEFAULT_MESSAGE); });

/* ---------- masthead + floating button ---------- */
const masthead = $('[data-masthead]');
const floatWa = $('.float-wa');
const heroActions = $('.hero__actions');
const finalCta = $('#contact');
let heroVisible = true;
let finalVisible = false;
const syncFloat = () => floatWa && floatWa.classList.toggle('is-hidden', heroVisible || finalVisible);
const onScroll = () => masthead.classList.toggle('is-solid', window.scrollY > 24);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });
if ('IntersectionObserver' in window) {
  new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; syncFloat(); }).observe(heroActions);
  new IntersectionObserver(([e]) => { finalVisible = e.isIntersecting; syncFloat(); }, { threshold: 0.35 }).observe(finalCta);
}

/* ---------- before / after sliders ---------- */
$$('[data-ba]').forEach((fig) => {
  const frame = $('.ba__frame', fig);
  const range = $('.ba__range', fig);
  const set = (v) => { const p = Math.max(0, Math.min(100, v)); fig.style.setProperty('--pos', p + '%'); range.value = Math.round(p); };
  range.addEventListener('input', () => set(+range.value));
  // pointer drag anywhere on the frame (horizontal intent only, so vertical page scroll still works on touch)
  let startX = 0, startY = 0, dragging = false, decided = false;
  const pos = (e) => { const r = frame.getBoundingClientRect(); return ((e.clientX - r.left) / r.width) * 100; };
  frame.addEventListener('pointerdown', (e) => {
    startX = e.clientX; startY = e.clientY; dragging = true; decided = e.pointerType === 'mouse';
    if (decided) { frame.setPointerCapture(e.pointerId); set(pos(e)); e.preventDefault(); }
  });
  frame.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    if (!decided) {
      const dx = Math.abs(e.clientX - startX), dy = Math.abs(e.clientY - startY);
      if (dx < 6 && dy < 6) return;
      if (dy > dx) { dragging = false; return; }
      decided = true; frame.setPointerCapture(e.pointerId);
    }
    set(pos(e));
  });
  const end = () => { dragging = false; };
  frame.addEventListener('pointerup', end);
  frame.addEventListener('pointercancel', end);
});

/* ---------- Build Your Quote ---------- */
const form = $('[data-builder]');
if (form) {
  const preview = $('[data-preview]', form);
  const total = $('[data-total]', form);
  const error = $('[data-error]', form);
  const items = $$('.item', form);
  const area = form.elements.area, days = form.elements.days, notes = form.elements.notes;
  const MIN_CALLOUT = 45;
  let lastTotal = null;

  const qtyOf = (item) => {
    const inp = $('.qty__val', item);
    if (!inp) return 1;
    const v = Math.round(+inp.value);
    const min = +inp.min || 1, max = +inp.max || 99;
    return Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : min;
  };
  const variantOf = (item) => $('.variant input:checked', item);

  function lineFor(item) {
    const label = item.dataset.label;
    const q = qtyOf(item);
    switch (item.dataset.item) {
      case 'package': {
        const n = +variantOf(item).value;
        return { text: `${n} ${n === 1 ? 'bedroom' : 'bedrooms'} + stairs & landing package`, price: +variantOf(item).dataset.price };
      }
      case 'sofa':
        return { text: `Sofa (${q} ${q === 1 ? 'seat' : 'seats'})`, price: q * +item.dataset.price };
      case 'mattress': {
        const v = variantOf(item);
        return { text: `Mattress (${v.value}) x${q}`, price: q * +v.dataset.price };
      }
      default:
        if (item.hasAttribute('data-single')) return { text: label, price: +item.dataset.price };
        return { text: `${label} x${q}`, price: q * +item.dataset.price };
    }
  }

  function compose() {
    const lines = items.filter((i) => $('.item__check input', i).checked).map(lineFor);
    const sum = lines.reduce((s, l) => s + l.price, 0);
    const est = lines.length ? Math.max(sum, MIN_CALLOUT) : 0;
    const msg = [
      "Hi Bruno, I'd like a quote from REVIT for:",
      ...(lines.length ? lines.map((l) => `- ${l.text}`) : ['- …']),
    ];
    const a = area.value.trim(), d = days.value.trim(), n = notes.value.trim();
    if (a) msg.push(`Area: ${a}`);
    if (d) msg.push(`Preferred days: ${d}`);
    if (n) msg.push(`Notes: ${n}`);
    msg.push("I'll send some photos now.");
    return { lines, est, text: msg.join('\n') };
  }

  function render() {
    const { lines, est, text } = compose();
    preview.textContent = text;
    const label = `€${est}`;
    if (label !== lastTotal) {
      total.textContent = label;
      if (lastTotal !== null && !reduceMotion) {
        total.classList.remove('is-rolling'); void total.offsetWidth; total.classList.add('is-rolling');
      }
      lastTotal = label;
    }
    if (lines.length) error.hidden = true;
  }

  items.forEach((item) => {
    const cb = $('.item__check input', item);
    cb.addEventListener('change', () => { item.classList.toggle('is-on', cb.checked); render(); });
    $$('.qty__btn', item).forEach((b) => b.addEventListener('click', () => {
      const inp = $('.qty__val', item);
      inp.value = Math.max(+inp.min || 1, Math.min(+inp.max || 99, qtyOf(item) + +b.dataset.step));
      render();
    }));
    const inp = $('.qty__val', item);
    if (inp) {
      inp.addEventListener('input', render);
      inp.addEventListener('blur', () => { inp.value = qtyOf(item); render(); });
    }
    $$('.variant input', item).forEach((r) => r.addEventListener('change', render));
  });
  [area, days, notes].forEach((f) => f.addEventListener('input', render));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const { lines, text } = compose();
    if (!lines.length) {
      error.hidden = false;
      $('.item__check input', items[0]).focus();
      return;
    }
    const url = waLink(text);
    form.dataset.lastUrl = url; // exposed for QA
    window.open(url, '_blank', 'noopener');
  });
  render();
}

/* ---------- hero 3D (progressive: poster stays if anything is missing) ---------- */
const stage = $('[data-stage]');
function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
const posterMode = params.get('poster');
if (stage && (posterMode || (!reduceMotion && webglOK()))) {
  import('./hero3d.js')
    .then((m) => m.initHero(stage, { posterMode }))
    .catch(() => { /* poster remains as the static hero */ });
}
