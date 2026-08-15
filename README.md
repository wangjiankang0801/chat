# AI 陪伴（类猫箱 · BYOK）

一个部署在 Render 上的网页版 AI 陪伴聊天应用：**自带各家大模型 API Key（BYOK）**，把你的聊天记录做成「人设」，让 AI 模仿 TA 陪你聊天。手机浏览器打开即可用，像 App 一样。

## 一、需求理解（先说清楚）

1. **像猫箱**：角色聊天界面 + 人设管理 + 陪伴对话，移动端优先。
2. **接入各种大模型 API**：DeepSeek / OpenAI / Claude / Gemini / OpenRouter / 硅基流动 / 任意 OpenAI 兼容接口，Key 自己填（BYOK）。
3. **聊天记录做人设**：
   - ⚠️ 关键澄清：在「自带 Key 调 API」的路线下，**不需要、也无法真微调**（DeepSeek 没有个人微调；OpenAI 微调贵且只能用于它的模型）。
   - 正确做法是 **人设注入**：把聊天记录提炼成「人设描述 + 说话风格 + 示例对话（few-shot）」，每次请求作为 System Prompt 喂给模型。
   - 效果：模型按 TA 的语气、习惯、你们之间发生过的事来陪你聊天。

## 二、功能规划

| 阶段 | 功能 | 状态 |
| --- | --- | --- |
| 框架 | 项目骨架、三页 UI（聊天/人设/设置）、localStorage 持久化 | ✅ 已完成 |
| 框架 | 后端代理骨架、供应商注册表、`/api/chat` 请求契约 | ✅ 已完成 |
| 框架 | Render + GitHub 部署配置 | ✅ 已完成 |
| 核心 | `/api/chat` 流式转发（SSE）+ 各家协议适配 | ⏳ 待做 |
| 核心 | 聊天页接入真实对话：人设 System Prompt + 历史 + 当前消息 | ⏳ 待做 |
| 核心 | 聊天记录文件导入：自动提炼风格标签与示例对话 | ⏳ 待做 |
| 核心 | 长对话压缩 / 记忆摘要，避免超 token | ⏳ 待做 |
| 远期 | 语音输入/输出（TTS/STT）、多角色、历史导出 | 💡 可选 |

## 三、技术架构

```
┌─────────────────────────┐        ┌──────────────────────────┐
│ 手机/电脑浏览器 (React)  │  /api  │  Render Web Service      │
│  · 聊天 / 人设 / 设置    │ ─────► │  Express 小代理           │
│  · Key/记录存 localStorage│        │  校验 → 转发 → SSE 流式    │
└─────────────────────────┘        └──────────┬───────────────┘
                                              │ 各家 LLM API
                                    ┌─────────┴──────────┐
                                    │ DeepSeek/OpenAI/   │
                                    │ Claude/Gemini/自定义│
                                    └────────────────────┘
```

- 前端：React + Vite（移动端优先、静态构建）
- 后端：Node + Express（只做代理，**不存 Key、不存聊天记录**）
- 存储：localStorage（个人单机使用零成本；跨设备同步属远期功能）
- 部署：Render 免费档单 Web Service，`render.yaml` 一键导入

## 四、目录结构

```
ai-companion/
├── render.yaml            # Render 一键部署配置
├── package.json           # 根脚本：install:all / dev / build / start
├── server/                # Node + Express 代理
│   ├── index.js           # 入口：静态托管 + /api 路由
│   ├── providers/         # 供应商注册表（加新模型改这里）
│   └── routes/chat.js     # /api/chat 契约与参数校验（核心逻辑待实现）
└── web/                   # React + Vite 前端
    └── src/
        ├── pages/         # ChatPage / PersonaPage / SettingsPage
        ├── store/         # settings / personas / chats（localStorage）
        ├── components/    # MessageBubble / PersonaCard
        └── constants/     # 前端供应商列表
```

## 五、本地运行

需要 Node 18+。

```bash
# 1. 安装全部依赖
npm run install:all

# 2. 同时启动前端(5173)和后端(3001)
npm run dev
```

浏览器打开 http://localhost:5173 ：
- 「设置」填 DeepSeek（或任意）API Key；
- 「人设」里编辑或新建人设（System Prompt + 风格 + 示例对话）；
- 「聊天」页选人设开聊（框架阶段回复为占位提示，核心逻辑接入后为真实流式回复）。

## 六、部署到 Render（配合 GitHub）

1. 在 GitHub 新建仓库，把本目录推上去：
   ```bash
   git init
   git add .
   git commit -m "ai-companion 框架"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/<仓库名>.git
   git push -u origin main
   ```
2. 打开 https://render.com → New → **Blueprint** → 选择该仓库。
3. Render 会读取 `render.yaml` 自动构建部署，完成后得到 `https://xxx.onrender.com`。
4. 之后每次 `git push` 自动重新部署。

> 免费档提示：空闲 15 分钟休眠，首次打开慢几秒属正常；Key 存浏览器端，换设备需要重新填。

## 七、安全与隐私

- API Key 只存浏览器 localStorage，仅在发消息时随请求经你的服务转发一次，服务端不落盘。
- 聊天记录同样只存本地浏览器。
- 请勿把带 Key 的 localStorage 内容截图发人；Key 泄露就去对应平台重置。
- 部署后的站点建议设访问密码或仅自己使用（可在前端加一个简单的访问码，见路线图）。

## 八、下一步（核心逻辑）

1. `server/routes/chat.js`：按 provider.type 组装请求并流式转发（openai-compatible / anthropic / gemini 三套适配）。
2. 前端 `ChatPage`：组装 `system`（人设注入）+ 历史 + 当前消息 → `POST /api/chat` → SSE 流式渲染。
3. 人设注入模板：System Prompt = 人设描述 + 风格 + 示例对话 + 长期记忆（核心逻辑阶段实现组装器）。
4. 聊天记录导入：解析 txt / 导出文件 → 自动抽取风格、高频口头禅、示例片段。