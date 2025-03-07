```yml
name: log

on:
  workflow_dispatch:
    inputs:
      data:
        description: "data"
        required: true
        default: "null"

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2

      - name: Install dependencies
        run: bun install

        # WIBU_NAME
        # WIBU_NAMESPACE
        # WIBU_REPO
        # WIBU_BRANCH
        # WIBU_DATE
        # WIBU_APP_VERSION
      - name: Handle env
        run: |
          echo "NAME=${{ fromJson(inputs.data).name }}" >> $GITHUB_ENV
          echo "WIBU_NAMESPACE=${{ fromJson(inputs.data).namespace }}" >> $GITHUB_ENV
          echo "WIBU_REPO=${{ fromJson(inputs.data).repo }}" >> $GITHUB_ENV
          echo "WIBU_BRANCH=${{ fromJson(inputs.data).branch }}" >> $GITHUB_ENV
          echo "WIBU_DATE=${{ fromJson(inputs.data).date }}" >> $GITHUB_ENV
          echo "WIBU_APP_VERSION=${{ fromJson(inputs.data).appVersion }}" >> $GITHUB_ENV

          cat <<EOF > .env.wibu.app
          ${{ fromJson(inputs.data).env }}
          EOF

          cat <<EOF > ./id_rsa
          ${{ secrets.VPS_KEY }}
          EOF

          chmod 600 ./id_rsa

      - name: Handle WIBU_DATA
        run: |
          # Test SSH connection
          ssh -o StrictHostKeyChecking=no -i ./id_rsa ${{ secrets.VPS_USER }}@${{ secrets.VPS_HOST }} \
          "timeout 10s pm2 log ${{ env.WIBU_NAMESPACE }} 2>&1 || true" | bun run send-notify.ts \
          --data ${{ secrets.FIREBASE }}[x]${{ secrets.WIBU_KEY }} \
          --path "/logs/live/${{ env.WIBU_NAMESPACE }}/log"

          echo "false" | bun run send-notify.ts \
          --data ${{ secrets.FIREBASE }}[x]${{ secrets.WIBU_KEY }} \
          --path "/logs/live/${{ env.WIBU_NAMESPACE }}/isRunning"

          # delete rsa
          rm ./id_rsa

```
