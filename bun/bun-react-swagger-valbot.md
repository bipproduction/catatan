```ts
// lib/api-router.ts
import * as v from 'valibot';

export type RouteMethod = "GET" | "POST" | "PUT" | "DELETE";

// Type helper for validated request
export interface ValidatedRequest extends Request {
  validated: {
    body?: any;
    params?: any;
    query?: any;
  };
}

export interface RouteMeta {
  path: string;
  method: RouteMethod;
  handler: (req: ValidatedRequest) => Response | Promise<Response>;
  summary?: string;
  description?: string;
  body?: v.BaseSchema<any, any, any>;
  params?: v.BaseSchema<any, any, any>;
  query?: v.BaseSchema<any, any, any>;
  response?: v.BaseSchema<any, any, any>;
  tags?: string[];
}

const routesMeta: RouteMeta[] = [];

export const defineRoute = (meta: RouteMeta) => {
  routesMeta.push(meta);
};

// Helper function to convert Valibot schema to OpenAPI schema
const valibotToOpenAPI = (schema: v.BaseSchema<any, any, any>): any => {
  if (!schema) return {};
  
  // Basic type mapping - extend this based on your needs
  const schemaType = schema.type;
  
  switch (schemaType) {
    case 'string':
      return { type: 'string' };
    case 'number':
      return { type: 'number' };
    case 'boolean':
      return { type: 'boolean' };
    case 'object':
      const objectSchema = schema as any;
      const properties: Record<string, any> = {};
      const required: string[] = [];
      
      if (objectSchema.entries) {
        for (const [key, value] of Object.entries(objectSchema.entries)) {
          properties[key] = valibotToOpenAPI(value as v.BaseSchema<any, any, any>);
          // Add to required if not optional (you may need to adjust this logic)
          required.push(key);
        }
      }
      
      return {
        type: 'object',
        properties,
        required: required.length > 0 ? required : undefined
      };
    case 'array':
      const arraySchema = schema as any;
      return {
        type: 'array',
        items: arraySchema.item ? valibotToOpenAPI(arraySchema.item) : { type: 'string' }
      };
    default:
      return { type: 'string' };
  }
};

export const getSwaggerJson = () => {
  const paths: Record<string, any> = {};
  
  for (const route of routesMeta) {
    const { path, method, summary, description, body, params, query, response, tags } = route;
    const openapiPath = path.replace(/:([^/]+)/g, `{$1}`);
    
    paths[openapiPath] ??= {};
    
    const operation: any = {
      summary,
      description,
      tags,
      responses: {
        200: {
          description: "Success",
          content: response ? {
            'application/json': {
              schema: valibotToOpenAPI(response)
            }
          } : undefined
        },
        400: {
          description: "Bad Request"
        },
        500: {
          description: "Internal Server Error"
        }
      }
    };

    // Add parameters for path params
    if (params || path.includes(':')) {
      operation.parameters = [];
      
      // Extract path parameters
      const pathParams = path.match(/:([^/]+)/g);
      if (pathParams) {
        for (const param of pathParams) {
          const paramName = param.substring(1);
          operation.parameters.push({
            name: paramName,
            in: 'path',
            required: true,
            schema: { type: 'string' }
          });
        }
      }
      
      // Add query parameters
      if (query) {
        const querySchema = valibotToOpenAPI(query);
        if (querySchema.properties) {
          for (const [name, schema] of Object.entries(querySchema.properties)) {
            operation.parameters.push({
              name,
              in: 'query',
              required: querySchema.required?.includes(name) || false,
              schema
            });
          }
        }
      }
    }

    // Add request body for POST/PUT methods
    if (body && (method === 'POST' || method === 'PUT')) {
      operation.requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: valibotToOpenAPI(body)
          }
        }
      };
    }

    paths[openapiPath][method.toLowerCase()] = operation;
  }

  return {
    openapi: "3.0.0",
    info: { 
      title: "Bun Swagger API", 
      version: "1.0.0",
      description: "API with Valibot validation"
    },
    paths
  };
};

// Enhanced route handler with validation
const createValidatedHandler = (route: RouteMeta) => {
  return async (req: Request) => {
    try {
      let validatedData: any = {};

      // Validate request body
      if (route.body && (route.method === 'POST' || route.method === 'PUT')) {
        try {
          const body = await req.json();
          validatedData.body = v.parse(route.body, body);
        } catch (error) {
          return new Response(
            JSON.stringify({ 
              error: 'Invalid request body', 
              details: error instanceof Error ? error.message : 'Validation failed' 
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }

      // Validate path parameters
      if (route.params) {
        const url = new URL(req.url);
        const pathSegments = url.pathname.split('/');
        const routeSegments = route.path.split('/');
        const params: Record<string, string> = {};

        for (let i = 0; i < routeSegments.length; i++) {
          if (routeSegments[i].startsWith(':')) {
            const paramName = routeSegments[i].substring(1);
            params[paramName] = pathSegments[i];
          }
        }

        try {
          validatedData.params = v.parse(route.params, params);
        } catch (error) {
          return new Response(
            JSON.stringify({ 
              error: 'Invalid path parameters', 
              details: error instanceof Error ? error.message : 'Validation failed' 
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }

      // Validate query parameters
      if (route.query) {
        const url = new URL(req.url);
        const queryParams: Record<string, string> = {};
        url.searchParams.forEach((value, key) => {
          queryParams[key] = value;
        });

        try {
          validatedData.query = v.parse(route.query, queryParams);
        } catch (error) {
          return new Response(
            JSON.stringify({ 
              error: 'Invalid query parameters', 
              details: error instanceof Error ? error.message : 'Validation failed' 
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }

      // Create enhanced request object with validated data
      const enhancedReq = Object.assign(req, { 
        validated: validatedData 
      }) as ValidatedRequest;

      // Call original handler
      const response = await route.handler(enhancedReq);

      // Validate response if schema is provided
      if (route.response && response.ok) {
        try {
          const responseData = await response.clone().json();
          v.parse(route.response, responseData);
        } catch (error) {
          console.error('Response validation failed:', error);
          // In production, you might want to handle this differently
        }
      }

      return response;
    } catch (error) {
      console.error('Route handler error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  };
};

// Helper function for routes that don't need validation
export const createSimpleHandler = (handler: (req: Request) => Response | Promise<Response>) => {
  return async (req: Request) => {
    const enhancedReq = Object.assign(req, { validated: {} }) as ValidatedRequest;
    return await handler(enhancedReq);
  };
};

export const toBunRoutes = () => {
  const map: Record<string, any> = {};
  
  for (const route of routesMeta) {
    const { path, method } = route;
    map[path] ??= {};
    map[path][method] = createValidatedHandler(route);
  }
  
  return map;
};
```

