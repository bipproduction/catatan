```ts
// /api/index.ts

import cors, { HTTPMethod } from "@elysiajs/cors";
import swagger from "@elysiajs/swagger";
import { Elysia } from "elysia";
import EnvGroup from "./lib/env-group";
import Projects from "./lib/projects";
import Utils from "./lib/utils";
import Settings from "./lib/settings";
import SSE from "./lib/sse";
const corsConfig = {
    origin: "*",
    methods: ["GET", "POST", "PATCH", "DELETE", "PUT"] as HTTPMethod[],
    allowedHeaders: "*",
    exposedHeaders: "*",
    maxAge: 5,
    credentials: true,
};

const ApiV2 = new Elysia()
    .use(swagger({ path: "/api/v2/swagger" }))
    .use(cors(corsConfig))
    .group('/api/v2', (app) => app
        .use(Projects)
        .use(EnvGroup)
        .use(Utils)
        .use(Settings)
        .use(SSE)

    );


export default ApiV2
export type APIV2 = typeof ApiV2

```

```ts
// /api/[[...slug]]/route.ts

import ApiV2 from "@/lib/api/v2";
export const GET = ApiV2.handle;
export const POST = ApiV2.handle;
export const PATCH = ApiV2.handle;
export const DELETE = ApiV2.handle;
export const PUT = ApiV2.handle;
```
