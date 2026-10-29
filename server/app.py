#!/usr/bin/env python3
"""Backend заявок АРКА 123: приём заявок, статусы, админка. Только стандартная библиотека Python.

Пути (nginx снимает префикс /meet-at-the-library/api/):
  POST   /requests            публичная заявка {name, phone, date, tariff}, в ответе код заявки
  GET    /status/<код>        публичный статус заявки по коду (без личных данных)
  POST   /admin/login         вход по паролю, выдаёт cookie
  POST   /admin/logout
  GET    /admin/requests      список заявок (нужна cookie)
  POST   /admin/requests/<id> смена статуса {status} (new, accepted, rejected, done)
  DELETE /admin/requests/<id> удаление заявки
  GET    /health

Настройки через переменные окружения (значения по умолчанию подходят для сервера):
  ARKA_DATA     папка с базой, хешем пароля и секретом
  ARKA_HOST / ARKA_PORT   где слушать (127.0.0.1:8123)
  ARKA_ORIGIN   разрешённые Origin для изменяющих запросов, через запятую (оба адреса сайта, с www и без)
  ARKA_KEEP_DAYS  сколько дней хранить заявки (30)
  ARKA_INSECURE_COOKIE=1  cookie без Secure (только для локальной проверки по http)
  ARKA_DEV_ROOT  папка со сборкой сайта: отдаётся по /meet-at-the-library/ (только для локальной проверки)
"""
import datetime as dt
import hashlib
import hmac
import json
import mimetypes
import os
import re
import secrets
import sqlite3
import threading
import time
from collections import defaultdict, deque
from http import cookies
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

BASE = os.path.dirname(os.path.abspath(__file__))
DATA = os.environ.get('ARKA_DATA', os.path.join(BASE, 'data'))
HOST = os.environ.get('ARKA_HOST', '127.0.0.1')
PORT = int(os.environ.get('ARKA_PORT', '8123'))
ORIGINS = set(os.environ.get('ARKA_ORIGIN', 'https://kseniya-developer.ru,https://www.kseniya-developer.ru').split(','))
KEEP_DAYS = int(os.environ.get('ARKA_KEEP_DAYS', '30'))
INSECURE = os.environ.get('ARKA_INSECURE_COOKIE') == '1'
DEV_ROOT = os.environ.get('ARKA_DEV_ROOT')
PREFIX = '/meet-at-the-library'
COOKIE = 'arka_admin'
SESSION_SECONDS = 12 * 3600

TARIFFS = {'Час', 'Полдня', 'Весь день'}
STATUSES = {'new', 'accepted', 'rejected', 'done'}
CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'  # без похожих символов (0/O, 1/I)

os.makedirs(DATA, mode=0o700, exist_ok=True)
DB = os.path.join(DATA, 'arka.db')
HASH_FILE = os.path.join(DATA, 'admin.hash')
SECRET_FILE = os.path.join(DATA, 'secret')


def secret_key():
    if not os.path.exists(SECRET_FILE):
        fd = os.open(SECRET_FILE, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'wb') as f:
            f.write(secrets.token_bytes(32))
    with open(SECRET_FILE, 'rb') as f:
        return f.read()


SECRET = secret_key()


def db():
    con = sqlite3.connect(DB, timeout=10)
    con.row_factory = sqlite3.Row
    return con


def init_db():
    with db() as con:
        con.execute("""CREATE TABLE IF NOT EXISTS requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL, phone TEXT NOT NULL, date TEXT NOT NULL, tariff TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'new',
            created INTEGER NOT NULL, updated INTEGER NOT NULL)""")


def purge_loop():
    while True:
        cutoff = int(time.time()) - KEEP_DAYS * 86400
        try:
            with db() as con:
                con.execute('DELETE FROM requests WHERE created < ?', (cutoff,))
        except sqlite3.Error:
            pass
        time.sleep(3600)


# ---------- пароль и сессии ----------
def hash_password(password, salt=None, algo=None):
    """Хеш вида «алгоритм$соль$хеш». Предпочтительно scrypt, если в Python он есть, иначе PBKDF2."""
    salt = salt or secrets.token_bytes(16)
    algo = algo or ('scrypt' if hasattr(hashlib, 'scrypt') else 'pbkdf2')
    if algo == 'scrypt':
        h = hashlib.scrypt(password.encode(), salt=salt, n=2 ** 14, r=8, p=1, dklen=32)
    else:
        h = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 600_000, dklen=32)
    return f'{algo}${salt.hex()}${h.hex()}'


def check_password(password):
    try:
        with open(HASH_FILE) as f:
            stored = f.read().strip()
        algo, salt_hex, _ = stored.split('$')
    except (OSError, ValueError):
        return None  # пароль ещё не задан
    return hmac.compare_digest(hash_password(password, bytes.fromhex(salt_hex), algo), stored)


