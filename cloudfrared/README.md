# cloudflared tunnel

## tunnel

### Step web server

install:

`brew install cloudflared`

login:

`cloudflared login`

buat tunnel:

`cloudflared tunnel create wibu-tunnel`

buat config

`touch ~/.cloudflared/config.yml`

isi:

```yaml
tunnel: wibu-tunnel
credentials-file: /Users/<YOUR_USERNAME>/.cloudflared/<LONG-ID>.json

ingress:
  - hostname: wibu.wibudev.com
    service: http://localhost:3000
  - service: http_status:404

```

⚠️ Penting:

- tunnel: ➔ isi dengan tunnel ID kamu ➔ yang udah kamu pakai sekarang (contoh kamu wibu-tunnel)
- credentials-file: ➔ ini path ke file .json yang udah otomatis dibuat waktu kamu cloudflared tunnel create

tambahkan DNS record:

`cloudflared tunnel route dns wibu-tunnel wibu.wibudev.com`

menjalankan:

`cloudflared tunnel run wibu-tunnel`

jalan otomatis saat start

`sudo cloudflared service install`

jika semuanya lancar bisa langsung diakses di [wibu.wibudev.com](https://wibu.wibudev.com)

### step ssh

Ubah config config.yml Cloudflared
di ~/.cloudflared/config.yml.

```yaml
tunnel: wibu-tunnel
credentials-file: /Users/bip/.cloudflared/[CREDENTIAL].json

ingress:
  - hostname: dev.wibudev.com
    service: http://localhost:3000
  - hostname: ssh.wibudev.com
    service: ssh://localhost:22
  - service: http_status:404
```

open port 22
di mac preference/sharing/
[x] remote login

tambahkan record CNAME `ssh` di cloudflare

cara connect dari pc lain
install cloudflared lalu tambahkan config di `~/.ssh/config`

```tom
Host wibu-ssh
  HostName ssh.wibudev.com
  Port 22
  User bip  # ganti dengan username di Mac kamu
  ProxyCommand cloudflared access ssh --hostname %h
```

jalankan perintah di terminal 

`ssh wibu-ssh`

untuk cek jika port 22 sudah terbuka

`sudo lsof -i :22`

jadiin server jalan terus dimac

`sudo systemsetup -setcomputersleep Never`

`sudo caffeinate -dimsu &`
