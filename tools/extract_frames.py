"""Нарезает видео на кадры для героя (src/scrub.js).

Запуск:  uv run --with opencv-python-headless --with pillow python tools/extract_frames.py video.mp4 [h|v]
h (по умолчанию): горизонтальное видео, кадры в public/seq/h, водяной знак Dreamina срезается снизу.
v: вертикальное видео 9:16, кадры в public/seq/v, водяной знак срезается сверху.
Кадры называются 0001.webp, 0002.webp ... Число кадров нужно указать в FRAMES (src/scrub.js).
"""
import os, sys, cv2
from PIL import Image

KIND = sys.argv[2] if len(sys.argv) > 2 else 'h'
# водяной знак сервиса: Dreamina снизу (~10%), DeeVid сверху справа (~6%): срезаем полосу целиком
CROP_TOP, CROP_BOTTOM = (0.07, 0.0) if KIND == 'v' else (0.0, 0.11)
MAXSIDE = 1280
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = os.path.join(ROOT, 'public', 'seq', KIND)
os.makedirs(out, exist_ok=True)
for f in os.listdir(out):
    if f.endswith('.webp'):
        os.remove(os.path.join(out, f))
v = cv2.VideoCapture(sys.argv[1])
i = 0; total = 0
while True:
    ok, fr = v.read()
    if not ok:
        break
    i += 1
    h = fr.shape[0]
    fr = fr[int(h * CROP_TOP): int(h * (1 - CROP_BOTTOM))]
    im = Image.fromarray(cv2.cvtColor(fr, cv2.COLOR_BGR2RGB))
    im.thumbnail((MAXSIDE, MAXSIDE))
    p = os.path.join(out, f'{i:04d}.webp')
    im.save(p, 'webp', quality=74, method=4)
    total += os.path.getsize(p)
print(i, 'кадров,', total // 1024, 'КБ')
