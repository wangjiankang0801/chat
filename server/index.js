import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import chatRouter from "./routes/chat.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "15mb" }));

// 健康检查（Render 可用它确认服务存活）
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "ai-companion", framework: "v0.1.0" });
});

// 聊天代理：框架阶段，路由内做参数校验，核心转发逻辑待实现
app.use("/api/chat", chatRouter);

// 生产环境：托管前端构建产物（单服务部署）
const dist = path.join(__dirname, "../web/dist");
app.use(express.static(dist));
app.get(/.*/, (_req, res, next) => {
  if (process.env.NODE_ENV === "production") {
    return res.sendFile(path.join(dist, "index.html"));
  }
  next();
});

// 仅当直接运行本文件时监听端口（供测试脚本 import app）
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  app.listen(PORT, () => {
    console.log(`[ai-companion] server listening on http://localhost:${PORT}`);
  });
}