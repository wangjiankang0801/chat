import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // 监听 0.0.0.0，允许手机/局域网访问
    port: 5173,
    proxy: {
      // 开发时把 /api 转发给 Express（server 默认 3001 端口）
      "/api": "http://localhost:3001",
    },
  },
  build: {
    outDir: "dist",
  },
});