/* eslint-disable @typescript-eslint/no-explicit-any */

import { useSearchParams } from "next/navigation";

// Define the return types separately for better clarity
type RouteWithParams<T extends Record<string, string>> = {
  build: (params: T) => string;
  Parse: () => Partial<T>;
};

type RouteWithoutParams = {
  build: () => string;
  Parse: () => Partial<Record<string, string>>;
};

class CustomRoute {
  private BASE: string;

  constructor({ baseUrl }: { baseUrl: string }) {
    this.BASE = baseUrl;
  }

  // For routes without params
  create(path: string): RouteWithoutParams;

  // For routes with params
  create<T extends Record<string, string>>(path: string): RouteWithParams<T>;

  // Implementation
  create<T extends Record<string, string>>(path: string) {
    // This is just for TypeScript's benefit - the actual runtime behavior is defined below
    const hasTypeParameter = false;

    if (hasTypeParameter) {
      // This branch is never taken at runtime due to type erasure
      return {} as RouteWithParams<T>;
    } else {
      return {
        build: ((params?: any) => {
          // Check if params exist and have keys
          if (params && Object.keys(params).length > 0) {
            // Convert params to query string manually
            const queryParts: string[] = [];
            for (const key in params) {
              if (params.hasOwnProperty(key)) {
                queryParts.push(
                  `${encodeURIComponent(key)}=${encodeURIComponent(
                    params[key]
                  )}`
                );
              }
            }
            const queryString = queryParts.join("&");
            return `${this.BASE}${path}?${queryString}`;
          }
          return `${this.BASE}${path}`;
        }) as any,

        Parse: () => {
          // const queryString = url.includes("?") ? url.split("?")[1] : url;
          const params = new URLSearchParams(useSearchParams());
          const result: Record<string, string> = {};

          params.forEach((value, key) => {
            result[key] = value;
          });

          return result as any;
        },
      } as any; // Use 'any' to bridge the gap between runtime and type-time
    }
  }
}
export default CustomRoute;
