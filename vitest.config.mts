import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // "server-only"는 번들러 밖(Node 테스트)에서 import하면 throw하므로 빈 모듈로 대체한다.
      "server-only": path.resolve(__dirname, "src/test/server-only-stub.ts"),
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
  },
});
