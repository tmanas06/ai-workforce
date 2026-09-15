import asyncio
import aiohttp
import os
from dotenv import load_dotenv

load_dotenv("c:/Users/tmana/projects/ai-workforce/backend/.env")

openrouter_key = os.getenv("OPENROUTER_API_KEY")

async def test_free():
    headers = {
        "Authorization": f"Bearer {openrouter_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost",
        "X-Title": "AI Workforce",
    }
    models = [
        "nex-agi/nex-n2.5-pro:free",
        "nvidia/nemotron-3-ultra-550b-a55b:free",
        "cohere/north-mini-code:free",
        "google/gemma-4-26b-a4b-it:free",
    ]
    async with aiohttp.ClientSession() as session:
        for m in models:
            payload = {
                "model": m,
                "messages": [{"role": "user", "content": "Respond: 'Hello from model'"}],
                "max_tokens": 15,
            }
            try:
                async with session.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload, timeout=aiohttp.ClientTimeout(total=20)) as resp:
                    data = await resp.json()
                    if resp.status == 200:
                        content = data["choices"][0]["message"]["content"]
                        print(f"SUCCESS {m} -> {content.strip()}")
                    else:
                        print(f"FAILED {resp.status} {m} -> {data}")
            except Exception as e:
                print(f"ERROR {m} -> {e}")

asyncio.run(test_free())
