import gsap from 'gsap';
import './style.css';
import { logoSVG, logoTimeline, attachHover } from './logo.js';
import { layouts } from './layouts.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function mountLogos() {
  document.getElementById('loader-logo').innerHTML = logoSVG({ slogan: true, cls: 'logo--loader' });
  document.getElementById('header-logo').innerHTML = logoSVG({ cls: 'logo--header' });
  document.getElementById('footer-logo').innerHTML = logoSVG({ slogan: true, cls: 'logo--footer' });
}

// на ховер перезапускается быстрая версия анимации; включаем после лоадера,
// чтобы два таймлайна не боролись за одни элементы
function enableHover() {
  if (reduceMotion) return;
  document.querySelectorAll('#header-logo .logo, #footer-logo .logo').forEach(attachHover);
}

function runLoader() {
  const loader = document.getElementById('loader');
  const logo = loader.querySelector('.logo');
  if (reduceMotion) {
    loader.remove();
    return;
  }
  const tl = logoTimeline(logo);
  tl.to({}, { duration: 0.6 });
  tl.eventCallback('onComplete', () => {
    loader.classList.add('is-done');
    gsap.to(loader, {
      clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'power3.inOut',
      onComplete: () => { loader.remove(); enableHover(); },
    });
  });
  tl.play(0);
}

// Фото из материалов задания (обработанные), подписи и размеры карточек
const PHOTOS = [
  { id: 'p06', title: 'Зал: арочные окна и паркет «ёлочка»', cls: 'shot--wide' },
  { id: 'p07', title: 'Из окна видна Национальная библиотека', cls: 'shot--tall' },
  { id: 'p04', title: 'Зал со стороны входа' },
  { id: 'p05', title: 'Арочные окна 4×3,5 м' },
  { id: 'p02', title: 'Потолки до 4,5 метров', cls: 'shot--wide' },
  { id: 'p11', title: 'Ресепшен-стойка', cls: 'shot--tall' },
  { id: 'p08', title: 'Вид на променад' },
  { id: 'p09', title: 'Окно на парковую зону' },
  { id: 'p12', title: 'Стеклянные перегородки', cls: 'shot--wide' },
  { id: 'p03', title: 'Из чего сделан ремонт' },
  { id: 'p16', title: 'Фасад: арочные окна дома', cls: 'shot--wide' },
  { id: 'p18', title: 'Вход со стороны променада' },
];

// «до и после»: ретушь исходных фото (достроена обшивка графитом), ползунок открывает оригинал
const BA = [
  { before: 'b03', after: 'r03', title: 'Стена из блоков и столб: обшиты графитом до потолка' },
  { before: 'b01', after: 'r01', title: 'Бетонные столбы и светлая стена: обшиты графитом' },
];

function mountBeforeAfter() {
  const host = document.getElementById('ba-grid');
  if (!host) return;
  host.innerHTML = BA.map((b, i) => `
    <figure class="ba" style="--pos:50%">
      <img class="ba-img" src="./photos/${b.after}.webp" alt="После обработки: ${b.title}" loading="lazy">
      <img class="ba-img ba-before" src="./photos/${b.before}.webp" alt="До обработки" loading="lazy">
      <span class="ba-tag ba-tag--l">До</span><span class="ba-tag ba-tag--r">После</span>
      <span class="ba-line" aria-hidden="true"></span>
      <input class="ba-range" type="range" min="0" max="100" value="50" aria-label="Сравнить до и после: ${b.title}" data-i="${i}">
      <figcaption>${b.title}</figcaption>
    </figure>`).join('');
  host.addEventListener('input', (e) => {
    const r = e.target.closest('.ba-range');
    if (r) r.closest('.ba').style.setProperty('--pos', `${r.value}%`);
  });
}

function mountGallery() {
  const grid = document.getElementById('gallery-grid');
  grid.innerHTML = PHOTOS.map((p) => `
    <button class="shot ${p.cls ?? ''}" type="button" data-src="./photos/${p.id}.webp" data-cap="${p.title}">
      <img src="./photos/${p.id}.webp" alt="${p.title}" loading="lazy">
      <figcaption>${p.title}</figcaption>
    </button>`).join('');

  const box = document.getElementById('lightbox');
  const img = document.getElementById('lightbox-img');
  const cap = document.getElementById('lightbox-cap');
  grid.addEventListener('click', (e) => {
    const b = e.target.closest('.shot');
    if (!b) return;
    img.src = b.dataset.src;
    img.alt = b.dataset.cap;
    cap.textContent = b.dataset.cap;
    box.showModal();
  });
  document.getElementById('lightbox-close').addEventListener('click', () => box.close());
  box.addEventListener('click', (e) => { if (e.target === box) box.close(); });

  // планировки (иллюстрации сценариев расстановки)
  document.getElementById('plans-grid').innerHTML = Object.values(layouts).map((l) => `
    <figure class="plan">${l.svg()}<figcaption><b>${l.title}</b><span>${l.note}</span></figcaption></figure>`).join('');
}

