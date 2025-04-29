"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-empty-object-type */
import { z } from "zod";

type RouterLeaf<T extends z.ZodType = z.ZodObject<{}>> = {
  get: () => string;
  query: (params: z.infer<T>) => string;
  parse: (searchParams: URLSearchParams) => z.infer<T>;
};

// Helper type to convert dashes to camelCase
type DashToCamelCase<S extends string> = S extends `${infer F}-${infer R}`
  ? `${F}${Capitalize<DashToCamelCase<R>>}`
  : S;

// Modified RouterPath to handle dash conversion
type RouterPath<
  T extends z.ZodType = z.ZodObject<{}>,
  Segments extends string[] = []
> = Segments extends [infer Head extends string, ...infer Tail extends string[]]
  ? { [K in DashToCamelCase<Head>]: RouterPath<T, Tail> }
  : RouterLeaf<T>;

type RemoveLeadingSlash<S extends string> = S extends `/${infer Rest}`
  ? Rest
  : S;

type SplitPath<S extends string> = S extends `${infer Head}/${infer Tail}`
  ? [Head, ...SplitPath<Tail>]
  : S extends ""
  ? []
  : [S];

type WibuRouterOptions = {
  prefix?: string;
  name?: string;
};

export class V2ClientRouter<Routes = {}> {
  private tree: any = {};
  private prefix: string = "";
  private name: string = "";
  private querySchemas: Map<string, z.ZodType> = new Map();

  constructor(options?: WibuRouterOptions) {
    if (options?.prefix) {
      // Ensure prefix starts with / and doesn't end with /
      this.prefix = options.prefix.startsWith("/")
        ? options.prefix
        : `/${options.prefix}`;

      if (this.prefix.endsWith("/")) {
        this.prefix = this.prefix.slice(0, -1);
      }
    }

    if (options?.name) {
      this.name = options.name;
    }
  }

  // Convert dash-case to camelCase
  private toCamelCase(str: string): string {
    return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  }

