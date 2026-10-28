# Задание №4. Герой бренда: «видео», которое перематывается скроллом

Идея из референсов (два рилса и документы с промптами): вместо автозапуска видео
кадры перематываются скроллом, как таймлайн в видеоредакторе. Прокрутка вниз двигает камеру вперёд,
вверх возвращает назад. Видео «выступает фоном сайта» и «запускается при скролле», как требует ТЗ.

## Как это устроено

- `index.html`: секция `.hero` высотой 520vh, внутри `sticky`-блок на весь экран с `<canvas id="cv">`.
- `src/scrub.js`: движок. Загружает кадры (сначала 1-й, затем каждый 8-й, 4-й, 2-й, остальные, 8 потоков),
  считает прогресс скролла `p`, плавно догоняет целевой кадр (`current += (target - current) * 0.22`),
  рисует на canvas с cover-подгонкой и смешивает соседние кадры, чтобы не было рывков.
  Ограничивает `devicePixelRatio` до 1,5.
- Правила видимости интерфейса: `p ≤ 0,06` всё видно, `0,06 < p < 0,93` текст скрыт (полёт),
  `p ≥ 0,93` появляется финальный блок с кнопкой. Это атрибут `data-phase` у `.hero` и CSS.
- Хозяйка (`src/host.js`, `src/scene.js`) ведёт экскурсию: в каждом из 5 шагов пролёта своя реплика и поза.
- `prefers-reduced-motion`: перемотки нет, показывается один кадр зала.

## Какие кадры сейчас

Сейчас в `public/seq/h` лежат 121 кадр, нарезанные из видео, которое создано в **Dreamina (Seedance 2.0 Mini, бесплатный тариф)**:
режим Omni reference, 16:9, 720p, 5 секунд. Первым кадром служит реальное фото фасада, последним реальное фото окна с видом на Национальную библиотеку
(из материалов задания; последний кадр вырезан из вертикального фото в 16:9). Видео-промпт описан ниже.
Результат: камера летит от фасада дома, входит в зал через дверь и подъезжает к окну с Библиотекой.

Важно:
- **Интерьер зала в середине видео нарисован нейросетью**, а не снят. Он похож на настоящий (паркет «ёлочка», арочные окна, тёмный потолок), но не точная копия. На сайте об этом есть пометка.
- **На кадрах водяной знак Dreamina AI** (бесплатный тариф). Он не удалялся.
- Для телефонов используются те же кадры. Canvas обрезает их рамкой, которая двигается за объектом по таблице `FOCUS` в `src/scrub.js` (фасад справа, дверь слева, зал, окно с Библиотекой).

Нарезка: `uv run --with opencv-python-headless --with pillow python tools/extract_frames.py video.mp4`.

**Запасной вариант без видео.** `tools/make_sequence.py` собирает кадры из реальных фото (виртуальная камера и переходы «сквозь»), без нейросети.
Он перезапишет `public/seq/h` и `public/seq/v`.

## Как заменить видео своим

1. Сгенерируйте ролик по промптам ниже (Kling, Seedance или другой генератор с первым и последним кадром).
2. Нарежьте кадры скриптом выше или командой ffmpeg:

```bash
mkdir -p public/seq/h
ffmpeg -i video.mp4 -vf "fps=12,scale=1280:-2" -q:v 3 -c:v libwebp public/seq/h/%04d.webp
# для телефонов: вертикальная версия 9:16
mkdir -p public/seq/v
ffmpeg -i video_vertical.mp4 -vf "fps=12,scale=720:-2" -q:v 3 -c:v libwebp public/seq/v/%04d.webp
```
3. Поменяйте `FRAMES` в `src/scrub.js` на число кадров.

## Промпты для генерации (по образцу из документа Balenciaga)

Загрузите в генератор реальные фото из материалов как референс (особенно фото с окном и видом на Библиотеку).

**Первый кадр (фасад):**
Ultra-realistic architectural photograph of a beige neoclassical building with large arched black-framed windows, ground-floor facade, pedestrian promenade in front, clear soft daylight, eye-level camera, wide shot, slight low angle, no people, no text, no logo, no watermark, natural colors, 4K.

**Последний кадр (вид из окна):**
Ultra-realistic interior photograph looking through a huge arched black-framed window with mullions, centered on the National Library of Belarus (a glass rhombicuboctahedron building) in the distance, bright daylight with soft clouds, herringbone oak parquet floor and a dark radiator under the window sill in the foreground, symmetrical centered composition, eye-level, no people, no text, 4K.

**Видео (10 секунд, 16:9, один непрерывный кадр):**
The first image is the first frame, the second image is the last frame. Slow cinematic FPV drone shot, one continuous take. The camera starts at the building facade, flies forward toward the arched windows and glides through the entrance into a bright hall with herringbone parquet, anthracite ceiling and linear LED lights. It continues across the hall past white wall panels, tilts up briefly to the ceiling lights, then moves toward the huge arched window and settles on the centered view of the National Library, matching the last frame. Smooth, slow, no cuts, no shake, soft daylight, nothing new appears, same architecture throughout.

**Вариант с героиней (путь №1 из ТЗ):** добавьте в зал девушку славянской внешности 30–35 лет в строгой тёмно-синей одежде
с эмалевой брошью в виде логотипа (арка с цифрами 123). Она стоит неподвижно у окна, камера облетает её и
заканчивает общим планом окна с видом на Библиотеку.

**Негативный промпт:** extra people, text, logo, watermark, warped architecture, distorted windows, blur, noise,
low detail, fisheye, oversaturated colors, night, rain.

## Идея сцен с видео-переходами (первый документ)

Из первого документа взята идея киношного перемещения «камера перелетает из сцены в сцену». Здесь она
реализована внутри героя: четыре «сцены» (фасад, зал, потолок, окно) соединены переходами «сквозь» на скролле.
Полноэкранные сцены по всему сайту с собственными видеопереходами не делались: это потребовало бы
отдельных сгенерированных видео на каждый переход.
