import asyncio
import aiohttp
import os
from dotenv import load_dotenv

load_dotenv("c:/Users/tmana/projects/ai-workforce/backend/.env")
openrouter_key = os.getenv("OPENROUTER_API_KEY")

async def test_one():
    headers = {
        "Authorization": f"Bearer {openrouter_key}",
        "Content-Type": "application/json",
    }
    async with aiohttp.ClientSession() as session:
        for model in ["nvidia/nemotron-3-ultra-550b-a55b:free", "nex-agi/nex-n2.5-mini:free", "liquid/lfm-2.5-2.6b:free"]:
            payload = {
                "model": model,
                "messages": [{"role": "user", "content": "Hi"}],
                "max_tokens": 15,
            }
            async with session.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload) as resp:
                print(model, resp.status, await resp.text())

asyncio.run(test_one())
