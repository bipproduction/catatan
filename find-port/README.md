```ts
import getPort, { portNumbers } from 'get-port';

/**
 * Mencari port yang tersedia dalam rentang tertentu.
 * @param params - Parameter opsional untuk mencari port.
 * @param params.count - Jumlah port yang dibutuhkan (default: 1).
 * @param params.portStart - Awal rentang port (default: 3000).
 * @param params.portEnd - Akhir rentang port (default: 6000).
 * @param params.exclude - Daftar port yang harus dikecualikan.
 * @returns Array port yang tersedia atau null jika tidak ada port yang cukup.
 */
async function findPort(params?: { count?: number, portStart?: number, portEnd?: number, exclude?: number[] }) {
    const { count = 1, portStart = 3000, portEnd = 6000, exclude = [] } = params || {};

    // Gabungkan port yang dikecualikan
    const listPort = [...exclude]; // Hapus .flat() karena tidak diperlukan
    const usedPorts = Array.from(new Set(listPort)) as number[];

    // Validasi input
    if (count <= 0) {
        throw new Error('Count harus lebih besar dari 0');
    }
    if (count > (portEnd - portStart + 1)) {
        throw new Error(`Count tidak boleh lebih besar dari range port (${portEnd - portStart + 1})`);
    }
    if (portStart >= portEnd) {
        throw new Error('portStart harus lebih kecil dari portEnd');
    }
    if (portStart < 0 || portEnd > 65535) {
        throw new Error('Port harus berada dalam rentang 0-65535');
    }

    // Optimasi pencarian port
    const availablePorts = new Set<number>();
    const portRange = portNumbers(portStart, portEnd);
    const usedPortsSet = new Set(usedPorts);

    for (const port of portRange) {
        if (availablePorts.size >= count) break;

        // Skip jika port sudah digunakan
        if (usedPortsSet.has(port)) continue;

        try {
            const availablePort = await getPort({
                port,
                exclude: [...usedPorts, ...Array.from(availablePorts)],
            });

            // Pastikan port yang diperiksa berada dalam rentang yang ditentukan
            if (availablePort === port && availablePort >= portStart && availablePort <= portEnd) {
                availablePorts.add(port);
            }
        } catch (error) {
            console.warn(`Gagal memeriksa port ${port}:`, error);
            continue; // Lanjutkan ke port berikutnya
        }
    }

    // Jika tidak cukup port yang tersedia, lempar error
    if (availablePorts.size < count) {
        throw new Error('Tidak cukup port yang tersedia dalam rentang yang diberikan');
    }

    return Array.from(availablePorts);
}

export default findPort;

```
