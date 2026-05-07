import os

# 基础配置
SECRET_KEY = os.environ.get("SECRET_KEY", "ai-group-chat-secret-key-2024")
DATABASE = os.environ.get("DATABASE", "group_chat.db")

# DeepSeek 默认配置
DEFAULT_API_BASE = "https://api.deepseek.com/v1"
DEFAULT_MODEL = "deepseek-chat"
