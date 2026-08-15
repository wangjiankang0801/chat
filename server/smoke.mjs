// 冒烟测试：node smoke.mjs
// 进程内起服务，验证 /api/health 与 /api/chat 的参数校验
import { app } from "./index.js";

const server = app.listen(0, async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const j = (r) => r.json();

  const health = await j(await fetch(`${base}/api/health`));
  console.log("health:", JSON.stringify(health));

  const ok = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      provider: "deepseek",
      apiKey: "sk-test",
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: "hi" }],
    }),
  });
  console.log("chat(valid) ->", ok.status, JSON.stringify(await ok.json()));

  const bad = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ provider: "deepseek", model: "x", messages: [] }),
  });
  console.log("chat(invalid) ->", bad.status, JSON.stringify(await bad.json()));

  const unknown = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ provider: "nope", apiKey: "k", model: "m", messages: [{ role: "user", content: "hi" }] }),
  });
  console.log("chat(unknown provider) ->", unknown.status, JSON.stringify(await unknown.json()));

  server.close();
  console.log("smoke OK");
});