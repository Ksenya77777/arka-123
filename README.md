# АРКА 123

Демонстрационный сайт «под ключ» для вымышленного пространства под мастер-классы и семинары.
Слоган: «Встречаемся напротив Библиотеки». Тестовое задание на позицию вайбкодера.

## Запуск

Нужен Node.js 20.19+ (проверено на 24).

```bash
npm install
npm run dev      # разработка, http://localhost:5173
npm run build    # сборка в dist/
npm run preview  # просмотр собранной версии
```

## Что внутри

| Часть ТЗ | Где | Описание |
|----------|-----|----------|
| 1. Анимация логотипа | `src/logo.js`, `src/brand-paths.js`, `docs/logo-animation.md` | Логотип заказчика, векторизованный в SVG, + GSAP. Лоадер и анимация на ховере |
| 2. Фирменный персонаж | `src/character.js`, `docs/character.md` | Арчи, арка с лицом-окном, SVG |
| 3. Помещение в 3D | `src/room3d.js` | Three.js: сценарии, время суток, вид сверху; материалы по фото зала |
| 4. Герой бренда | `src/scrub.js`, `src/scene.js`, `tools/make_sequence.py`, `docs/hero-scroll-video.md` | Пролёт камеры по залу, перематываемый скроллом (canvas), Арчи ведёт экскурсию |
| 5. Готовый сайт | `index.html`, `src/style.css`, `src/main.js` | Лоадер, шапка, 8 блоков, реальные фото, лайтбокс, подвал, адаптив |

Отчёт с указанием времени, нейросетей и ограничений: [REPORT.md](REPORT.md).
План работ: [PLAN.md](PLAN.md).

## Технологии

Vite, ванильные JS/HTML/CSS, GSAP (+ ScrollTrigger), Three.js. Без UI-фреймворков. Шрифт Manrope. Фото из материалов задания оптимизированы в WebP (`public/photos`).

## Публикация

Workflow `.github/workflows/deploy.yml` собирает сайт и публикует на GitHub Pages.
Один раз включите в репозитории: **Settings → Pages → Source: GitHub Actions**.
