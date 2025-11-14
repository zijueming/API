import asyncio
import base64
from typing import Optional

import edge_tts


VOICE = "zh-CN-YunjianNeural"


async def _synthesize_async(text: str) -> bytes:
    communicate = edge_tts.Communicate(text, VOICE)
    audio = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio += chunk["data"]
    return audio


def synthesize_to_wav(text: str) -> Optional[str]:
    cleaned = (text or "").strip()
    if not cleaned:
        return None

    audio_bytes = asyncio.run(_synthesize_async(cleaned))
    if not audio_bytes:
        return None

    return base64.b64encode(audio_bytes).decode("utf-8")

