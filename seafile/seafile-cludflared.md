# solusi seafile dan cloudflared

docker-compose.yml

```yml
services:
  db:
    image: mariadb:10.11
    container_name: seafile-mysql
    environment:
      - MYSQL_ROOT_PASSWORD=Production_123
      - MYSQL_DATABASE=seafile_db
      - MYSQL_USER=bip
      - MYSQL_PASSWORD=Production_123
      - MYSQL_LOG_CONSOLE=true
    volumes:
      - ./mysql:/var/lib/mysql
    restart: always

  memcached:
    image: memcached:alpine
    container_name: seafile-memcached
    restart: always

  seafile:
    image: seafileltd/seafile-mc:latest
    container_name: seafile
    ports:
      - "8800:80"  # expose ke port 8800 untuk akses di Mac
    volumes:
      - ./seafile:/shared
    environment:
      - DB_HOST=db
      - DB_ROOT_PASSWD=Production_123
      - DB_NAME=seafile_db
      - DB_USER=bip
      - DB_PASSWORD=Production_123
      - SEAFILE_ADMIN_EMAIL=bip@wibudev.com
      - SEAFILE_ADMIN_PASSWORD=Production_123
      - SEAFILE_SERVER_NAME=seafile.wibudev.com
      - SEAFILE_USE_HTTPS=true
      - SEAFILE_SERVER_LETSENCRYPT=false
      - TZ=Asia/Jakarta
      - SERVICE_URL=https://seafile.wibudev.com
    depends_on:
      - db
      - memcached
    restart: always
```

~/.cloudflared/config.yml
```yml
tunnel: wibu-tunnel
credentials-file: /Users/bip/.cloudflared/80913254-3d29-4c77-a499-243d4cabc34b.json

ingress:
  - hostname: dev.wibudev.com
    service: http://192.168.1.247:3000
  - hostname: bagas.wibudev.com
    service: http://192.168.1.240:3000
  - hostname: amal.wibudev.com
    service: http://192.168.1.243:3000
  - hostname: ssh.wibudev.com
    service: ssh://localhost:22
  - hostname: ai.wibudev.com
    service: http://localhost:11434
  - hostname: qdrant.wibudev.com
    service: http://localhost:6333
  - hostname: search.wibudev.com
    service: http://localhost:5001
  - hostname: n8n.wibudev.com
    service: http://localhost:5678
  - hostname: seafile.wibudev.com
    service: http://localhost:8800
    originRequest:
      noTLSVerify: true
      httpHostHeader: seafile.wibudev.com
      headers:
        X-Forwarded-Proto: https
  - service: http_status:404

```

/shared/seafile/conf/seahub_settings.py
tambahkan

```py
ALLOWED_HOSTS = ['seafile.wibudev.com']
CSRF_TRUSTED_ORIGINS = ['https://seafile.wibudev.com']
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_SAMESITE = 'Strict'
```

jika salah password melulu maka reset password :

```sh
docker exec -it seafile /bin/bash
cd /opt/seafile/seafile-server-latest/
./reset-admin.sh
```
