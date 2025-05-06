# INSTALL

```sh
cd /tmp
curl -L https://github.com/ollama/ollama/releases/latest/download/ollama-darwin-arm64.tgz -o ollama.tgz
tar xvf ollama.tgz
sudo mv ollama /usr/local/bin/
ollama --version
# jalankan model
ollama run qwen2.5:3b
pm2 start "ollama serve" --name ollama
# or diakses global
pm2 start "OLLAMA_HOST=0.0.0.0 ollama serve" --name ollama-globa 
```

### cek version

`curl http://192.168.1.10:11434/api/version`

### cek model

```bash
curl http://localhost:11434/api/tags
```

### jalankan di curl

```bash
curl http://localhost:11434/api/generate -d '{
  "model": "llama3",
  "prompt": "Jelaskan apa itu kecerdasan buatan dalam bahasa Indonesia singkat."
}'
```

### jalankan dengan opsi stream

```bash
curl http://localhost:11434/api/generate -d '{
  "model": "llama3",
  "prompt": "Beri saya daftar 5 hewan mamalia laut.",
  "stream": true
}'
```


