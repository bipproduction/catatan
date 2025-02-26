```yml
name: test jalankan obake
on:
  workflow_dispatch:
    inputs:
      env:
        description: "env"
        required: true
        default: "null"
      local:
        description: "app"
        required: true
        default: "null"
      host:
        description: "host"
        required: true
        default: "null"
      username:
        description: "username"
        required: true
        default: "null"
      key:
        description: "key"
        required: true
        default: "null"
jobs:
  build:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_USER: bip
          POSTGRES_PASSWORD: Production_123
          POSTGRES_DB: db
        ports:
          - 5433:5432
        options: >-
          --health-cmd="pg_isready"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=5
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2

      - name: manage env and app version
        run: |
          echo "${{ inputs.env }}" >> $GITHUB_ENV
          echo "${{ inputs.local }}" >> $GITHUB_ENV

      - name: app version
        run: |
          echo "APP_VERSION=${{ env.BRANCH }}-${{ github.sha }}-$(date +%Y_%m_%d-%H_%M_%S)" >> $GITHUB_ENV

      - name: find app port
        run: |
          PORT=$(curl -s -X GET https://wibu-bot.wibudev.com/api/find-port | jq -r '.[0]')
          if [ -z "$PORT" ] || ! [[ "$PORT" =~ ^[0-9]+$ ]]; then
            echo "Invalid or missing port from API."
            exit 1
          fi
          echo "APP_PORT=$PORT" >> $GITHUB_ENV

      - name: install dependencies
        run: bun install

      - name: clone repo
        run: |
          git clone https://x-access-token:${{ env.TOKEN }}@github.com/bipproduction/${{ env.REPO }}.git ${{ env.APP_VERSION }}

      - name: build
        working-directory: ${{ env.APP_VERSION }}
        run: |
          bun install
          bunx prisma db push >> ${{ github.workspace }}/logs.txt 2>&1
          bunx prisma db seed >> ${{ github.workspace }}/logs.txt 2>&1 || echo "no need seeder" >> ${{ github.workspace }}/logs.txt 2>&1
          bun run build >> ${{ github.workspace }}/logs.txt 2>&1

      # Ensure project directory exists
      - name: Ensure /var/www/projects/${{ env.APP_NAME}} exists
        uses: appleboy/ssh-action@master
        with:
          host: ${{ inputs.host }}
          username: ${{ inputs.username }}
          key: ${{ inputs.key }}
          script: |
            mkdir -p /var/www/projects/${{ env.APP_NAME}}/releases

      # Clean unnecessary files
      - name: Clean unnecessary files
        working-directory: ${{ env.APP_VERSION }}
        run: |
          rm -rf .git node_modules

      # config .env
      - name: create config env.txt
        working-directory: ${{ env.APP_VERSION }}
        run: |
          echo "${{ inputs.env }}" >> env.txt

      # Deploy to a new version directory
      - name: Deploy to VPS (New Version)
        uses: appleboy/scp-action@master
        with:
          host: ${{ inputs.host }}
          username: ${{ inputs.username }}
          key: ${{ inputs.key }}
          source: "${{ env.APP_VERSION }}/."
          target: "/var/www/projects/${{ env.APP_NAME }}/releases/"

      # manage deployment
      - name: manage env file
        uses: appleboy/ssh-action@master
        with:
          host: ${{ inputs.host }}
          username: ${{ inputs.username }}
          key: ${{ inputs.key }}
          script: |
            cd /var/www/projects/${{ env.APP_NAME}}/releases/${{ env.APP_VERSION }}
            mv env.txt .env

      # bun install on server
      - name: bun install on server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ inputs.host }}
          username: ${{ inputs.username }}
          key: ${{ inputs.key }}
          script: |
            source ~/.bashrc
            cd /var/www/projects/${{ env.APP_NAME}}/releases/${{ env.APP_VERSION }}
            bun install --production

      # db push on server
      - name: db push on server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ inputs.host }}
          username: ${{ inputs.username }}
          key: ${{ inputs.key }}
          script: |
            source ~/.bashrc
            cd /var/www/projects/${{ env.APP_NAME}}/releases/${{ env.APP_VERSION }}
            bunx prisma db push

      # seed on server
      - name: seed on server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ inputs.host }}
          username: ${{ inputs.username }}
          key: ${{ inputs.key }}
          script: |
            source ~/.bashrc
            cd /var/www/projects/${{ env.APP_NAME}}/releases/${{ env.APP_VERSION }}
            bunx prisma db seed || echo "[server] tidak membutuhkan seed"

      # manage deployment on server
      - name: manage deployment on server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ inputs.host }}
          username: ${{ inputs.username }}
          key: ${{ inputs.key }}
          script: |
            # Source ~/.bashrc
            source ~/.bashrc

            echo "masuk ke directory kerja"
            # manage deployment
            cd /var/www/projects/${{ env.APP_NAME}}/releases/${{ env.APP_VERSION }} 

            # Restart the application
            pm2 reload ${{ env.NAMESPACE}} || pm2 start "bun run start --port ${{ env.APP_PORT }}" --name "${{ env.APP_NAME}}-${{ env.APP_PORT }}" --namespace "${{ env.NAMESPACE}}"

            echo "[server] restart selesai"

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
          echo "=====================" >> ${{ github.workspace }}/logs.txt
          echo "BUILD_STATUS=${{ env.BUILD_STATUS }}" >> ${{ github.workspace }}/logs.txt
          echo "APP_NAME=${{ env.APP_NAME}}" >> ${{ github.workspace }}/logs.txt
          echo "BRANCH=${{ env.BRANCH }}" >> ${{ github.workspace }}/logs.txt
          echo "=====================" >> ${{ github.workspace }}/logs.txt

      # Upload log to 0x0.st
      - name: Upload log to server log
        id: upload_log
        if: always()
        run: |
          LOG_URL=$(curl -F "file=@${{ github.workspace }}/logs.txt" ${{ env.LOG_URL }} )
          echo "LOG_URL=$LOG_URL" >> $GITHUB_ENV

      # Kirim notifikasi ke API
      - name: Notify build success via API
        if: always()
        run: |
          IFS=',' read -ra PHONES <<< "${{ env.PHONES }}"
          for PHONE in "${PHONES[@]}"; do 
            ENCODED_TEXT=$(echo -n "${{ env.LOG_URL}}" | jq -Rr @uri)
            curl -X GET "https://wa.wibudev.com/code?text=$ENCODED_TEXT&nom=$PHONE"
          done

```
