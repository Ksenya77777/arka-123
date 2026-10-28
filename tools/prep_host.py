"""Вырезанные PNG персонажа (rembg) -> WebP с прозрачностью для сайта.
Запуск: uv run --with pillow python tools/prep_host.py <папка с png>"""
import sys
from PIL import Image, ImageFilter

SRC = sys.argv[1]
POSES = {'idle': 'host-01-seated', 'wave': 'host-02-wave', 'point': 'host-03-point', 'rest': 'host-04-arms'}
W = 560
for pose, name in POSES.items():
    im = Image.open(f'{SRC}/{name}.png').convert('RGBA')
    r, g, b, a = im.split()
    a = a.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))  # убираем светлую кайму
    im = Image.merge('RGBA', (r, g, b, a))
    im = im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)
    im.save(f'public/host/{pose}.webp', 'WEBP', quality=82, method=6)
    print(pose, im.size)
