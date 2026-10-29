// Герой-«видео», которое перематывается скроллом (приём из урока про интерактивный экран).
// Кадры лежат в public/seq/h (нарезка видео 16:9) и public/seq/v (вертикальное 9:16 для телефонов). Страница прокручивается, кадр выбирается
// по прогрессу скролла внутри высокой секции .hero, canvas рисует нужный кадр.
const FRAMES = 121;
const START_UI = 0.06;   // до этого прогресса интерфейс героя виден
const FINALE = 0.93;     // после этого появляется финальный блок
const STEPS = [0, 0.08, 0.38, 0.66, FINALE]; // шаги экскурсии Арчи
// «Умная» обрезка горизонтального видео на узких экранах (планшет в ландшафте, окно браузера): какую часть кадра по горизонтали держать в центре.
// Пары [номер кадра, доля ширины]: фасад справа, дверь слева, затем зал и окно с Библиотекой.
const FOCUS = [[1, 0.66], [20, 0.72], [40, 0.65], [52, 0.45], [60, 0.5], [75, 0.58], [100, 0.65], [121, 0.68]];
const focusAt = (n) => {
  if (n <= FOCUS[0][0]) return FOCUS[0][1];
  for (let i = 1; i < FOCUS.length; i++) {
    if (n <= FOCUS[i][0]) {
      const [a, fa] = FOCUS[i - 1]; const [b, fb] = FOCUS[i];
      return fa + (fb - fa) * ((n - a) / (b - a));
    }
  }
  return FOCUS[FOCUS.length - 1][1];
};

export function initHeroScrub() {
  const hero = document.getElementById('hero');
  const cv = document.getElementById('cv');
  if (!hero || !cv) return;
  const ctx = cv.getContext('2d', { alpha: false });
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // на портретном экране (телефон) берём вертикальное видео, иначе горизонтальное
  const portrait = window.matchMedia('(max-aspect-ratio: 1/1)').matches;
  const dir = portrait ? 'v' : 'h';
  const src = (i) => `./seq/${dir}/${String(i).padStart(4, '0')}.webp`;

  const imgs = new Array(FRAMES + 1);
  const loaded = new Array(FRAMES + 1).fill(false);
  let vw = 0; let vh = 0; let dpr = 1;
  let current = 0; let target = 0; let lastDrawn = -1; let lastP = -1;

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    vw = cv.clientWidth; vh = cv.clientHeight;
    cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
    lastDrawn = -1;
    draw(current);
  };

  // ближайший уже загруженный кадр (пока догружаются остальные)
  const nearest = (i) => {
    for (let d = 0; d < FRAMES; d++) {
      if (loaded[i - d] && i - d >= 1) return i - d;
      if (loaded[i + d] && i + d <= FRAMES) return i + d;
    }
    return 0;
  };

  // fx — доля ширины кадра, которая должна оказаться по центру экрана (на широком экране ничего не меняет)
  const cover = (img, alpha, fx) => {
    const iw = img.naturalWidth; const ih = img.naturalHeight;
    const s = Math.max(cv.width / iw, cv.height / ih);
    const w = iw * s; const h = ih * s;
    const x = Math.min(0, Math.max(cv.width - w, cv.width / 2 - fx * w));
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, x, (cv.height - h) / 2, w, h);
    ctx.globalAlpha = 1;
  };

  // f — дробный номер кадра (0..FRAMES-1); соседние кадры смешиваем для плавности
  function draw(f) {
    const a = nearest(Math.min(FRAMES, Math.floor(f) + 1));
    if (!a) return;
    const fx = portrait ? 0.5 : focusAt(f + 1); // у вертикального видео кадр уже скомпонован под телефон
    cover(imgs[a], 1, fx);
    const frac = f - Math.floor(f);
    const b = Math.min(FRAMES, Math.floor(f) + 2);
    if (frac > 0.04 && loaded[b]) cover(imgs[b], frac, fx);
  }

  // загрузка: сначала кадр 1, затем каждый 8-й, 4-й, 2-й и остальные, 8 параллельных потоков
  const load = (i) => new Promise((resolve) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => {
      (im.decode ? im.decode().catch(() => {}) : Promise.resolve()).then(() => {
        imgs[i] = im; loaded[i] = true; resolve();
      });
    };
    im.onerror = resolve;
    im.src = src(i);
  });
  const order = [];
  const seen = new Set([1]);
  for (const step of [8, 4, 2, 1]) {
    for (let i = 1; i <= FRAMES; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); }
  }
  load(1).then(() => { resize(); });
  let next = 0;
  const worker = async () => { while (next < order.length) await load(order[next++]); };
  for (let k = 0; k < 8; k++) worker();

  if (reduce) {
    // без анимации показываем один выразительный кадр (зал с арочными окнами)
    hero.classList.add('is-static');
    load(75).then(() => { current = 74; draw(74); });
    window.addEventListener('resize', resize);
    return;
  }

  let phase = ''; let step = -1;
  const setPhase = (p) => {
    const ph = p <= START_UI ? 'start' : p >= FINALE ? 'finale' : 'flight';
    if (ph !== phase) { phase = ph; hero.dataset.phase = ph; }
    let s = 0;
    for (let k = 0; k < STEPS.length; k++) if (p >= STEPS[k]) s = k;
    if (s !== step) {
      step = s;
      window.dispatchEvent(new CustomEvent('hero:step', { detail: { step: s, phase: ph } }));
    }
  };

  const tick = () => {
    const r = hero.getBoundingClientRect();
    const range = r.height - window.innerHeight;
    const p = Math.min(1, Math.max(0, -r.top / range));
    target = p * (FRAMES - 1);
    current += (target - current) * 0.22;     // небольшая инерция, без дрожи
    if (Math.abs(target - current) < 0.01) current = target;
    const idx = Math.round(current * 20) / 20;
    if (idx !== lastDrawn || Math.abs(p - lastP) > 0.002) {
      draw(current); lastDrawn = idx; lastP = p;
    }
    setPhase(p);
    requestAnimationFrame(tick);
  };

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(tick);
}
