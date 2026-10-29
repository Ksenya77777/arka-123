#!/usr/bin/env bash
# Выкладка проекта на сайт-портфолио (SSH-алиас host). Запуск из корня репозитория: bash server/deploy/deploy.sh
# Идемпотентно: повторный запуск обновляет сайт и backend, делает бэкап конфигурации nginx.
set -euo pipefail
HOST="${1:-host}"
WEB=/var/www/kseniya-developer.ru
NGINX_CONF=/etc/nginx/sites-enabled/kseniya-developer.ru

npm run build:portfolio

echo '== backend'
ssh "$HOST" 'mkdir -p /opt/arka-backend'
COPYFILE_DISABLE=1 tar --no-xattrs -C server -czf - app.py set_password.py | ssh "$HOST" 'tar -xzf - --no-same-owner -C /opt/arka-backend && chown -R root:root /opt/arka-backend && chmod 755 /opt/arka-backend && chmod 644 /opt/arka-backend/*.py'
scp -q server/deploy/arka-backend.service "$HOST":/etc/systemd/system/arka-backend.service
ssh "$HOST" 'systemctl daemon-reload && systemctl enable arka-backend >/dev/null 2>&1 && systemctl restart arka-backend && sleep 1 && systemctl is-active arka-backend'

echo '== nginx'
scp -q server/deploy/nginx-snippet.conf "$HOST":/etc/nginx/snippets/arka-meet-at-the-library.conf
ssh "$HOST" "set -e
  cp -a $NGINX_CONF /root/kseniya-developer.ru.nginx.bak-\$(date +%Y%m%d%H%M%S)
  grep -q arka-meet-at-the-library $NGINX_CONF || sed -i --follow-symlinks '/location \\/ { try_files/a\\    include snippets/arka-meet-at-the-library.conf;' $NGINX_CONF
  nginx -t
  systemctl reload nginx"

echo '== сайт'
COPYFILE_DISABLE=1 tar --no-xattrs -C dist-portfolio -czf - . | ssh "$HOST" "set -e
  rm -rf $WEB/.meet-new && mkdir -p $WEB/.meet-new
  tar -xzf - --no-same-owner -C $WEB/.meet-new
  rm -rf $WEB/.meet-old
  [ -d $WEB/meet-at-the-library ] && mv $WEB/meet-at-the-library $WEB/.meet-old
  mv $WEB/.meet-new $WEB/meet-at-the-library
  rm -rf $WEB/.meet-old
  chown -R root:root $WEB/meet-at-the-library"
echo 'Готово: https://kseniya-developer.ru/meet-at-the-library/'