  add<
    Path extends string,
    NormalizedPath extends string = RemoveLeadingSlash<Path>,
    Segments extends string[] = SplitPath<NormalizedPath>,
    T extends z.ZodType = z.ZodObject<{}>
  >(
    path: Path,
    schema?: { query: T }
  ): V2ClientRouter<
    Routes &
      (NormalizedPath extends ""
        ? RouterLeaf<T>
        : {
            [K in Segments[0] as DashToCamelCase<K>]: RouterPath<
              T,
              Segments extends [any, ...infer Rest] ? Rest : []
            >;
          })
  > {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const fullPath = `${this.prefix}${normalizedPath}`;
    const segments = normalizedPath.split("/").filter(Boolean);

    // Store the Zod schema for this path
    if (schema) {
      this.querySchemas.set(fullPath, schema.query);
    } else {
      // Default empty schema
      this.querySchemas.set(fullPath, z.object({}));
    }

    const handleQuery = (params: any): string => {
      if (!params || Object.keys(params).length === 0) return fullPath;

      // Validate params against schema
      const schema = this.querySchemas.get(fullPath);
      if (schema) {
        try {
          schema.parse(params);
        } catch (error) {
          console.error("Query params validation failed:", error);
          throw new Error("Invalid query parameters");
        }
      }

      const queryString = Object.entries(params)
        .map(
          ([key, value]) =>
            `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
        )
        .join("&");
      return `${fullPath}?${queryString}`;
    };

    const handleGet = () => fullPath;

    const handleParse = (searchParams: URLSearchParams): any => {
      const schema = this.querySchemas.get(fullPath);
      if (!schema) return {};

      // Convert URLSearchParams to object
      const queryObject: Record<string, any> = {};
      searchParams.forEach((value, key) => {
        queryObject[key] = value;
      });

      // Parse through Zod schema
      try {
        return schema.parse(queryObject);
      } catch (error) {
        console.error("Failed to parse search params:", error);
        // Return safe default values
        const safeParsed = schema.safeParse(queryObject);
        if (safeParsed.success) {
          return safeParsed.data;
        }
        return {};
      }
    };

    // Special case for root path "/"
    if (segments.length === 0) {
      this.tree.get = handleGet;
      this.tree.query = handleQuery;
      this.tree.parse = handleParse;
    } else {
      let current = this.tree;
      for (const segment of segments) {
        // Use camelCase version for the property name
        const camelSegment = this.toCamelCase(segment);
        if (!current[camelSegment]) {
          current[camelSegment] = {};
        }
        current = current[camelSegment];
      }

      current.get = handleGet;
      current.query = handleQuery;
      current.parse = handleParse;
    }

    return this as any;
  }

  // Add a method to incorporate another router's routes into this one
  use<N extends string, ChildRoutes>(
    name: N,
    childRouter: V2ClientRouter<ChildRoutes>
  ): V2ClientRouter<Routes & Record<DashToCamelCase<N>, ChildRoutes>> {
    const camelName = this.toCamelCase(name);

    if (!this.tree[camelName]) {
      this.tree[camelName] = {};
    }

    // Copy query schemas from child router
    childRouter.querySchemas.forEach((schema, path) => {
      const newPath = `${this.prefix}/${name}${path.substring(
        childRouter.prefix.length
      )}`;
      this.querySchemas.set(newPath, schema);
    });

    // Create a deep copy of the child router's tree with updated paths
    const updatePaths = (obj: any, childPrefix: string): any => {
      const result: any = {};

      for (const key in obj) {
        if (key === "get" && typeof obj[key] === "function") {
          // Capture the original path from the child router
          const originalPath = obj[key]();
          // Create a new function that returns the combined path
          result[key] = () => {
            const newPath = `${this.prefix}/${name}${originalPath.substring(
              childPrefix.length
            )}`;
            return newPath;
          };
        } else if (key === "query" && typeof obj[key] === "function") {
          // Capture the child router's prefix for path adjustment
          result[key] = (params: any) => {
            // Get the original result without query params
            const originalPathWithoutParams = obj["get"]();
            // Create the proper path with our parent prefix
            const newBasePath = `${
              this.prefix
            }/${name}${originalPathWithoutParams.substring(
              childPrefix.length
            )}`;

            // Add query params if any
            if (!params || Object.keys(params).length === 0) return newBasePath;

            // Validate params against schema
            const newPath = `${
              this.prefix
            }/${name}${originalPathWithoutParams.substring(
              childPrefix.length
            )}`;
            const schema = this.querySchemas.get(newPath);

            if (schema) {
              try {
                schema.parse(params);
              } catch (error) {
                console.error("Query params validation failed:", error);
                throw new Error("Invalid query parameters");
              }
            }

            const queryString = Object.entries(params)
              .map(
                ([k, v]) =>
                  `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`
              )
              .join("&");
            return `${newBasePath}?${queryString}`;
          };
        } else if (key === "parse" && typeof obj[key] === "function") {
          result[key] = (searchParams: URLSearchParams) => {
            const originalPath = obj["get"]();
            const newPath = `${this.prefix}/${name}${originalPath.substring(
              childPrefix.length
            )}`;
            const schema = this.querySchemas.get(newPath);

            if (!schema) return {};

            // Convert URLSearchParams to object
            const queryObject: Record<string, any> = {};
            searchParams.forEach((value, key) => {
              queryObject[key] = value;
            });

            // Parse through Zod schema
            try {
              return schema.parse(queryObject);
            } catch (error) {
              console.error("Failed to parse search params:", error);
              // Return safe default values
              const safeParsed = schema.safeParse(queryObject);
              if (safeParsed.success) {
                return safeParsed.data;
              }
              return {};
            }
          };
        } else if (typeof obj[key] === "object" && obj[key] !== null) {
          result[key] = updatePaths(obj[key], childPrefix);
        } else {
          result[key] = obj[key];
        }
      }

      return result;
    };

    // Copy the child router's tree into this router
    this.tree[camelName] = updatePaths(
      (childRouter as any).tree,
      childRouter.prefix
    );

    return this as any;
  }

  // Allow access to the tree with strong typing
  get routes(): Routes {
    return this.tree as Routes;
  }
}

export default V2ClientRouter;
