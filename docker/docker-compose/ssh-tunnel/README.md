docker-compose.yml

```yml

services:
  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: cloudflared
    command: tunnel --no-autoupdate run --token ${CLOUDFLARE_TUNNEL_TOKEN}
    restart: unless-stopped
    volumes:
      - ./cloudflared:/root/.cloudflared
    networks:
      - makuro-network
    environment:
      - TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
    healthcheck:
      test: ["CMD", "cloudflared", "--version"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

  ssh-server:
    image: linuxserver/openssh-server:latest
    container_name: ssh-server
    restart: unless-stopped
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=Asia/Makassar
      - PUBLIC_KEY=${SSH_PUBLIC_KEY}
      - USER_NAME=makuro
      - SUDO_ACCESS=false
      - LISTEN_PORT=22
    volumes:
      - ./ssh-config:/config
    networks:
      - makuro-network
    healthcheck:
      test: ["CMD", "nc", "-z", "localhost", "22"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
  apps:
    build:
      context: .
      dockerfile: DockerfileProcess
    container_name: apps
    volumes:
      - ./apps:/apps
    networks:
      - makuro-network
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    container_name: postgres-db
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - ./postgres-data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
    networks:
      - makuro-network

networks:
  makuro-network:
    external: true
```

