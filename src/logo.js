import gsap from 'gsap';

// Логотип АРКА 123: арка здания, внутри цифры площади, под аркой название.
// Один и тот же SVG используется в лоадере, шапке, герое и подвале.
export function logoSVG(extraClass = '') {
  const id = 'g' + Math.random().toString(36).slice(2, 7);
  return `
<svg class="logo ${extraClass}" viewBox="0 0 240 350" role="img" aria-label="АРКА 123"
     xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="var(--sky-top)"/>
      <stop offset="1" stop-color="var(--sky-bottom)"/>
    </linearGradient>
    <clipPath id="${id}c">
      <path d="M62 290V124a58 58 0 0 1 116 0V290z"/>
    </clipPath>
  </defs>
  <g clip-path="url(#${id}c)">
    <rect class="logo-glass" x="62" y="60" width="116" height="230" fill="url(#${id})"/>
  </g>
  <path class="logo-arch" d="M30 290V120a90 90 0 0 1 180 0V290" fill="none"
        stroke="currentColor" stroke-width="6" stroke-linecap="square"/>
  <path class="logo-arch-in" d="M62 290V124a58 58 0 0 1 116 0V290" fill="none"
        stroke="currentColor" stroke-width="2"/>
  <g class="logo-digits" font-family="var(--font-display)" font-size="58" font-weight="600"
     fill="var(--graphite)" text-anchor="middle">
    <text class="d" x="88" y="222">1</text>
    <text class="d" x="120" y="222">2</text>
    <text class="d" x="152" y="222">3</text>
  </g>
  <g class="logo-word" font-family="var(--font-display)" font-size="30" font-weight="600"
     fill="currentColor" text-anchor="middle" letter-spacing="2">
    <text class="w" x="54" y="338">А</text>
    <text class="w" x="97" y="338">Р</text>
    <text class="w" x="143" y="338">К</text>
    <text class="w" x="186" y="338">А</text>
  </g>
</svg>`;
}

// Таймлайн анимации. speed > 1 — быстрый вариант для ховера.
export function logoTimeline(svg, { speed = 1 } = {}) {
  const arch = svg.querySelector('.logo-arch');
  const archIn = svg.querySelector('.logo-arch-in');
  const glass = svg.querySelector('.logo-glass');
  const digits = svg.querySelectorAll('.d');
  const letters = svg.querySelectorAll('.w');
  const len = arch.getTotalLength();
  const lenIn = archIn.getTotalLength();

  gsap.set(arch, { strokeDasharray: len, strokeDashoffset: len });
  gsap.set(archIn, { strokeDasharray: lenIn, strokeDashoffset: lenIn });
  gsap.set(glass, { transformOrigin: '50% 100%', scaleY: 0 });
  gsap.set(digits, { opacity: 0, y: 18 });
  gsap.set(letters, { opacity: 0, y: 14 });

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, paused: true });
  tl.to(arch, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut' })
    .to(archIn, { strokeDashoffset: 0, duration: 0.8, ease: 'power2.inOut' }, '-=0.6')
    // «свет из окна» поднимается снизу вверх
    .to(glass, { scaleY: 1, duration: 0.9, ease: 'power2.out' }, '-=0.5')
    // цифры 1 → 2 → 3, как этажи и как площадь помещения
    .to(digits, { opacity: 1, y: 0, duration: 0.45, stagger: 0.18 }, '-=0.4')
    .to(letters, { opacity: 1, y: 0, duration: 0.4, stagger: 0.1 }, '-=0.2')
    // финальный блик
    .fromTo(glass, { opacity: 0.55 }, { opacity: 1, duration: 0.6, ease: 'sine.inOut' }, '-=0.3');
  tl.timeScale(speed);
  return tl;
}

// Ховер: анимация перезапускается быстрее, без дёрганья при повторных наведениях.
export function attachHover(svg) {
  let tl = null;
  svg.addEventListener('mouseenter', () => {
    if (tl && tl.isActive()) return;
    tl?.kill();
    tl = logoTimeline(svg, { speed: 2.2 });
    tl.play(0);
  });
}
