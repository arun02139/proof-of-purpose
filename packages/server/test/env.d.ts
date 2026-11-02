import type { D1Migration } from "@cloudflare/vitest-plugin";
import type { Env } from "../src/app";

declare global {
  namespace Cloudflare {
    interface Env {
      DB: D1Database;
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}

export type { Env };
