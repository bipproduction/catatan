```yml
name: Build And Save Log

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

env:
  APP_NAME: desa-darmasaba-action
  WA_PHONE: "6289697338821,6289697338822"

jobs:
  build:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_USER: ${{ secrets.POSTGRES_USER }}
          POSTGRES_PASSWORD: ${{ secrets.POSTGRES_PASSWORD }}
          POSTGRES_DB: ${{ secrets.POSTGRES_DB }}
        ports:
          - 5432:5432
        options: >-
          --health-cmd="pg_isready"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=5

    steps:
      # Checkout kode sumber
      - name: Checkout code
        uses: actions/checkout@v3

      # Setup Bun
      - name: Setup Bun
        uses: oven-sh/setup-bun@v2

      # Cache dependencies
      - name: Cache dependencies
        uses: actions/cache@v3
        with:
          path: .bun
          key: ${{ runner.os }}-bun-${{ hashFiles('bun.lockb') }}
          restore-keys: |
            ${{ runner.os }}-bun-

      # Step 1: Set BRANCH_NAME based on event type
      - name: Set BRANCH_NAME
        run: |
          if [[ "${{ github.event_name }}" == "pull_request" ]]; then
            echo "BRANCH_NAME=${{ github.head_ref }}" >> $GITHUB_ENV
          else
            echo "BRANCH_NAME=${{ github.ref_name }}" >> $GITHUB_ENV
          fi

      # Step 2: Generate APP_VERSION dynamically
      - name: Set APP_VERSION
        run: echo "APP_VERSION=${{ github.sha }}---$(date +%Y%m%d%H%M%S)" >> $GITHUB_ENV

      # Step 3: Kirim notifikasi ke API build Start
      - name: Notify start build
        run: |
          IFS=',' read -ra PHONES <<< "${{ env.WA_PHONE }}"
          for PHONE in "${PHONES[@]}"; do
            ENCODED_TEXT=$(bun -e "console.log(encodeURIComponent('Build:start\nApp:${{ env.APP_NAME }}\nBranch:${{ env.BRANCH_NAME }}\nVersion:${{ env.APP_VERSION }}'))")
            curl -X GET "https://wa.wibudev.com/code?text=$ENCODED_TEXT&nom=$PHONE"
          done

      # Install dependencies
      - name: Install dependencies
        run: bun install

      # Konfigurasi environment variable untuk PostgreSQL dan variabel tambahan
      - name: Set up environment variables
        run: |
          echo "DATABASE_URL=postgresql://${{ secrets.POSTGRES_USER }}:${{ secrets.POSTGRES_PASSWORD }}@localhost:5432/${{ secrets.POSTGRES_DB }}?schema=public" >> .env
          echo "PORT=3000" >> .env
          echo "NEXT_PUBLIC_WIBU_URL=localhost:3000" >> .env
          echo "WIBU_UPLOAD_DIR=/uploads" >> .env

      # Create log file
      - name: Create log file
        run: touch build.txt

      # Migrasi database menggunakan Prisma
      - name: Apply Prisma schema to database
        run: bun prisma db push >> build.txt 2>&1

      # Seed database (opsional)
      - name: Seed database
        run: |
          bun prisma db seed >> build.txt 2>&1 || echo "Seed failed or no seed data found. Continuing without seed." >> build.txt

      # Build project
      - name: Build project
        run: bun run build >> build.txt 2>&1

      # Ensure project directory exists
      - name: Ensure /var/www/projects/${{ env.APP_NAME }} exists
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USERNAME }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            mkdir -p /var/www/projects/${{ env.APP_NAME }}

      # Deploy to a new version directory
      - name: Deploy to VPS (New Version)
        uses: appleboy/scp-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USERNAME }}
          key: ${{ secrets.VPS_SSH_KEY }}
          source: "."
          target: "/var/www/projects/${{ env.APP_NAME }}/releases/${{ env.APP_VERSION }}"

       # Set up environment variables
      - name: Set up environment variables
        run: |
          rm -r .env
          echo "DATABASE_URL=postgresql://${{ secrets.POSTGRES_USER }}:${{ secrets.POSTGRES_PASSWORD }}@localhost:5433/${{ secrets.POSTGRES_DB }}?schema=public" >> .env
          echo "NEXT_PUBLIC_WIBU_URL=${{ env.APP_NAME }}" >> .env
          echo "WIBU_UPLOAD_DIR=/var/www/projects/${{ env.APP_NAME }}/uploads" >> .env

      # Kirim file .env ke server
      - name: Upload .env to server
        uses: appleboy/scp-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USERNAME }}
          key: ${{ secrets.VPS_SSH_KEY }}
          source: ".env"
          target: "/var/www/projects/${{ env.APP_NAME }}/releases/${{ env.APP_VERSION }}/"

      # manage deployment
      - name: manage deployment
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USERNAME }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |

            # Source ~/.bashrc
            source ~/.bashrc

            # Find an available port
            PORT=$(curl -s -X GET https://wibu-bot.wibudev.com/api/find-port | jq -r '.[0]')
            if [ -z "$PORT" ] || ! [[ "$PORT" =~ ^[0-9]+$ ]]; then
              echo "Invalid or missing port from API."
              exit 1
            fi

            # manage deployment
            cd /var/www/projects/${{ env.APP_NAME }}/releases/${{ env.APP_VERSION }}

            # Create uploads directory
            mkdir -p /var/www/projects/${{ env.APP_NAME }}/uploads

            # Install dependencies
            bun install --production

            # Apply database schema
            if ! bun prisma db push; then
              echo "Database migration failed."
              exit 1
            fi

            # Seed database (optional)
            bun prisma db seed || echo "tidak membutuhkan seed"

            # Restart the application
            pm2 reload ${{ env.APP_NAME }} || pm2 start "bun run start --port $PORT" --name "${{ env.APP_NAME }}-$PORT" --namespace "${{ env.APP_NAME }}"

      # Step 4: Set BUILD_STATUS based on success or failure
      - name: Set BUILD_STATUS
        if: success()
        run: echo "BUILD_STATUS=success" >> $GITHUB_ENV

      - name: Set BUILD_STATUS on failure
        if: failure()
        run: echo "BUILD_STATUS=failed" >> $GITHUB_ENV

      # Update status log
      - name: Update status log
        if: always()
        run: |
          echo "=====================" >> build.txt
          echo "BUILD_STATUS=${{ env.BUILD_STATUS }}" >> build.txt
          echo "APP_NAME=${{ env.APP_NAME }}" >> build.txt
          echo "APP_VERSION=${{ env.APP_VERSION }}" >> build.txt
          echo "=====================" >> build.txt

      # Upload log to 0x0.st
      - name: Upload log to 0x0.st
        id: upload_log
        if: always()
        run: |
          LOG_URL=$(curl -F "file=@build.txt" https://wibu-bot.wibudev.com/api/file )
          echo "LOG_URL=$LOG_URL" >> $GITHUB_ENV

      # Kirim notifikasi ke API
      - name: Notify build success via API
        if: always()
        run: |
          IFS=',' read -ra PHONES <<< "${{ env.WA_PHONE }}"
          for PHONE in "${PHONES[@]}"; do 
            ENCODED_TEXT=$(bun -e "console.log(encodeURIComponent('Build:${{ env.BUILD_STATUS }}\nApp:${{ env.APP_NAME }}\nBranch:${{ env.BRANCH_NAME }}\nVersion:${{ env.APP_VERSION }}\nLog:${{ env.LOG_URL }}'))")
            curl -X GET "https://wa.wibudev.com/code?text=$ENCODED_TEXT&nom=$PHONE"
          done

```
