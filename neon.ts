import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  // Declare your Neon services here
  auth: false,
  functions: {
    kepplerapi: {
      name: "Keppler API",
      source: "server/function.ts",
      env: {
        TOKEN_ENCRYPTION_KEY: process.env.TOKEN_ENCRYPTION_KEY!,
        ALLOWED_ORIGINS: "null,http://127.0.0.1:5173,http://localhost:5173",
        NODE_ENV: "production",
      },
    },
  },
  // Branch policy: per-branch tuning
  branch: (branch) => {
    if (branch.isDefault) {
      // Default branch: no overrides, uses project defaults
      return {};
    }
    if (!branch.exists) {
      // New non-default branches: auto-expire
      // Run `neon checkout <name>` to create a new branch with these settings
      return { ttl: "7d" };
    }
    // Existing branch: no changes
    return {};
  },
});
