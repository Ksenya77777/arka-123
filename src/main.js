import gsap from 'gsap';
import './style.css';
import { logoSVG, logoTimeline, attachHover } from './logo.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function mountLogos() {
  document.getElementById('loader-logo').innerHTML = logoSVG('logo--loader');
  document.getElementById('header-logo').innerHTML = logoSVG('logo--header');
  document.getElementById('hero-logo').innerHTML = logoSVG('logo--hero');
  // на ховер перезапускается быстрая версия анимации
  document.querySelectorAll('#header-logo .logo, #hero-logo .logo').forEach(attachHover);
}

function runLoader() {
  const loader = document.getElementById('loader');
  const svg = loader.querySelector('.logo');
  const slogan = loader.querySelector('.loader-slogan');
  // стартовое состояние героя (скрыт) задаётся заранее, чтобы он не мигал под лоадером
  const heroTl = logoTimeline(document.querySelector('#hero-logo .logo'));
  const finish = () => {
    loader.classList.add('is-done');
    gsap.to(loader, {
      clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'power3.inOut',
      onComplete: () => loader.remove(),
    });
    // герой «включается» после ухода лоадера
    heroTl.play(0);
  };
  if (reduceMotion) {
    gsap.set(svg.querySelectorAll('*'), { clearProps: 'all' });
    return finish();
  }
  // у героя и шапки стартовое состояние «нарисовано», чтобы они не мигали пустыми
  const tl = logoTimeline(svg);
  tl.to(slogan, { opacity: 1, duration: 0.6 }, '-=0.5').to({}, { duration: 0.5 });
  tl.eventCallback('onComplete', finish);
  tl.play(0);
}

mountLogos();
runLoader();

const header = document.getElementById('header');
const onScroll = () => header.classList.toggle('is-solid', window.scrollY > 40);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();
