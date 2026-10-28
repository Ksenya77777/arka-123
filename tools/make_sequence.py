"""Собирает последовательность кадров «пролёт камеры» из реальных фото зала.

Это замена видео из нейросети: виртуальная камера плавно наезжает на фото, между фото идёт
переход «сквозь» (наезд + размытие + растворение). Результат перематывается скроллом (src/scrub.js).
Если у вас есть настоящее видео, замените папки public/seq/h и public/seq/v своими кадрами
(команды в docs/hero-scroll-video.md).

Запуск:  uv run --with pillow --with numpy python tools/make_sequence.py
"""
import math, os, sys
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PH = os.path.join(ROOT, 'public', 'photos')
N = 120  # кадров

def ease(t):  # плавный старт и финиш
    return 0.5 - 0.5 * math.cos(math.pi * max(0.0, min(1.0, t)))

def lerp(a, b, t):
    return a + (b - a) * t

# (файл, z0, c0, z1, c1): z — наезд (1 = весь кадр), c — центр кадра (x, y) в долях исходника
SEQ = {
    'h': {  # 16:9
        'size': (1280, 720),
        'shots': [
            ('p16', 1.00, (0.50, 0.50), 1.45, (0.60, 0.52), 0, 38),    # фасад дома, наезд на арочные окна
            ('p06', 1.00, (0.50, 0.55), 1.35, (0.62, 0.45), 26, 68),   # зал с арочными окнами
            ('p04', 1.00, (0.50, 0.80), 1.15, (0.50, 0.32), 56, 98),   # наклон камеры вверх: пол, окна, потолок
            ('p07', 1.00, (0.50, 0.80), 1.10, (0.50, 0.40), 86, 119),  # арочное окно: вид на Национальную библиотеку
        ],
    },
    'v': {  # 9:16
        'size': (720, 1280),
        'shots': [
            ('p18', 1.00, (0.50, 0.70), 1.35, (0.45, 0.50), 0, 38),
            ('p10', 1.00, (0.50, 0.70), 1.30, (0.50, 0.40), 26, 68),
            ('p04', 1.00, (0.50, 0.75), 1.35, (0.50, 0.35), 56, 98),
            ('p07', 1.00, (0.50, 0.72), 1.30, (0.45, 0.42), 86, 119),
        ],
    },
}

_cache = {}
def load(name):
    if name not in _cache:
        _cache[name] = Image.open(os.path.join(PH, name + '.webp')).convert('RGB')
    return _cache[name]

def render(shot, i, size, extra_zoom=1.0):
    name, z0, c0, z1, c1, s, e = shot
    u = ease((i - s) / (e - s))
    z = lerp(z0, z1, u) * extra_zoom
    cx, cy = lerp(c0[0], c1[0], u), lerp(c0[1], c1[1], u)
    src = load(name); W, H = src.size; ow, oh = size
    base_w = min(W, H * ow / oh)
    cw = base_w / z; ch = cw * oh / ow
    x0 = min(max(cx * W - cw / 2, 0), W - cw); y0 = min(max(cy * H - ch / 2, 0), H - ch)
    return src.resize(size, Image.LANCZOS, box=(x0, y0, x0 + cw, y0 + ch))

def frame(kind, i):
    cfg = SEQ[kind]; size = cfg['size']; shots = cfg['shots']
    active = [s for s in shots if s[5] <= i <= s[6]]
    if len(active) == 1:
        return render(active[0], i, size)
    a, b = active[0], active[1]
    t = (i - b[5]) / (a[6] - b[5])           # прогресс перехода 0..1
    te = ease(t)
    A = render(a, i, size, 1 + 0.55 * te)    # уходящий кадр продолжает наезд
    B = render(b, i, size, 1 + 0.45 * (1 - te))  # входящий «приезжает» из наезда
    blur = 6 * math.sin(math.pi * t)
    if blur > 0.3:
        A = A.filter(ImageFilter.GaussianBlur(blur)); B = B.filter(ImageFilter.GaussianBlur(blur))
    return Image.blend(A, B, ease(t))

def main():
    for kind in SEQ:
        out = os.path.join(ROOT, 'public', 'seq', kind)
        os.makedirs(out, exist_ok=True)
        total = 0
        for i in range(N):
            im = frame(kind, i)
            p = os.path.join(out, f'{i + 1:04d}.webp')
            im.save(p, 'webp', quality=70, method=4)
            total += os.path.getsize(p)
        print(kind, N, 'кадров,', total // 1024, 'КБ')

if __name__ == '__main__':
    main()
