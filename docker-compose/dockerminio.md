docker-comppose.yml

```yml
services:
  minio:
    image: minio/minio:latest
    container_name: minio
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: bip
      MINIO_ROOT_PASSWORD: Production_123
    volumes:
      - ./data:/data   # ← Ganti ke folder di host
    command: server /data --console-address ":9001"
    restart: unless-stopped
```
