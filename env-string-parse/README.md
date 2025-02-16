```ts
type EnvVariable = { key: string; value: string };

class EnvStringParser {
    /**
     * Parses an environment string into a key-value object.
     * @param envString - The environment string to parse.
     * @param env - Optional custom environment variables (defaults to `process.env` in Node.js).
     * @returns A Record<string, string> containing parsed environment variables.
     */
    static parse(envString: string, env: Record<string, string | undefined> = process.env): Record<string, string> {
        const envVars: EnvVariable[] = [];
        // Split the string into lines
        const lines = envString.split(/\r?\n/); // Handle both \n and \r\n line endings

        for (const line of lines) {
            const trimmedLine = line.trim();
            // Skip comments and empty lines
            if (!trimmedLine || trimmedLine.startsWith("#")) continue;

            // Match key-value pairs with support for quoted values
            const match = trimmedLine.match(/^([\w.-]+)=(?:"([^"]*)"|'([^']*)'|([^#\s]*))/);
            if (!match) {
                console.warn(`Skipping invalid line: ${trimmedLine}`);
                continue;
            }

            const key = match[1];
            let value = match[2] || match[3] || match[4] || ""; // Handle double quotes, single quotes, or unquoted values

            // Resolve environment variable placeholders like ${VAR_NAME}
            value = value.replace(/\$\{(\w+)\}/g, (_, varName) => {
                if (env[varName]) {
                    return env[varName]!;
                } else {
                    console.warn(`Environment variable ${varName} is not defined`);
                    return "";
                }
            });

            envVars.push({ key, value });
        }

        // Convert array of EnvVariable objects into a Record<string, string>
        const envObj: Record<string, string> = {};
        for (const { key, value } of envVars) {
            envObj[key] = value;
        }

        return envObj;
    }
}

export default EnvStringParser;
```
