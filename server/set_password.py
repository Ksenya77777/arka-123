#!/usr/bin/env python3
"""Задаёт пароль администратора. Пароль вводится в терминале, нигде не печатается и хранится только как хеш.

  sudo -u www-data env ARKA_DATA=/var/lib/arka-backend python3 /opt/arka-backend/set_password.py
"""
import getpass
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import app  # noqa: E402

pw = getpass.getpass('Новый пароль администратора (не короче 12 символов): ')
if len(pw) < 12:
    sys.exit('Слишком короткий пароль.')
if pw != getpass.getpass('Повторите пароль: '):
    sys.exit('Пароли не совпали.')
fd = os.open(app.HASH_FILE, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
with os.fdopen(fd, 'w') as f:
    f.write(app.hash_password(pw))
print('Готово: пароль сохранён.')
