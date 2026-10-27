import gsap from 'gsap';
import './style.css';
import { logoSVG, logoTimeline, attachHover } from './logo.js';
import { layouts, views } from './layouts.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function mountLogos() {
  document.getElementById('loader-logo').innerHTML = logoSVG('logo--loader');
  document.getElementById('header-logo').innerHTML = logoSVG('logo--header');
  document.getElementById('hero-logo').innerHTML = logoSVG('logo--hero');
  document.getElementById('footer-logo').innerHTML = logoSVG('logo--footer');
  // на ховер перезапускается быстрая версия анимации
  document.querySelectorAll('#header-logo .logo, #hero-logo .logo, #footer-logo .logo').forEach(attachHover);
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
    heroTl.play(0);
  };
  if (reduceMotion) {
    heroTl.progress(1);
    loader.remove();
    return;
  }
  const tl = logoTimeline(svg);
  tl.to(slogan, { opacity: 1, duration: 0.6 }, '-=0.5').to({}, { duration: 0.5 });
  tl.eventCallback('onComplete', finish);
  tl.play(0);
}

function mountGallery() {
  const items = [
    ...Object.values(layouts).map((l) => ({ title: l.title, note: l.note, svg: l.svg() })),
    { title: 'Вид на Библиотеку', note: 'Арочное окно, 4×3,5 м', svg: views.library() },
    { title: 'Арка', note: 'Фирменная форма здания и логотипа', svg: views.arch() },
  ];
  document.getElementById('gallery-grid').innerHTML = items.map((i) => `
    <figure class="shot">${i.svg}<figcaption><b>${i.title}</b><span>${i.note}</span></figcaption></figure>`).join('');
}

function initBooking() {
  const form = document.getElementById('booking-form');
  const msg = document.getElementById('form-msg');
  const select = document.getElementById('tariff-select');
  const date = form.elements.date;
  date.min = new Date().toISOString().slice(0, 10);

  document.querySelectorAll('[data-tariff]').forEach((a) => a.addEventListener('click', () => {
    select.value = a.dataset.tariff;
  }));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let ok = true;
    for (const f of ['name', 'phone', 'date']) {
      const el = form.elements[f];
      const bad = !el.value.trim() || (f === 'phone' && el.value.replace(/\D/g, '').length < 9);
      el.setAttribute('aria-invalid', bad);
      if (bad) ok = false;
    }
    msg.textContent = ok
      ? 'Спасибо! Это демонстрационная форма: заявка никуда не отправляется.'
      : 'Проверьте имя, телефон (не менее 9 цифр) и дату.';
    if (ok) form.reset();
  });
}

mountLogos();
runLoader();
mountGallery();
initBooking();

const header = document.getElementById('header');
const onScroll = () => header.classList.toggle('is-solid', window.scrollY > 40);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Тяжёлые модули (Three.js, ScrollTrigger) грузятся отдельным чанком после лоадера
import('./scene.js').then((m) => m.initScrollScene());

const roomBox = document.getElementById('room-canvas');
import('./room3d.js').then(({ createRoom }) => {
  let room;
  try {
    room = createRoom(roomBox);
  } catch (err) {
    roomBox.innerHTML = '<p class="room-fallback" style="padding:2rem;color:#fff">Не удалось запустить 3D (WebGL недоступен). Планировки смотрите в галерее.</p>';
    return;
  }
  const bind = (attr, fn) => {
    const btns = document.querySelectorAll(`[data-${attr}]`);
    btns.forEach((b) => b.setAttribute('aria-pressed', b.classList.contains('is-on')));
    btns.forEach((b) => b.addEventListener('click', () => {
      btns.forEach((x) => {
        x.classList.toggle('is-on', x === b);
        x.setAttribute('aria-pressed', x === b);
      });
      fn(b.dataset[attr]);
      document.getElementById('room-hint')?.classList.add('is-hidden');
    }));
  };
  bind('scenario', room.setScenario);
  bind('time', room.setTime);
  bind('view', room.setView);
  roomBox.addEventListener('pointerdown', () => document.getElementById('room-hint')?.classList.add('is-hidden'), { once: true });
});