def make_token():
    exp = str(int(time.time()) + SESSION_SECONDS)
    return exp + '.' + hmac.new(SECRET, exp.encode(), hashlib.sha256).hexdigest()


def valid_token(token):
    try:
        exp, sig = token.split('.')
        good = hmac.compare_digest(sig, hmac.new(SECRET, exp.encode(), hashlib.sha256).hexdigest())
        return good and int(exp) > time.time()
    except (ValueError, AttributeError):
        return False


# ---------- ограничение частоты ----------
_hits = defaultdict(deque)
_lock = threading.Lock()


def limited(key, limit, window):
    now = time.time()
    with _lock:
        q = _hits[key]
        while q and q[0] < now - window:
            q.popleft()
        if len(q) >= limit:
            return True
        q.append(now)
        return False


# ---------- проверка заявки ----------
def clean(text, limit):
    return re.sub(r'[\x00-\x1f\x7f]', ' ', str(text)).strip()[:limit]


def validate(d):
    name = clean(d.get('name', ''), 80)
    phone = clean(d.get('phone', ''), 24)
    date = clean(d.get('date', ''), 10)
    tariff = clean(d.get('tariff', ''), 20)
    errors = {}
    if not name:
        errors['name'] = 'Укажите имя'
    if len(re.sub(r'\D', '', phone)) < 9 or not re.fullmatch(r'[0-9+\-() ]+', phone):
        errors['phone'] = 'Телефон: не менее 9 цифр'
    try:
        day = dt.date.fromisoformat(date)
        today = dt.datetime.now(dt.timezone.utc).date()
        if not (today - dt.timedelta(days=1) <= day <= today + dt.timedelta(days=730)):
            raise ValueError
    except ValueError:
        errors['date'] = 'Выберите сегодняшнюю или будущую дату'
    if tariff not in TARIFFS:
        errors['tariff'] = 'Выберите тариф'
    return (name, phone, date, tariff), errors


def new_code(con):
    for _ in range(20):
        code = ''.join(secrets.choice(CODE_ALPHABET) for _ in range(6))
        if not con.execute('SELECT 1 FROM requests WHERE code = ?', (code,)).fetchone():
            return code
    raise RuntimeError('не удалось подобрать код')


def row_admin(r):
    return {k: r[k] for k in ('id', 'code', 'name', 'phone', 'date', 'tariff', 'status', 'created', 'updated')}


