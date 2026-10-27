import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { characterSVG, animateCharacter } from './character.js';
import { views } from './layouts.js';

gsap.registerPlugin(ScrollTrigger);

// Задание №4: «герой бренда» не отдельное видео, а анимация, встроенная в сайт.
// Фон управляется скроллом: небо идёт от утра к вечеру, арка «проезжает» мимо
// камеры, Арчи перемещается по странице и реагирует на блоки.
export function initScrollScene() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sky = document.getElementById('scene-sky');
  const arch = document.getElementById('scene-arch');
  const lib = document.getElementById('scene-library');
  const host = document.getElementById('scene-character');

  // силуэт Национальной библиотеки (граненый многогранник), без неба и земли
  lib.innerHTML = `<svg viewBox="-64 -66 128 132" xmlns="http://www.w3.org/2000/svg">
    <polygon points="-60,0 -38,-40 38,-40 60,0 38,40 -38,40" fill="#d9e4ee" stroke="#7d93a8" stroke-width="2"/>
    <polygon points="-38,-40 0,-62 38,-40" fill="#eef4f9" stroke="#7d93a8" stroke-width="2"/>
    <path d="M-38 -40V40M38 -40V40M-60 0H60" stroke="#7d93a8" stroke-width="1.6"/></svg>`;
  host.innerHTML = characterSVG();
  const ch = host.querySelector('svg');
  if (!reduce) animateCharacter(ch);

  if (reduce) {
    gsap.set(host, { opacity: 1 });
    return;
  }

  // небо: утро → день → вечер на всём протяжении страницы
  gsap.timeline({
    scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.6 },
  })
    .to(sky, { '--a': '#7fb2e5', '--b': '#eaf3fb', ease: 'none' })
    .to(sky, { '--a': '#d9a47a', '--b': '#f6d6a8', ease: 'none' })
    .to(sky, { '--a': '#4f5f95', '--b': '#f2a36a', ease: 'none' });

  // герой: арка растёт, как будто мы проходим сквозь неё
  gsap.timeline({
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  })
    .fromTo(arch, { scale: 1, opacity: 0 }, { scale: 3, opacity: 0.5, ease: 'none', duration: 1 })
    .to(arch, { scale: 9, opacity: 0, ease: 'power1.in', duration: 1.4 });
  gsap.fromTo(lib, { y: 0 }, {
    y: -120, ease: 'none',
    scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: true },
  });

  // Арчи: появляется после героя и меняет позицию в каждом блоке
  gsap.set(host, { opacity: 0, x: 140 });
  const stops = [
    { id: '#about',    x: 0,    y: 0,    rotate: 0,  scale: 1 },
    { id: '#space',    x: -20,  y: -30,  rotate: -5, scale: 1.1 },
    { id: '#services', x: 0,    y: 0,    rotate: 3,  scale: 0.95 },
    { id: '#prices',   x: -10,  y: -20,  rotate: -3, scale: 1 },
    { id: '#gallery',  x: 0,    y: 0,    rotate: 4,  scale: 0.95 },
    { id: '#reviews',  x: -16,  y: -10,  rotate: -4, scale: 1 },
    { id: '#booking',  x: 0,    y: -20,  rotate: 0,  scale: 1.12 },
  ];
  const tl = gsap.timeline({
    scrollTrigger: { trigger: '#about', endTrigger: '#booking', start: 'top 80%', end: 'bottom bottom', scrub: 0.8 },
  });
  tl.fromTo(host, { opacity: 0, x: 140 }, { opacity: 1, x: 0, duration: 0.6 });
  stops.forEach((s, i) => {
    tl.to(host, { x: s.x, y: s.y, rotation: s.rotate, scale: s.scale, duration: 1, ease: 'sine.inOut' }, i === 0 ? '>' : '>');
  });
  // в начале страницы персонажа нет, в героя он не заходит
  ScrollTrigger.create({
    trigger: '.hero', start: 'bottom 60%', onEnterBack: () => gsap.to(host, { opacity: 0, duration: 0.3, overwrite: 'auto' }),
  });

  // мягкое появление контента блоков
  gsap.utils.toArray('.section > .wrap > *').forEach((el) => {
    el.classList.add('reveal');
    gsap.to(el, {
      opacity: 1, y: 0, duration: 0.8, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });
}
