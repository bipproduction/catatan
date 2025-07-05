# Coolify
---

docker-compose.yml

```yml
services:
  coolify:
    image: coollabsio/coolify
    container_name: coolify
    restart: always
    environment:
      DB_CONNECTION: pgsql
      DB_HOST: coolify-db
      DB_PORT: 5432
      DB_DATABASE: coolify
      DB_USERNAME: bip
      DB_PASSWORD: Production_123
    volumes:
      - ./coolify-data:/app/data
      - /var/run/docker.sock:/var/run/docker.sock
    networks:
      - makuro-network
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U bip"]
      interval: 5s
      timeout: 3s
      retries: 5
  redis:
    container_name: coolify-redis
    image: redis:alpine
    restart: always
    volumes:
      - ./redis-data:/data
    networks:
      - makuro-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
  db:
    container_name: coolify-db
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_DB: coolify
      POSTGRES_USER: bip
      POSTGRES_PASSWORD: Production_123
    volumes:
      - ./pgdata:/var/lib/postgresql/data
    networks:
      - makuro-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U coolify"]
      interval: 5s
      timeout: 3s
      retries: 5

networks:
  makuro-network:
    external: true
```

```sh
mkdir -p coolify-data	pgdata redis-data
chmod -R 777 coolify-data	pgdata redis-data
```

```sh
docker exec -it colify sh
echo "APP_KEY=" >> .env
php artisan key:generate
```
