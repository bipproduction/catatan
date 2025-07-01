# SSH SERVER

DockerfileProcess

```dockerfile

# Gunakan image resmi Bun
FROM oven/bun:debian

# Install PM2 secara global
RUN bun add -g pm2

# Set direktori kerja
WORKDIR /apps

# Default command saat container dijalankan
CMD ["pm2-runtime", "start", "/apps/ecosystem.config.js"]


```

docker-compose.yml

```yml

# Gunakan image resmi Bun
FROM oven/bun:debian

# Install PM2 secara global
RUN bun add -g pm2

# Set direktori kerja
WORKDIR /apps

# Default command saat container dijalankan
CMD ["pm2-runtime", "start", "/apps/ecosystem.config.js"]


```