```ts
// lib/routes.ts
import * as v from 'valibot';
import { defineRoute, ValidatedRequest } from "./api-router";

// Define schemas
const HelloResponseSchema = v.object({
  message: v.string(),
  method: v.optional(v.string()),
  timestamp: v.optional(v.string())
});

const PersonalizedParamsSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(50))
});

const CreateUserBodySchema = v.object({
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
  email: v.pipe(v.string(), v.email()),
  age: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(120))
});

const UserQuerySchema = v.object({
  limit: v.optional(v.pipe(v.string(), v.transform(Number), v.number(), v.integer(), v.minValue(1), v.maxValue(100))),
  offset: v.optional(v.pipe(v.string(), v.transform(Number), v.number(), v.integer(), v.minValue(0)))
});

const UserResponseSchema = v.object({
  id: v.number(),
  name: v.string(),
  email: v.string(),
  age: v.number(),
  createdAt: v.string()
});

// Basic GET route (no validation needed)
defineRoute({
  method: "GET",
  path: "/api/hello",
  summary: "Get Hello",
  description: "Returns a simple hello message",
  tags: ["greeting"],
  response: HelloResponseSchema,
  handler: async (req: ValidatedRequest) => Response.json({ 
    message: "Hello, world!", 
    method: "GET",
    timestamp: new Date().toISOString()
  })
});

// PUT route with same response (no validation needed)
defineRoute({
  method: "PUT",
  path: "/api/hello",
  summary: "Put Hello",
  description: "Updates hello message",
  tags: ["greeting"],
  response: HelloResponseSchema,
  handler: async (req: ValidatedRequest) => Response.json({ 
    message: "Hello, world!", 
    method: "PUT",
    timestamp: new Date().toISOString()
  })
});

// GET route with path parameters
defineRoute({
  method: "GET",
  path: "/api/hello/:name",
  summary: "Personalized greeting",
  description: "Returns a personalized greeting message",
  tags: ["greeting"],
  params: PersonalizedParamsSchema,
  response: HelloResponseSchema,
  handler: async (req: ValidatedRequest) => {
    const { name } = req.validated.params;
    return Response.json({ 
      message: `Hello, ${name}!`,
      method: "GET",
      timestamp: new Date().toISOString()
    });
  }
});

// POST route with body validation
defineRoute({
  method: "POST",
  path: "/api/users",
  summary: "Create User",
  description: "Creates a new user with validation",
  tags: ["users"],
  body: CreateUserBodySchema,
  response: UserResponseSchema,
  handler: async (req: ValidatedRequest) => {
    const { name, email, age } = req.validated.body;
    
    // Simulate user creation
    const newUser = {
      id: Math.floor(Math.random() * 1000),
      name,
      email,
      age,
      createdAt: new Date().toISOString()
    };

    return Response.json(newUser, { status: 201 });
  }
});

// GET route with query parameters
defineRoute({
  method: "GET",
  path: "/api/users",
  summary: "Get Users",
  description: "Retrieves users with optional pagination",
  tags: ["users"],
  query: UserQuerySchema,
  response: v.object({
    users: v.array(UserResponseSchema),
    pagination: v.object({
      limit: v.number(),
      offset: v.number(),
      total: v.number()
    })
  }),
  handler: async (req: ValidatedRequest) => {
    const { limit = 10, offset = 0 } = req.validated.query || {};
    
    // Simulate user data
    const mockUsers = Array.from({ length: limit }, (_, i) => ({
      id: offset + i + 1,
      name: `User ${offset + i + 1}`,
      email: `user${offset + i + 1}@example.com`,
      age: 20 + (i % 50),
      createdAt: new Date().toISOString()
    }));

    return Response.json({
      users: mockUsers,
      pagination: {
        limit,
        offset,
        total: 1000 // Mock total
      }
    });
  }
});

// Complex route with multiple validations
defineRoute({
  method: "PUT",
  path: "/api/users/:id",
  summary: "Update User",
  description: "Updates a user by ID with validation",
  tags: ["users"],
  params: v.object({
    id: v.pipe(v.string(), v.transform(Number), v.number(), v.integer(), v.minValue(1))
  }),
  body: v.object({
    name: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(100))),
    email: v.optional(v.pipe(v.string(), v.email())),
    age: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(120)))
  }),
  response: UserResponseSchema,
  handler: async (req: ValidatedRequest) => {
    const { id } = req.validated.params;
    const updates = req.validated.body;

    // Simulate user update
    const updatedUser = {
      id,
      name: updates.name || `User ${id}`,
      email: updates.email || `user${id}@example.com`,
      age: updates.age || 25,
      createdAt: new Date().toISOString()
    };

    return Response.json(updatedUser);
  }
});

// Route with custom validation
defineRoute({
  method: "POST",
  path: "/api/validate-data",
  summary: "Validate Complex Data",
  description: "Demonstrates advanced Valibot validation features",
  tags: ["validation"],
  body: v.object({
    username: v.pipe(
      v.string(),
      v.minLength(3),
      v.maxLength(20),
      v.regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
    ),
    password: v.pipe(
      v.string(),
      v.minLength(8),
      v.regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one lowercase, one uppercase, and one number")
    ),
    confirmPassword: v.string(),
    preferences: v.object({
      theme: v.union([v.literal("light"), v.literal("dark"), v.literal("auto")]),
      notifications: v.boolean(),
      language: v.union([v.literal("en"), v.literal("es"), v.literal("fr"), v.literal("de")])
    }),
    tags: v.array(v.pipe(v.string(), v.minLength(1), v.maxLength(20))),
    birthDate: v.pipe(v.string(), v.isoDate())
  }),
  response: v.object({
    message: v.string(),
    validatedData: v.object({
      username: v.string(),
      preferences: v.object({
        theme: v.string(),
        notifications: v.boolean(),
        language: v.string()
      }),
      tags: v.array(v.string()),
      birthDate: v.string()
    })
  }),
  handler: async (req: ValidatedRequest) => {
    const data = req.validated.body;
    
    // Additional custom validation
    if (data.password !== data.confirmPassword) {
      return Response.json(
        { error: "Passwords do not match" },
        { status: 400 }
      );
    }

    // Check if birth date is not in the future
    const birthDate = new Date(data.birthDate);
    if (birthDate > new Date()) {
      return Response.json(
        { error: "Birth date cannot be in the future" },
        { status: 400 }
      );
    }

    const { confirmPassword, password, ...safeData } = data;
    
    return Response.json({
      message: "Data validated successfully",
      validatedData: safeData
    });
  }
});
```

```ts
// src/index.tsx
import { serve } from "bun";
import index from "./index.html";
import { getSwaggerJson, toBunRoutes } from "lib/api-router";
import swaggerHTML from "public/swagger.html";
import "lib/routes";

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,
    
    // API routes with validation
    ...toBunRoutes(),
    
    // Swagger documentation
    "/swagger.json": async () =>
      new Response(JSON.stringify(getSwaggerJson(), null, 2), {
        headers: { "Content-Type": "application/json" },
      }),
    "/swagger.html": swaggerHTML,
    
    // Health check endpoint
    "/health": async () => Response.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      version: "1.0.0"
    }),
  },
   
  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,
     
    // Echo console logs from the browser to the server
    console: true,
  },
  
  port: 3000,
  
  // Error handling
  error: (error) => {
    console.error("Server error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        message: process.env.NODE_ENV === "production" ? "Something went wrong" : error.message
      }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  }
});

console.log(`🚀 Server running at ${server.url}`);
console.log(`📖 Swagger documentation: ${server.url}swagger.html`);
console.log(`📋 API schema: ${server.url}swagger.json`);
console.log(`❤️  Health check: ${server.url}health`);
```
