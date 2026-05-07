import sqlite3
import json
import os
import uuid
import time
import random
import httpx
import threading
from flask import Flask, request, jsonify, send_from_directory, Response, stream_with_context
from flask_cors import CORS
from config import SECRET_KEY, DATABASE, DEFAULT_API_BASE, DEFAULT_MODEL

app = Flask(__name__, template_folder='templates')
app.secret_key = SECRET_KEY
CORS(app)

# ========== 全局停止标志 ==========
stop_flags = {}  # session_id -> threading.Event

# ========== 数据库 ==========

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.execute('''CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        avatar TEXT DEFAULT '🤖',
        system_prompt TEXT DEFAULT '',
        api_base TEXT NOT NULL,
        api_key TEXT NOT NULL,
        model TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        enabled INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    conn.execute('''CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        agent_id TEXT,
        agent_name TEXT,
        agent_avatar TEXT,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    conn.commit()
    conn.close()

init_db()

# ========== 初始化默认 AI 角色 ==========
def init_default_agents():
    conn = get_db()
    count = conn.execute('SELECT COUNT(*) FROM agents').fetchone()[0]
    if count == 0:
        # 只在数据库为空时创建默认角色
        defaults = [
            {
                'id': 'default-1',
                'name': '小助手',
                'avatar': '🤖',
                'system_prompt': '你是一个友善热情的AI助手，名叫小助手。你说话风格活泼开朗，喜欢用表情符号。你擅长解答各种问题，总是乐于帮助别人。在群聊中你会主动和其他人互动。',
                'api_base': 'https://api.deepseek.com/v1',
                'api_key': 'sk-78efc6fbedaf402e9ccd85487c00ac2b',
                'model': 'deepseek-chat',
                'sort_order': 0,
            },
            {
                'id': 'default-2',
                'name': '小智',
                'avatar': '🧠',
                'system_prompt': '你是一个沉稳睿智的AI助手，名叫小智。你说话风格冷静理性，喜欢深入分析问题。你有丰富的知识储备，在群聊中你会从不同角度思考问题，给出有深度的见解。',
                'api_base': 'https://api.deepseek.com/v1',
                'api_key': 'sk-174ccba7f307416aa916e4234b569143',
                'model': 'deepseek-chat',
                'sort_order': 1,
            },
        ]
        for a in defaults:
            conn.execute(
                'INSERT INTO agents (id, name, avatar, system_prompt, api_base, api_key, model, sort_order) VALUES (?,?,?,?,?,?,?,?)',
                (a['id'], a['name'], a['avatar'], a['system_prompt'], a['api_base'], a['api_key'], a['model'], a['sort_order'])
            )
        conn.commit()
        print("[Init] ✅ 已创建 2 个默认 AI 角色：小助手、小智")
    conn.close()

init_default_agents()

# ========== 页面路由 ==========

@app.route('/')
def index():
    return send_from_directory('templates', 'index.html')

# ========== AI 角色 CRUD ==========

@app.route('/api/agents', methods=['GET'])
def list_agents():
    conn = get_db()
    rows = conn.execute('SELECT * FROM agents ORDER BY sort_order ASC, created_at ASC').fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])

@app.route('/api/agents', methods=['POST'])
def create_agent():
    data = request.json
    agent_id = str(uuid.uuid4())[:8]
    conn = get_db()
    conn.execute(
        'INSERT INTO agents (id, name, avatar, system_prompt, api_base, api_key, model, sort_order) VALUES (?,?,?,?,?,?,?,?)',
        (agent_id, data.get('name','AI助手'), data.get('avatar','🤖'), data.get('system_prompt',''),
         data.get('api_base', DEFAULT_API_BASE), data.get('api_key',''), data.get('model', DEFAULT_MODEL),
         data.get('sort_order', 0))
    )
    conn.commit()
    conn.close()
    return jsonify({'id': agent_id, 'message': '创建成功'})

@app.route('/api/agents/<agent_id>', methods=['PUT'])
def update_agent(agent_id):
    data = request.json
    conn = get_db()
    conn.execute(
        'UPDATE agents SET name=?, avatar=?, system_prompt=?, api_base=?, api_key=?, model=?, sort_order=?, enabled=? WHERE id=?',
        (data.get('name','AI助手'), data.get('avatar','🤖'), data.get('system_prompt',''),
         data.get('api_base', DEFAULT_API_BASE), data.get('api_key',''), data.get('model', DEFAULT_MODEL),
         data.get('sort_order', 0), data.get('enabled', 1), agent_id)
    )
    conn.commit()
    conn.close()
    return jsonify({'message': '更新成功'})

