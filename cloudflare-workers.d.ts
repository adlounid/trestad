interface D1Result<Result = unknown> {
  results: Result[];
  success: boolean;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run<Result = Record<string, unknown>>(): Promise<D1Result<Result>>;
  all<Result = Record<string, unknown>>(): Promise<D1Result<Result>>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<Result = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<Result>[]>;
}

declare module "cloudflare:workers" {
  export const env: {
    DB: D1Database;
  };
}
