/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-empty-object-type */
type QueryParams = Record<string, string | number | boolean>;

type RouterLeaf<T extends QueryParams = {}> = {
  get: () => string;
  query: (params: T) => string;
  parse: () => T;
};

// Helper type to convert dashes to camelCase
type DashToCamelCase<S extends string> = 
  S extends `${infer F}-${infer R}`
    ? `${F}${Capitalize<DashToCamelCase<R>>}`
    : S;

// Modified RouterPath to handle dash conversion
type RouterPath<T extends QueryParams = {}, Segments extends string[] = []> =
  Segments extends [infer Head extends string, ...infer Tail extends string[]]
    ? { [K in DashToCamelCase<Head>]: RouterPath<T, Tail> }
    : RouterLeaf<T>;

type RemoveLeadingSlash<S extends string> =
  S extends `/${infer Rest}` ? Rest : S;

type SplitPath<S extends string> =
  S extends `${infer Head}/${infer Tail}`
    ? [Head, ...SplitPath<Tail>]
    : S extends "" ? [] : [S];

type WibuRouterOptions = {
  prefix?: string;
  name?: string;
  useSearchParams?: () => URLSearchParams;
};

export class WibuRouter<Routes = {}> {
  private tree: any = {};
  private prefix: string = "";
  private name: string = "";
  private useSearchParams: () => URLSearchParams;

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

    // Initialize useSearchParams with a default implementation or the provided one
    this.useSearchParams = options?.useSearchParams || (() => {
      // Default implementation that works in browser environments
      if (typeof window !== 'undefined') {
        return new URLSearchParams(window.location.search);
      }
      return new URLSearchParams();
    });
  }

  // Set the useSearchParams function
  setSearchParamsHook(useSearchParamsHook: () => URLSearchParams): void {
    this.useSearchParams = useSearchParamsHook;
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
  ): WibuRouter<Routes & { [K in Segments[0] as DashToCamelCase<K>]: RouterPath<T, Segments extends [any, ...infer Rest] ? Rest : []> }> {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const fullPath = `${this.prefix}${normalizedPath}`;
    const segments = normalizedPath.split("/").filter(Boolean);

    const handleQuery = (params: T): string => {
      if (!params || Object.keys(params).length === 0) return fullPath;
      const queryString = Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join("&");
      return `${fullPath}?${queryString}`;
    };

    const handleGet = () => fullPath;

    const handleParse = (): T => {
      const params = this.useSearchParams();
      const result: Record<string, string> = {};

      params.forEach((value, key) => {
        result[key] = value;
      });

      return result as unknown as T;
    };

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
    
    // Create a deep copy of the child router's tree with updated paths
    const updatePaths = (obj: any, parentPath: string): any => {
      const result: any = {};
      
      for (const key in obj) {
        if (key === 'get' && typeof obj[key] === 'function') {
          // Update the get function to include the parent path
          result[key] = () => `${this.prefix}${parentPath}`;
        } else if (key === 'query' && typeof obj[key] === 'function') {
          // Update the query function to include the parent path
          result[key] = (params: any) => {
            if (!params || Object.keys(params).length === 0) return `${this.prefix}${parentPath}`;
            const queryString = Object.entries(params)
              .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
              .join("&");
            return `${this.prefix}${parentPath}?${queryString}`;
          };
        } else if (key === 'parse' && typeof obj[key] === 'function') {
          // Keep the parse function as is since it uses the router's useSearchParams
          result[key] = obj[key];
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          result[key] = updatePaths(obj[key], parentPath);
        } else {
          result[key] = obj[key];
        }
      }
      
      return result;
    };
    
    // Copy the child router's tree into this router
    this.tree[camelName] = updatePaths((childRouter as any).tree, childRouter.prefix);
    
    return this as any;
  }

  // Allow access to the tree with strong typing
  get routes(): Routes {
    return this.tree as Routes;
  }
}

export default WibuRouter;
