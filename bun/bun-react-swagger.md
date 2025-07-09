# Bun + React + wagger

```txt
├── README.md
├── bun-env.d.ts
├── bun.lock
├── bunfig.toml
├── lib
│   ├── api-router.ts
│   └── routes.ts
├── package.json
├── postcss.config.cjs
├── public
│   └── swagger.html
├── src
│   ├── APITester.tsx
│   ├── App.tsx
│   ├── frontend.tsx
│   ├── index.css
│   ├── index.html
│   ├── index.tsx
│   ├── logo.svg
│   └── react.svg
└── tsconfig.json
```

lib/api-router.ts

```ts
export type RouteMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface RouteMeta {
  path: string;
  method: RouteMethod;
  handler: (req: Request) => Response | Promise<Response>;
  summary?: string;
}

const routesMeta: RouteMeta[] = [];

export const defineRoute = (meta: RouteMeta) => {
  routesMeta.push(meta);
};

export const getSwaggerJson = () => {
  const paths: Record<string, any> = {};
  for (const { path, method, summary } of routesMeta) {
    const openapiPath = path.replace(/:([^/]+)/g, `{$1}`);
    paths[openapiPath] ??= {};
    paths[openapiPath][method.toLowerCase()] = {
      summary,
      responses: { 200: { description: "Success" } }
    };
  }
  return {
    openapi: "3.0.0",
    info: { title: "Bun Swagger API", version: "1.0.0" },
    paths
  };
};

export const toBunRoutes = () => {
  const map: Record<string, any> = {};
  for (const { path, method, handler } of routesMeta) {
    map[path] ??= {};
    map[path][method] = handler;
  }
  return map;
};

```

lib/routes/ts

```ts
import { defineRoute } from "./api-router";

defineRoute({
  method: "GET",
  path: "/api/hello",
  summary: "Get Hello",
  handler: async () => Response.json({ message: "Hello, world!", method: "GET" })
});

defineRoute({
  method: "PUT",
  path: "/api/hello",
  summary: "Put Hello",
  handler: async () => Response.json({ message: "Hello, world!", method: "PUT" })
});

defineRoute({
  method: "GET",
  path: "/api/hello/:name",
  summary: "Personalized greeting",
  handler: async req => {
    const name = new URL(req.url).pathname.split("/").pop();
    return Response.json({ message: `Hello, ${name}!` });
  }
});

```

public/swagger.html

```html
<!-- public/swagger.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Swagger UI</title>
    <link
      rel="stylesheet"
      href="https://unpkg.com/swagger-ui-dist/swagger-ui.css"
    />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
    <script>
      SwaggerUIBundle({
        url: "/swagger.json",
        dom_id: "#swagger-ui",
      });
    </script>
  </body>
</html>

```

src/index.tsx

```tsx
import { serve } from "bun";
import index from "./index.html";
import { getSwaggerJson, toBunRoutes } from "lib/api-router";
import swaggerHTML from "./public/swagger.html";

import "lib/routes";

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,
    ...toBunRoutes(),
    "/swagger.json": async () =>
      new Response(JSON.stringify(getSwaggerJson()), {
        headers: { "Content-Type": "application/json" },
      }),
    "/swagger.html": swaggerHTML,
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
  port: 3000,
});

console.log(`🚀 Server running at ${server.url}`);

```

src/index.html

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="./logo.svg" />
    <title>Bun + React</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>

```

src/frontend.ts

```ts
/**
 * This file is the entry point for the React app, it sets up the root
 * element and renders the App component to the DOM.
 *
 * It is included in `src/index.html`.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

const elem = document.getElementById("root")!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

if (import.meta.hot) {
  // With hot module reloading, `import.meta.hot.data` is persisted.
  const root = (import.meta.hot.data.root ??= createRoot(elem));
  root.render(app);
} else {
  // The hot module reloading API is not available in production.
  createRoot(elem).render(app);
}

```

src/App.tsx

```tsx
import { Container, MantineProvider, Stack, Title } from "@mantine/core";
import '@mantine/core/styles.css';

export function App() {
  return (
    <MantineProvider defaultColorScheme="dark">
      <Container>
        <Stack>
          <Title>Ini Adalah proect</Title>
        </Stack>
      </Container>
    </MantineProvider>
  );
}

export default App;

```

package.json

```json
{
  "name": "bun-react-template",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "src/index.tsx",
  "module": "src/index.tsx",
  "scripts": {
    "dev": "bun --hot src/index.tsx",
    "build": "bun build ./src/index.html --outdir=dist --sourcemap --target=browser --minify --define:process.env.NODE_ENV='\"production\"' --env='BUN_PUBLIC_*'",
    "start": "NODE_ENV=production bun src/index.tsx"
  },
  "dependencies": {
    "@mantine/core": "^8.1.3",
    "@mantine/hooks": "^8.1.3",
    "react": "^19",
    "react-dom": "^19"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "postcss": "^8.5.6",
    "postcss-preset-mantine": "^1.18.0",
    "postcss-simple-vars": "^7.0.1"
  }
}

```

