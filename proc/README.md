```ts
import { spawn } from 'bun'

async function proc(params?: {
    env?: Record<string, string | undefined>
    cmd?: string
    cwd?: string
    timeout?: number
    onStdOut?: (chunk: string) => void
    onStdErr?: (chunk: string) => void
}) {
    const { env = {}, cmd, cwd = "./", timeout = 30000 } = params || {}
    return new Promise(async (resolve, reject) => {
        const std = {
            stdout: "",
            stderr: "",
        }

        if (!cmd) {
            reject(new Error("cmd is required"))
            return
        }

        const decoder = new TextDecoder()
        const child = spawn(["/bin/bash", "-c", cmd], {
            cwd,
            env: {
                PATH: process.env.PATH,
                ...env
            },
        })

        const timeOut = setTimeout(() => {
            child.kill()
            clearTimeout(timeOut)
            reject("timeout")
        }, timeout)

        const resOut = new Response(child.stdout)
        const resErr = new Response(child.stderr)

        if (resOut && resOut.body) {
            for await (const chunk of resOut.body as unknown as AsyncIterable<Uint8Array>) {
                const text = decoder.decode(chunk)
                std.stdout += text
                if (params?.onStdOut) {
                    params.onStdOut(text)
                }
            }
        }

        if (resErr && resErr.body) {
            for await (const chunk of resErr.body as unknown as AsyncIterable<Uint8Array>) {
                const text = decoder.decode(chunk)
                std.stderr += text
                params?.onStdErr?.(text)
            }
        }

        clearTimeout(timeOut)
        if (!child.killed) {
            child.kill()
        }

        resolve(std)
    })
}

export default proc
```
