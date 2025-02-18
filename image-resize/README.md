```ts
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Context } from "elysia";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

const root = process.cwd();
const cache = new Map<string, Buffer>(); // In-memory cache untuk buffer gambar
const CACHE_DIR = path.join(root, "cache"); // Direktori untuk file-based cache

// Pastikan direktori cache ada
await fs.mkdir(CACHE_DIR, { recursive: true });

async function images(ctx: Context) {
    const { name } = ctx.params; // Ambil parameter nama file dari URL
    const completeName = path.basename(name); // Nama file lengkap
    const ext = path.extname(name).toLowerCase(); // Ekstensi file dalam huruf kecil
    const fileNameWithoutExt = path.basename(name, ext); // Nama file tanpa ekstensi

    // Default image jika terjadi kesalahan
    const noImage = path.join(root, "public/no-image.jpg");

    // Validasi ekstensi file
    if (![".jpg", ".jpeg", ".png"].includes(ext)) {
        return new Response(await fs.readFile(noImage), {
            headers: { "Content-Type": "image/jpeg" },
        });
    }

    // Fungsi untuk mendapatkan ukuran dari nama file (misalnya: nama-200.jpg)
    const getSize = (): number | null => {
        try {
            const sizePart = fileNameWithoutExt.split("-")[1];
            return Number(sizePart);
        } catch (error) {
            return null;
        }
    };

    const size = getSize();

    // Generate cache key berdasarkan nama file dan ukuran
    const cacheKey = size ? `${fileNameWithoutExt}-${size}${ext}` : completeName;

    // Periksa in-memory cache
    if (cache.has(cacheKey)) {
        ctx.set.headers = {
            "Cache-Control": "public, max-age=3600, stale-while-revalidate=600",
            "Content-Type": `image/${ext.slice(1)}`,
        };
        return new Response(cache.get(cacheKey)!);
    }

    // Periksa file-based cache
    const cachedFilePath = path.join(CACHE_DIR, cacheKey);
    try {
        const cachedFileStats = await fs.stat(cachedFilePath);
        if (cachedFileStats.isFile()) {
            const cachedBuffer = await fs.readFile(cachedFilePath);

            // Simpan ke in-memory cache untuk akses lebih cepat di masa depan
            cache.set(cacheKey, cachedBuffer);

            ctx.set.headers = {
                "Cache-Control": "public, max-age=3600, stale-while-revalidate=600",
                "Content-Type": `image/${ext.slice(1)}`,
            };
            return new Response(cachedBuffer);
        }
    } catch (error) {
        // File-based cache tidak ditemukan, lanjutkan ke proses berikutnya
    }

    if (size) {
        try {
            // Nama file asli tanpa bagian ukuran
            const realName = `${fileNameWithoutExt.replace(`-${size}`, "")}${ext}`;
            const filePath = path.join(root, "uploads", realName);

            // Periksa apakah file ada
            await fs.stat(filePath);

            // Proses resize menggunakan sharp
            const resizedImageBuffer = await sharp(filePath)
                .resize(size)
                .toBuffer();

            // Simpan hasil resize ke in-memory cache dan file-based cache
            cache.set(cacheKey, resizedImageBuffer);
            await fs.writeFile(cachedFilePath, resizedImageBuffer);

            ctx.set.headers = {
                "Cache-Control": "public, max-age=3600, stale-while-revalidate=600",
                "Content-Type": "image/jpeg",
            };
            return new Response(resizedImageBuffer);
        } catch (error) {
            // Jika file tidak ditemukan atau gagal diproses, kembalikan default image
            return new Response(await fs.readFile(noImage), {
                headers: { "Content-Type": "image/jpeg" },
            });
        }
    } else {
        try {
            const filePath = path.join(root, "uploads", completeName);

            // Periksa apakah file ada
            await fs.stat(filePath);

            // Baca file asli
            const fileBuffer = await fs.readFile(filePath);

            // Simpan ke in-memory cache dan file-based cache
            cache.set(cacheKey, fileBuffer);
            await fs.writeFile(cachedFilePath, fileBuffer);

            return new Response(fileBuffer, {
                headers: { "Content-Type": `image/${ext.slice(1)}` },
            });
        } catch (error) {
            // Jika file tidak ditemukan, kembalikan default image
            return new Response(await fs.readFile(noImage), {
                headers: { "Content-Type": "image/jpeg" },
            });
        }
    }
}

export default images;
```
