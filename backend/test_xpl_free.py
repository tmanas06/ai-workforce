import asyncio
import aiohttp
import os
from dotenv import load_dotenv

load_dotenv("c:/Users/tmana/projects/ai-workforce/backend/.env")

xpl_key = os.getenv("EXPERIENTIAL_LABS_API_KEY")
xpl_base = os.getenv("EXPERIENTIAL_LABS_BASE_URL")

async def test_xpl_models():
    headers = {
        "Authorization": f"Bearer {xpl_key}",
        "Content-Type": "application/json",
    }
    for model in ["deepseek-v4-flash", "deepseek-v4.1-flash", "gpt-5.6-luna", "qwen3.8-27b"]:
        async with aiohttp.ClientSession() as session:
            payload = {
                "model": model,
                "messages": [{"role": "user", "content": "Respond with 'Hello from ' followed by your name in 5 words or less."}],
                "max_tokens": 30,
            }
            try:
                async with session.post(f"{xpl_base}/chat/completions", headers=headers, json=payload) as resp:
                    print(f"Model {model}: Status {resp.status}")
                    print(await resp.text())
            except Exception as e:
                print(f"Model {model} error: {e}")

asyncio.run(test_xpl_models())
