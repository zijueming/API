import json
import webbrowser
import threading
import time
from typing import Iterator

from flask import Flask, Response, render_template, request, send_from_directory
from cozepy import (
    Coze,
    TokenAuth,
    Message,
    ChatEventType,
    COZE_CN_BASE_URL,
)

from tts_helper import synthesize_to_wav

# 直接在此处配置令牌与 Bot 信息，避免额外配置文件，便于快速实验。
COZE_API_TOKEN = "pat_0HpPwRdjmxWbr0vnNK9n58BN9pQmb23bE2AKe68P9lso4lEGKZ7zXxGk2CWxezwL"
BOT_ID = "7570384433388584987"
USER_ID = "123"


coze = Coze(auth=TokenAuth(token=COZE_API_TOKEN), base_url=COZE_CN_BASE_URL)

app = Flask(__name__, static_folder="static", static_url_path="/static")


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/video/<path:filename>")
def serve_video(filename: str):
    return send_from_directory("VIDEO", filename)


@app.post("/chat")
def chat() -> Response:
    payload = request.get_json(silent=True) or {}
    question = (payload.get("message") or "").strip()
    if not question:
        return {"error": "message is required"}, 400

    def stream() -> Iterator[str]:
        full_text_parts: list[str] = []

        yield json.dumps({"type": "status", "data": "正在进行时空对话连接..."}) + "\n"

        for event in coze.chat.stream(
            bot_id=BOT_ID,
            user_id=USER_ID,
            additional_messages=[
                Message.build_user_question_text(question),
            ],
        ):
            if event.event == ChatEventType.CONVERSATION_MESSAGE_DELTA:
                chunk = event.message.content or ""
                if chunk:
                    full_text_parts.append(chunk)
            if event.event == ChatEventType.CONVERSATION_CHAT_COMPLETED:
                full_text = "".join(full_text_parts).strip()
                if full_text:
                    audio_b64 = synthesize_to_wav(full_text)
                    if audio_b64:
                        yield json.dumps({"type": "audio", "data": audio_b64}) + "\n"
                    yield json.dumps({"type": "text", "data": full_text}) + "\n"
                yield json.dumps({"type": "done", "data": ""}) + "\n"

    headers = {
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
    }

    return Response(stream(), mimetype="application/x-ndjson", headers=headers)


def open_browser():
    """延迟打开浏览器，等待服务器启动"""
    time.sleep(1.5)
    webbrowser.open("http://127.0.0.1:5000")


if __name__ == "__main__":
    # 在后台线程中打开浏览器
    threading.Thread(target=open_browser, daemon=True).start()
    app.run(host="0.0.0.0", port=5000, debug=False)

