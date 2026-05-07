# AI 群聊

一个支持多 AI 角色同时参与群聊的 Web 应用。你可以自由添加多个 AI 角色，每个角色使用不同的 API 和人设，发送消息后所有 AI 会轮流回复。

## 功能特性

- 🤖 **多 AI 角色** — 自由添加/编辑/删除 AI 成员
- 🎭 **角色扮演** — 每个 AI 有独立的人设和性格
- 🔌 **多 API 支持** — 兼容 OpenAI 格式的 API（DeepSeek、OpenAI、Kimi 等）
- 📱 **手机友好** — 响应式设计，移动端体验优先
- 💬 **流式回复** — 实时打字机效果
- 🌐 **一键部署** — 支持 Render 部署

## 本地运行

```bash
# 安装依赖
pip install -r requirements.txt

# 启动服务
python app.py

# 访问 http://localhost:5000
```

## 部署到 Render

1. 将项目推送到 GitHub
2. 在 Render 中新建 Web Service
3. 连接 GitHub 仓库
4. Render 会自动识别 `render.yaml` 配置
5. 部署完成后即可通过公网访问

## 使用方法

1. 打开应用，进入 **⚙️ 群设置** 页面
2. 点击 **➕ 添加 AI 成员**
3. 填写昵称、头像、人设、API 地址、API Key、模型名
4. 保存后回到 **💬 聊天** 页面
5. 发送消息，所有 AI 会轮流回复
6. 点击 **🎭 群聊** 让 AI 自己聊天（旁听模式）
7. 点击 **🔄 新话题** 清空记录，开始新对话

## API 兼容性

支持所有 OpenAI 格式的 API：

| API 服务 | API 地址 | 模型名 |
|---------|---------|--------|
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| Kimi | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` |
| 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-turbo` |

## 项目结构

```
ai-group-chat/
├── app.py              # Flask 后端主文件
├── config.py           # 基础配置
├── requirements.txt    # Python 依赖
├── Procfile            # Render 部署配置
├── render.yaml         # Render 服务配置
├── .gitignore
└── templates/
    └── index.html      # 前端界面（单文件）