@app.route('/api/agents/<agent_id>', methods=['DELETE'])
def delete_agent(agent_id):
    conn = get_db()
    conn.execute('DELETE FROM agents WHERE id=?', (agent_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': '删除成功'})

# ========== 聊天 API ==========

@app.route('/api/messages', methods=['GET'])
def get_messages():
    session_id = request.args.get('session_id', 'default')
    conn = get_db()
    rows = conn.execute('SELECT * FROM messages WHERE session_id=? ORDER BY created_at ASC', (session_id,)).fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])

@app.route('/api/messages', methods=['POST'])
def send_message():
    """用户发送消息，触发所有 AI 回复"""
    data = request.json
    session_id = data.get('session_id', 'default')
    content = data.get('content', '').strip()
    if not content:
        return jsonify({'error': '消息不能为空'}), 400

    conn = get_db()
    conn.execute(
        'INSERT INTO messages (session_id, role, agent_id, agent_name, agent_avatar, content) VALUES (?,?,?,?,?,?)',
        (session_id, 'user', None, '我', '😊', content)
    )
    conn.commit()
    agents = conn.execute('SELECT * FROM agents WHERE enabled=1 ORDER BY sort_order ASC, created_at ASC').fetchall()
    conn.close()
    agents = [dict(a) for a in agents]

    if not agents:
        return jsonify({'message': '消息已发送', 'ai_count': 0})

    return Response(
        stream_with_context(stream_round_robin(session_id, agents, trigger='user')),
        mimetype='text/event-stream',
        headers={'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no'}
    )

@app.route('/api/auto-chat', methods=['POST'])
def auto_chat():
    """AI 自动对话，用户旁听"""
    data = request.json
    session_id = data.get('session_id', 'default')
    topic = data.get('topic', '').strip()
    max_rounds = data.get('max_rounds', 15)

    conn = get_db()
    agents = conn.execute('SELECT * FROM agents WHERE enabled=1 ORDER BY sort_order ASC, created_at ASC').fetchall()
    conn.close()
    agents = [dict(a) for a in agents]

    if len(agents) < 2:
        return jsonify({'error': '至少需要 2 个 AI 成员才能自动群聊'}), 400

    # 如果有话题，插入一条系统消息
    if topic:
        conn = get_db()
        conn.execute(
            'INSERT INTO messages (session_id, role, agent_id, agent_name, agent_avatar, content) VALUES (?,?,?,?,?,?)',
            (session_id, 'system', None, '系统', '📢', f'群主发起话题：{topic}')
        )
        conn.commit()
        conn.close()

    # 创建停止标志
    stop_event = threading.Event()
    stop_flags[session_id] = stop_event

    return Response(
        stream_with_context(stream_auto_chat(session_id, agents, max_rounds, stop_event)),
        mimetype='text/event-stream',
        headers={'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no'}
    )

@app.route('/api/stop-chat', methods=['POST'])
def stop_chat():
    """停止自动对话"""
    session_id = request.json.get('session_id', 'default')
    if session_id in stop_flags:
        stop_flags[session_id].set()
    return jsonify({'message': '正在停止...'})

