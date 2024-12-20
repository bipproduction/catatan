# NEXTJS SWAGGER

```ts
import cors, { HTTPMethod } from '@elysiajs/cors';
import swagger from '@elysiajs/swagger';
import Elysia from 'elysia';

const corsConfig = {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'] as HTTPMethod[],
    allowedHeaders: '*',
    exposedHeaders: '*',
    maxAge: 5,
    credentials: true,
};

const app = new Elysia()
    .use(swagger({ path: '/api/swagger' }))
    .use(cors(corsConfig))
    .prefix("all", "/api")
    .group("/api", app => app
        .get('/', () => 'Hello World')
        .get('/docs', () => 'Hello World')
        .get('/docs/json', () => 'Hello World'));

// Expose methods
export const GET = app.handle;
export const POST = app.handle;
export const PATCH = app.handle;
export const DELETE = app.handle;
export const PUT = app.handle;

export type API = typeof app;
```