function initBooking() {
  const form = document.getElementById('booking-form');
  const msg = document.getElementById('form-msg');
  const select = document.getElementById('tariff-select');
  const date = form.elements.date;
  // сегодняшняя дата по местному времени, а не по UTC
  const now = new Date();
  const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  date.min = today;

  document.querySelectorAll('[data-tariff]').forEach((a) => a.addEventListener('click', () => {
    select.value = a.dataset.tariff;
  }));

  const rules = {
    name: [(v) => v.trim().length > 0, 'Укажите имя'],
    phone: [(v) => v.replace(/\D/g, '').length >= 9, 'Телефон: не менее 9 цифр'],
    date: [(v) => v >= today && v !== '', 'Выберите сегодняшнюю или будущую дату'],
  };
  // у каждого поля свой текст ошибки, связанный через aria-describedby
  for (const f of Object.keys(rules)) {
    const el = form.elements[f];
    const err = document.createElement('span');
    err.className = 'field-err';
    err.id = `err-${f}`;
    el.after(err);
    el.setAttribute('aria-describedby', err.id);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let first = null;
    for (const [f, [valid, text]] of Object.entries(rules)) {
      const el = form.elements[f];
      const bad = !valid(el.value);
      el.setAttribute('aria-invalid', bad);
      document.getElementById(`err-${f}`).textContent = bad ? text : '';
      if (bad && !first) first = el;
    }
    if (first) {
      msg.textContent = '';
      first.focus();
      return;
    }
    msg.textContent = 'Спасибо! Это демонстрационная форма: заявка никуда не отправляется.';
    form.reset();
  });
}

function initMenu() {
  const burger = document.getElementById('burger');
  const nav = document.getElementById('nav');
  const set = (open) => {
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  };
  burger.addEventListener('click', () => set(!nav.classList.contains('is-open')));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
}

mountLogos();
runLoader();
mountGallery();
mountBeforeAfter();
initBooking();
initMenu();

const header = document.getElementById('header');
const onScroll = () => header.classList.toggle('is-solid', window.scrollY > 40);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Тяжёлые модули (Three.js, ScrollTrigger) грузятся отдельным чанком после лоадера
import('./scene.js').then((m) => m.initScrollScene());
import('./scrub.js').then((m) => m.initHeroScrub());

const roomBox = document.getElementById('room-canvas');

function roomFallback(text, err, step) {
  const detail = err ? `<br><small style="opacity:.6">Код: ${step}: ${String(err.message || err).slice(0, 120)}</small>` : '';
  roomBox.innerHTML = `<p class="room-fallback" style="padding:2rem;color:#fff">${text}${detail}</p>`;
  document.querySelector('.room-controls')?.setAttribute('hidden', '');
  document.getElementById('room-hint')?.setAttribute('hidden', '');
}

function startRoom() {
  let step = 'import';
  import('./room3d.js').then(({ createRoom }) => {
    step = 'webgl';
    let room;
    try {
      room = createRoom(roomBox);
    } catch (err) {
      roomBox.replaceChildren();
      return roomFallback('Не удалось запустить 3D (WebGL недоступен). Планировки смотрите в галерее.', err, 'webgl');
    }
    step = 'controls';
    const hint = document.getElementById('room-hint');
    const bind = (attr, fn) => {
      const btns = document.querySelectorAll(`[data-${attr}]`);
      btns.forEach((b) => b.setAttribute('aria-pressed', b.classList.contains('is-on')));
      btns.forEach((b) => b.addEventListener('click', () => {
        btns.forEach((x) => {
          x.classList.toggle('is-on', x === b);
          x.setAttribute('aria-pressed', x === b);
        });
        fn(b.dataset[attr]);
        hint?.classList.add('is-hidden');
      }));
    };
    bind('scenario', room.setScenario);
    bind('time', room.setTime);
    bind('view', room.setView);
    roomBox.addEventListener('pointerdown', () => hint?.classList.add('is-hidden'), { once: true });
  }).catch((err) => {
    // чанк не загрузился (обрыв связи или страница из кэша старой версии) или упала инициализация
    roomFallback('Не удалось загрузить 3D-модель. Проверьте соединение и попробуйте ещё раз.', err, step);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn--accent';
    btn.textContent = 'Обновить страницу';
    btn.addEventListener('click', () => location.reload());
    roomBox.querySelector('.room-fallback')?.append(document.createElement('br'), btn);
  });
}

// 3D-чанк (около 600 КБ) грузим только когда блок почти показался на экране
const roomWatcher = new IntersectionObserver(([e]) => {
  if (!e.isIntersecting) return;
  roomWatcher.disconnect();
  startRoom();
}, { rootMargin: '700px' });
roomWatcher.observe(document.getElementById('room-box'));