@app.route('/api/clear', methods=['POST'])
def clear_messages():
    session_id = request.json.get('session_id', 'default')
    conn = get_db()
    conn.execute('DELETE FROM messages WHERE session_id=?', (session_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': '聊天记录已清空'})


# ========== 核心：轮流回复流 ==========

def stream_round_robin(session_id, agents, trigger='user'):
    """一轮 AI 回复（用户发消息后触发）"""
    for agent in agents:
        if session_id in stop_flags and stop_flags[session_id].is_set():
            break
        yield from stream_single_reply(session_id, agent)
    yield f"data: {json.dumps({'type': 'all_done'}, ensure_ascii=False)}\n\n"


def stream_auto_chat(session_id, agents, max_rounds, stop_event):
    """AI 自动对话，多轮循环"""
    for round_num in range(max_rounds):
        if stop_event.is_set():
            break
        # 通知前端：新一轮
        yield f"data: {json.dumps({'type': 'round', 'round': round_num + 1}, ensure_ascii=False)}\n\n"
        for agent in agents:
            if stop_event.is_set():
                break
            yield from stream_single_reply(session_id, agent)
    yield f"data: {json.dumps({'type': 'all_done'}, ensure_ascii=False)}\n\n"
    # 清理
    if session_id in stop_flags:
        del stop_flags[session_id]


def stream_single_reply(session_id, agent):
    """单个 AI 回复一次"""
    msg_id = f"{agent['id']}-{uuid.uuid4().hex[:6]}"
    try:
        # 模拟思考延迟 1-3 秒
        think_time = random.uniform(1.0, 3.0)
        yield f"data: {json.dumps({'type': 'agent_thinking', 'msg_id': msg_id, 'agent_id': agent['id'], 'agent_name': agent['name'], 'agent_avatar': agent['avatar'], 'think_time': round(think_time, 1)}, ensure_ascii=False)}\n\n"
        time.sleep(think_time)

        yield f"data: {json.dumps({'type': 'agent_start', 'msg_id': msg_id, 'agent_id': agent['id'], 'agent_name': agent['name'], 'agent_avatar': agent['avatar']}, ensure_ascii=False)}\n\n"

        # 获取聊天历史（限制最近30条，防止token超限）
        conn = get_db()
        rows = conn.execute(
            'SELECT role, agent_name, content FROM messages WHERE session_id=? ORDER BY created_at DESC LIMIT 30',
            (session_id,)
        ).fetchall()
        conn.close()
        # 反转为时间正序
        rows = list(reversed(rows))

        # 构建 messages
        messages = [{'role': 'system', 'content': agent['system_prompt']}]
        for row in rows:
            r = dict(row)
            if r['role'] == 'user':
                messages.append({'role': 'user', 'content': f"[群主] {r['content']}"})
            elif r['role'] == 'system':
                messages.append({'role': 'user', 'content': f"[系统] {r['content']}"})
            else:
                messages.append({'role': 'assistant', 'content': f"[{r['agent_name']}] {r['content']}"})

        messages.append({
            'role': 'user',
            'content': f'现在轮到你（{agent["name"]}）在群里发言了。请以你的角色身份回复，直接说你想说的话，不要加角色名前缀。保持简洁自然，像在群里聊天一样。回复控制在3-5句话以内。'
        })

        # 流式调用
        full_reply = ''
        for chunk in call_ai_api_stream(agent, messages):
            full_reply += chunk
            yield f"data: {json.dumps({'type': 'agent_chunk', 'msg_id': msg_id, 'agent_id': agent['id'], 'content': chunk}, ensure_ascii=False)}\n\n"

        # 保存
        if full_reply.strip():
            conn = get_db()
            conn.execute(
                'INSERT INTO messages (session_id, role, agent_id, agent_name, agent_avatar, content) VALUES (?,?,?,?,?,?)',
                (session_id, 'assistant', agent['id'], agent['name'], agent['avatar'], full_reply.strip())
            )
            conn.commit()
            conn.close()

        yield f"data: {json.dumps({'type': 'agent_end', 'msg_id': msg_id, 'agent_id': agent['id']}, ensure_ascii=False)}\n\n"

    except Exception as e:
        error_msg = f"[系统] {agent['name']} 回复失败: {str(e)}"
        yield f"data: {json.dumps({'type': 'agent_error', 'msg_id': msg_id, 'agent_id': agent['id'], 'content': error_msg}, ensure_ascii=False)}\n\n"
        conn = get_db()
        conn.execute(
            'INSERT INTO messages (session_id, role, agent_id, agent_name, agent_avatar, content) VALUES (?,?,?,?,?,?)',
            (session_id, 'system', agent['id'], agent['name'], agent['avatar'], error_msg)
        )
        conn.commit()
        conn.close()


def call_ai_api_stream(agent, messages):
    """调用 OpenAI 兼容 API（流式）"""
    api_base = agent['api_base'].rstrip('/')
    url = f"{api_base}/chat/completions"
    headers = {'Content-Type': 'application/json', 'Authorization': f"Bearer {agent['api_key']}"}
    payload = {'model': agent['model'], 'messages': messages, 'stream': True, 'max_tokens': 800, 'temperature': 0.85}

    with httpx.Client(timeout=120.0) as client:
        with client.stream('POST', url, json=payload, headers=headers) as response:
            if response.status_code != 200:
                error_body = ''
                for chunk in response.iter_text():
                    error_body += chunk
                raise Exception(f"API 错误 {response.status_code}: {error_body[:200]}")

            buffer = ''
            for chunk in response.iter_text():
                buffer += chunk
                while '\n' in buffer:
                    line, buffer = buffer.split('\n', 1)
                    line = line.strip()
                    if not line or line == 'data: [DONE]':
                        continue
                    if line.startswith('data: '):
                        try:
                            data = json.loads(line[6:])
                            choices = data.get('choices', [])
                            if choices:
                                delta = choices[0].get('delta', {})
                                content = delta.get('content', '')
                                if content:
                                    yield content
                        except json.JSONDecodeError:
                            continue


if __name__ == '__main__':
    print("=" * 50)
    print("  AI 群聊 v1.1")
    print("  预设角色: 小助手🤖 + 小智🧠")
    print("=" * 50)
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
