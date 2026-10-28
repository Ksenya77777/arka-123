"""Вырезанные PNG персонажа (rembg) -> WebP с прозрачностью для сайта.
Запуск: uv run --with pillow python tools/prep_host.py <папка с png>"""
import sys
from PIL import Image, ImageFilter

SRC = sys.argv[1]
POSES = ['idle', 'wave', 'point', 'rest']  # имена PNG в папке = имена поз
W = 560
for pose in POSES:
    name = pose
    im = Image.open(f'{SRC}/{name}.png').convert('RGBA')
    r, g, b, a = im.split()
    a = a.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))  # убираем светлую кайму
    im = Image.merge('RGBA', (r, g, b, a))
    im = im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)
    im.save(f'public/host/{pose}.webp', 'WEBP', quality=82, method=6)
    print(pose, im.size)
