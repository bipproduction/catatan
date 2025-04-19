"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-empty-object-type */
type QueryParams = Record<string, string | number | boolean>;

type RouterLeaf<T extends QueryParams = {}> = {
  get: () => string;
  query: (params: T) => string;
  parse: (searchParams: URLSearchParams) => T;
};

// Helper type to convert dashes to camelCase
type DashToCamelCase<S extends string> = S extends `${infer F}-${infer R}`
  ? `${F}${Capitalize<DashToCamelCase<R>>}`
  : S;

// Modified RouterPath to handle dash conversion
type RouterPath<
  T extends QueryParams = {},
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

export class WibuRouter<Routes = {}> {
  private tree: any = {};
  private prefix: string = "";
  private name: string = "";
  private querySchemas: Map<string, any> = new Map();

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
    T extends QueryParams = {}
  >(
    path: Path,
    querySchema?: { query: T }
  ): WibuRouter<
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

    // Store the query schema for this path
    if (querySchema) {
      this.querySchemas.set(fullPath, querySchema.query);
    }

    const handleQuery = (params: T): string => {
      if (!params || Object.keys(params).length === 0) return fullPath;
      const queryString = Object.entries(params)
        .map(
          ([key, value]) =>
            `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
        )
        .join("&");
      return `${fullPath}?${queryString}`;
    };

    const handleGet = () => fullPath;

    const handleParse = (searchParams: URLSearchParams): T => {
      const schema = this.querySchemas.get(fullPath) || {};
      const result: Record<string, any> = {};

      for (const key in schema) {
        const value = searchParams.get(key);
        const type = schema[key];

        if (value !== null) {
          if (type === "number") {
            result[key] = Number(value);
          } else if (type === "boolean") {
            result[key] = value === "true";
          } else {
            result[key] = value;
          }
        } else {
          // Default value if not present
          if (type === "number") {
            result[key] = 0;
          } else if (type === "boolean") {
            result[key] = false;
          } else {
            result[key] = "";
          }
        }
      }

      return result as T;
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
    childRouter: WibuRouter<ChildRoutes>
  ): WibuRouter<Routes & Record<DashToCamelCase<N>, ChildRoutes>> {
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

            const result: Record<string, any> = {};
            if (schema) {
              for (const key in schema) {
                const value = searchParams.get(key);
                const type = schema[key];

                if (value !== null) {
                  if (type === "number") {
                    result[key] = Number(value);
                  } else if (type === "boolean") {
                    result[key] = value === "true";
                  } else {
                    result[key] = value;
                  }
                } else {
                  if (type === "number") {
                    result[key] = 0;
                  } else if (type === "boolean") {
                    result[key] = false;
                  } else {
                    result[key] = "";
                  }
                }
              }
            }

            return result;
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

export default WibuRouter;
