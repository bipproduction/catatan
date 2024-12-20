# BUN ELYSIA SWAGGER

package.json

```json
{
  "name": "app",
  "version": "1.0.50",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "dev": "source .env && bun run --watch src/index.ts"
  },
  "dependencies": {
    "@elysiajs/swagger": "^1.1.6",
    "elysia": "^1.1.26"
  },
  "devDependencies": {
    "bun-types": "latest"
  },
  "module": "src/index.js"
}
```

index.ts

```ts
import { Elysia } from "elysia";
import { swagger } from '@elysiajs/swagger'
import { logger } from "./lib/logger";
import { errorHandler } from "./middleware/error";
import { setupRoutes } from "./routes";

const PORT = Number(process.env.PORT) || 3000;
if (isNaN(PORT)) {
  throw new Error('PORT harus berupa angka');
}

const app = new Elysia()
  .use(swagger())
  .use(errorHandler)
  .use(setupRoutes);

const server = app.listen(PORT);

process.on('SIGTERM', async () => {
  logger.info('Menerima sinyal SIGTERM, melakukan graceful shutdown...');
  await server.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Menerima sinyal SIGINT, melakukan graceful shutdown...');
  await server.stop();
  process.exit(0);
});

logger.info(
  `🦊 Elysia berjalan di http://${app.server?.hostname}:${app.server?.port}`
);
```

route.ts

```ts
import { Elysia } from "elysia";
import { deploy } from "../lib/deploy";
import { overviews } from "../lib/overviews";

export const setupRoutes = (app: Elysia) => {
    app
        .get("/", () => "Hello Elysia")
        .group("/api/v1", app => app
            .group("/deploy", app => app
                .get("/", deploy.GET)
                .post("/", deploy.POST)
            )
            .group("/overviews", app => app
                .get("/", overviews.GET)
                .get("/:name", overviews.GET_OVERVIEW)
                .post("/", overviews.POST)
            )
        );

    return app;
};
```
