import gsap from 'gsap';
import { ICON, WORD } from './brand-paths.js';

// Логотип АРКА 123 заказчика (материалы из ТЗ), векторизован в SVG.
// Состав: знак (арка с «1», цифры «2» и «3») + слово «АРКА 123» + слоган.
// Знак и слово лежат в двух SVG, чтобы один таймлайн GSAP анимировал части по очереди.
export function logoSVG({ slogan = false, cls = '' } = {}) {
  const letters = WORD.letters.map((d) => `<path class="lw" d="${d}" fill="currentColor" fill-rule="evenodd"/>`).join('');
  return `
<span class="logo ${cls}" role="img" aria-label="АРКА 123${slogan ? '. Встречаемся напротив Библиотеки' : ''}">
  <svg class="logo-icon" viewBox="${ICON.viewBox}" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
    <path class="li-arch" d="${ICON.arch}" fill="currentColor" fill-rule="evenodd"/>
    <path class="li-2" d="${ICON.two}" fill="currentColor"/>
    <path class="li-3" d="${ICON.three}" fill="currentColor"/>
  </svg>
  <span class="logo-text">
    <svg class="logo-word" viewBox="${WORD.viewBox}" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${letters}</svg>
    ${slogan ? '<span class="logo-slogan" aria-hidden="true">Встречаемся напротив Библиотеки.</span>' : ''}
  </span>
</span>`;
}

// Таймлайн анимации. speed > 1 — быстрый вариант для ховера.
export function logoTimeline(root, { speed = 1 } = {}) {
  const arch = root.querySelector('.li-arch');
  const two = root.querySelector('.li-2');
  const three = root.querySelector('.li-3');
  const letters = root.querySelectorAll('.lw');
  const slogan = root.querySelector('.logo-slogan');

  // состояние до старта
  gsap.set(arch, { clipPath: 'inset(100% 0% 0% 0%)' });
  gsap.set([two, three], { opacity: 0, y: 70, scale: 0.8, transformOrigin: '50% 100%' });
  gsap.set(letters, { opacity: 0, y: 40 });
  if (slogan) gsap.set(slogan, { opacity: 0, y: 8 });

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, paused: true });
  // 1. арка «вырастает» снизу вверх вместе с единицей, как здание
  tl.to(arch, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.0, ease: 'power2.inOut' })
    // 2. цифры 2 и 3 «заезжают» внутрь арки: «123» собирается по порядку
    .to([two, three], { opacity: 1, y: 0, scale: 1, duration: 0.55, stagger: 0.2, ease: 'back.out(1.7)' }, '-=0.25')
    // 3. слово АРКА 123 набирается по буквам
    .to(letters, { opacity: 1, y: 0, duration: 0.45, stagger: 0.07 }, '-=0.25');
  if (slogan) tl.to(slogan, { opacity: 1, y: 0, duration: 0.6 }, '-=0.1');
  // 4. финальный «пульс» знака, как вспышка света в окне
  tl.fromTo(root.querySelector('.logo-icon'), { scale: 1 }, {
    scale: 1.045, duration: 0.25, yoyo: true, repeat: 1, ease: 'sine.inOut', transformOrigin: '50% 60%',
  }, '-=0.2');
  tl.timeScale(speed);
  return tl;
}

// Ховер: быстрая версия, повторное наведение не перезапускает идущую анимацию.
export function attachHover(root) {
  let tl = null;
  root.addEventListener('mouseenter', () => {
    if (tl && tl.isActive()) return;
    tl?.kill();
    tl = logoTimeline(root, { speed: 2.4 });
    tl.play(0);
  });
}
