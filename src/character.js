import gsap from 'gsap';

// Фирменный персонаж — «Арчи»: арка-хозяин пространства.
// Лицо — арочное окно с видом на Библиотеку, на груди латунная брошь-логотип.
export function characterSVG() {
  const id = 'c' + Math.random().toString(36).slice(2, 7);
  return `
<svg class="character" viewBox="0 0 320 470" role="img"
     aria-label="Арчи — фирменный персонаж АРКА 123: арка с лицом-окном и брошью-логотипом"
     xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#9fc0dd"/>
      <stop offset="1" stop-color="#f5e6cc"/>
    </linearGradient>
    <linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#d7a95c"/>
      <stop offset="1" stop-color="#8f6a2c"/>
    </linearGradient>
    <clipPath id="${id}w"><path d="M104 318V196a56 56 0 0 1 112 0V318z"/></clipPath>
  </defs>

  <ellipse class="ch-shadow" cx="160" cy="448" rx="92" ry="11" fill="#000" opacity=".18"/>

  <g class="ch-body">
    <!-- ноги-колонны -->
    <rect x="108" y="372" width="34" height="62" rx="4" fill="#3a3b3f"/>
    <rect x="178" y="372" width="34" height="62" rx="4" fill="#3a3b3f"/>
    <rect x="100" y="426" width="50" height="14" rx="7" fill="url(#${id}b)"/>
    <rect x="170" y="426" width="50" height="14" rx="7" fill="url(#${id}b)"/>

    <!-- левая рука (показывает на гостя) -->
    <g class="ch-arm-l">
      <path d="M72 250 C46 268 40 300 52 330" fill="none" stroke="#2a2b2e" stroke-width="20" stroke-linecap="round"/>
      <circle cx="52" cy="336" r="14" fill="#f5f0e7" stroke="#2a2b2e" stroke-width="3"/>
    </g>

    <!-- корпус-арка -->
    <path d="M62 384V196a98 98 0 0 1 196 0V384z" fill="#2a2b2e"/>
    <path d="M62 384V196a98 98 0 0 1 196 0V384z" fill="none" stroke="#b8893f" stroke-width="3"/>

    <!-- лицо-окно -->
    <path d="M104 318V196a56 56 0 0 1 112 0V318z" fill="url(#${id}s)"/>
    <g clip-path="url(#${id}w)">
      <!-- Национальная библиотека: граненый «ромбокубооктаэдр» -->
      <g class="ch-library" transform="translate(160 292)">
        <polygon points="-34,0 -22,-22 22,-22 34,0 22,22 -22,22" fill="#d9e4ee" stroke="#7d93a8" stroke-width="1.5"/>
        <polygon points="-22,-22 0,-34 22,-22" fill="#eef4f9" stroke="#7d93a8" stroke-width="1.5"/>
        <path d="M-22 -22V22M22 -22V22M-34 0H34" stroke="#7d93a8" stroke-width="1.2"/>
      </g>
      <ellipse class="ch-cloud" cx="140" cy="168" rx="20" ry="6" fill="#fff" opacity=".85"/>
      <ellipse class="ch-cloud2" cx="186" cy="150" rx="14" ry="5" fill="#fff" opacity=".8"/>
    </g>
    <path d="M104 318V196a56 56 0 0 1 112 0V318z" fill="none" stroke="#f5f0e7" stroke-width="3"/>

    <!-- глаза и улыбка -->
    <g class="ch-eyes" fill="#2a2b2e">
      <ellipse class="ch-eye" cx="140" cy="226" rx="6" ry="8"/>
      <ellipse class="ch-eye" cx="180" cy="226" rx="6" ry="8"/>
    </g>
    <path d="M142 250 Q160 266 178 250" fill="none" stroke="#2a2b2e" stroke-width="4" stroke-linecap="round"/>
    <circle cx="124" cy="246" r="7" fill="#e79c8a" opacity=".55"/>
    <circle cx="196" cy="246" r="7" fill="#e79c8a" opacity=".55"/>

    <!-- брошь-логотип -->
    <g class="ch-brooch" transform="translate(160 346)">
      <circle r="18" fill="url(#${id}b)" stroke="#f5f0e7" stroke-width="2"/>
      <path d="M-8 9V-2a8 8 0 0 1 16 0V9" fill="none" stroke="#2a2b2e" stroke-width="2.4"/>
    </g>

    <!-- правая рука (машет) -->
    <g class="ch-arm-r">
      <path d="M248 250 C276 238 288 208 280 178" fill="none" stroke="#2a2b2e" stroke-width="20" stroke-linecap="round"/>
      <circle cx="279" cy="168" r="14" fill="#f5f0e7" stroke="#2a2b2e" stroke-width="3"/>
    </g>
  </g>
</svg>`;
}

// Живые мелочи: дыхание, моргание, приветственный взмах, плывущие облака.
export function animateCharacter(svg) {
  const body = svg.querySelector('.ch-body');
  const eyes = svg.querySelectorAll('.ch-eye');
  const armR = svg.querySelector('.ch-arm-r');
  const armL = svg.querySelector('.ch-arm-l');
  const brooch = svg.querySelector('.ch-brooch');

  gsap.set(armR, { transformOrigin: '248px 250px' });
  gsap.set(armL, { transformOrigin: '72px 250px' });
  gsap.set(eyes, { transformOrigin: '50% 50%' });

  gsap.to(body, { y: -6, duration: 1.8, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  gsap.to(armR, { rotation: 14, duration: 0.45, ease: 'sine.inOut', yoyo: true, repeat: -1, repeatDelay: 2.2 });
  gsap.to(armL, { rotation: -4, duration: 1.8, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  gsap.to(svg.querySelector('.ch-cloud'), { x: 18, duration: 6, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  gsap.to(svg.querySelector('.ch-cloud2'), { x: -14, duration: 8, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  gsap.to(eyes, { scaleY: 0.08, duration: 0.09, yoyo: true, repeat: -1, repeatDelay: 3.4 });
  gsap.to(brooch, { scale: 1.08, transformOrigin: '50% 50%', duration: 1.2, ease: 'sine.inOut', yoyo: true, repeat: -1 });
}
