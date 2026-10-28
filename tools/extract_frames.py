"""Нарезает видео на кадры для героя (src/scrub.js).

Запуск:  uv run --with opencv-python-headless --with pillow python tools/extract_frames.py video.mp4
Кадры попадают в public/seq/h как 0001.webp, 0002.webp ... Число кадров нужно указать в FRAMES (src/scrub.js).
"""
import os, sys, cv2
from PIL import Image

CROP_BOTTOM = 0.11  # водяной знак Dreamina стоит в нижних ~10% кадра: срезаем их
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = os.path.join(ROOT, 'public', 'seq', 'h')
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
    fr = fr[: int(fr.shape[0] * (1 - CROP_BOTTOM))]
    im = Image.fromarray(cv2.cvtColor(fr, cv2.COLOR_BGR2RGB))
    im.thumbnail((1280, 1280))
    p = os.path.join(out, f'{i:04d}.webp')
    im.save(p, 'webp', quality=74, method=4)
    total += os.path.getsize(p)
print(i, 'кадров,', total // 1024, 'КБ')