class Handler(BaseHTTPRequestHandler):
    server_version = 'arka'
    sys_version = ''
    protocol_version = 'HTTP/1.1'

    # без личных данных в логах: только метод, путь без кода и статус
    def log_message(self, fmt, *args):
        path = re.sub(r'/status/\w+', '/status/*', self.path.split('?')[0])
        print(f'{self.command} {path} -> {args[1] if len(args) > 1 else ""}', flush=True)

    def ip(self):
        if self.client_address[0] == '127.0.0.1':
            return self.headers.get('X-Real-IP', '127.0.0.1')
        return self.client_address[0]

    def send(self, code, payload=None, headers=None):
        body = b'' if payload is None else json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        for k, v in (headers or {}).items():
            self.send_header(k, v)
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(body)

    def json_body(self):
        try:
            n = int(self.headers.get('Content-Length', '0'))
            if n > 4096:
                return None
            data = json.loads(self.rfile.read(n) or b'{}')
            return data if isinstance(data, dict) else None
        except (ValueError, json.JSONDecodeError):
            return None

    def route(self):
        path = urlparse(self.path).path
        if path.startswith(PREFIX + '/api/'):
            path = path[len(PREFIX) + 4:]
        return path.rstrip('/') or '/'

    def is_admin(self):
        c = cookies.SimpleCookie(self.headers.get('Cookie', ''))
        return COOKIE in c and valid_token(c[COOKIE].value)

    def same_origin(self):
        # чужой сайт не может послать такой запрос: нужен свой заголовок и совпадающий Origin
        if self.headers.get('X-Requested-With') != 'arka':
            return False
        origin = self.headers.get('Origin')
        return origin is None or origin in ORIGINS or INSECURE

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        path = self.route()
        if path == '/health':
            return self.send(200, {'ok': True})
        m = re.fullmatch(r'/status/([A-Za-z0-9]{6})', path)
        if m:
            if limited(('status', self.ip()), 60, 600):
                return self.send(429, {'error': 'Слишком много запросов, попробуйте позже'})
            with db() as con:
                r = con.execute('SELECT status, tariff, date, updated FROM requests WHERE code = ?', (m.group(1).upper(),)).fetchone()
            if not r:
                return self.send(404, {'error': 'Заявка с таким кодом не найдена'})
            return self.send(200, dict(r))
        if path == '/admin/requests':
            if not self.is_admin():
                return self.send(401, {'error': 'Нужен вход'})
            with db() as con:
                rows = con.execute('SELECT * FROM requests ORDER BY id DESC LIMIT 500').fetchall()
            return self.send(200, {'requests': [row_admin(r) for r in rows]})
        if DEV_ROOT and self.path.startswith(PREFIX):
            return self.dev_static()
        self.send(404, {'error': 'not found'})

    def do_POST(self):
        path = self.route()
        if not self.same_origin():
            return self.send(403, {'error': 'Запрос отклонён'})
        data = self.json_body()
        if data is None:
            return self.send(400, {'error': 'Некорректный запрос'})

        if path == '/requests':
            if data.get('website'):  # ловушка для ботов: настоящий человек это поле не видит
                return self.send(201, {'code': 'XXXXXX', 'status': 'new'})
            if limited(('submit', self.ip()), 5, 3600):
                return self.send(429, {'error': 'Слишком много заявок, попробуйте позже'})
            (name, phone, date, tariff), errors = validate(data)
            if errors:
                return self.send(422, {'errors': errors})
            now = int(time.time())
            with db() as con:
                code = new_code(con)
                con.execute('INSERT INTO requests (code, name, phone, date, tariff, status, created, updated) VALUES (?,?,?,?,?,?,?,?)',
                            (code, name, phone, date, tariff, 'new', now, now))
            return self.send(201, {'code': code, 'status': 'new'})

        if path == '/admin/login':
            if limited(('login', self.ip()), 8, 600):
                return self.send(429, {'error': 'Слишком много попыток, подождите 10 минут'})
            ok = check_password(str(data.get('password', ''))[:200])
            if ok is None:
                return self.send(503, {'error': 'Пароль администратора ещё не задан'})
            if not ok:
                time.sleep(0.6)
                return self.send(401, {'error': 'Неверный пароль'})
            flags = '; HttpOnly; SameSite=Strict; Path=' + PREFIX + '/; Max-Age=' + str(SESSION_SECONDS) + ('' if INSECURE else '; Secure')
            return self.send(200, {'ok': True}, {'Set-Cookie': f'{COOKIE}={make_token()}{flags}'})

        if path == '/admin/logout':
            flags = '; HttpOnly; SameSite=Strict; Path=' + PREFIX + '/; Max-Age=0' + ('' if INSECURE else '; Secure')
            return self.send(200, {'ok': True}, {'Set-Cookie': f'{COOKIE}={flags}'})

        m = re.fullmatch(r'/admin/requests/(\d+)', path)
        if m:
            if not self.is_admin():
                return self.send(401, {'error': 'Нужен вход'})
            status = data.get('status')
            if status not in STATUSES:
                return self.send(422, {'error': 'Неизвестный статус'})
            with db() as con:
                cur = con.execute('UPDATE requests SET status = ?, updated = ? WHERE id = ?', (status, int(time.time()), int(m.group(1))))
            return self.send(200 if cur.rowcount else 404, {'ok': bool(cur.rowcount)})
        self.send(404, {'error': 'not found'})

    def do_DELETE(self):
        path = self.route()
        m = re.fullmatch(r'/admin/requests/(\d+)', path)
        if not m:
            return self.send(404, {'error': 'not found'})
        if not self.same_origin():
            return self.send(403, {'error': 'Запрос отклонён'})
        if not self.is_admin():
            return self.send(401, {'error': 'Нужен вход'})
        with db() as con:
            cur = con.execute('DELETE FROM requests WHERE id = ?', (int(m.group(1)),))
        self.send(200 if cur.rowcount else 404, {'ok': bool(cur.rowcount)})

    def dev_static(self):
        rel = urlparse(self.path).path[len(PREFIX):].lstrip('/') or 'index.html'
        full = os.path.realpath(os.path.join(DEV_ROOT, rel))
        if os.path.isdir(full):
            full = os.path.join(full, 'index.html')
        if not full.startswith(os.path.realpath(DEV_ROOT)) or not os.path.isfile(full):
            return self.send(404, {'error': 'not found'})
        with open(full, 'rb') as f:
            body = f.read()
        self.send_response(200)
        self.send_header('Content-Type', mimetypes.guess_type(full)[0] or 'application/octet-stream')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == '__main__':
    init_db()
    threading.Thread(target=purge_loop, daemon=True).start()
    print(f'arka backend: http://{HOST}:{PORT}, данные в {DATA}', flush=True)
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
