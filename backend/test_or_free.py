import asyncio
import aiohttp
import os
from dotenv import load_dotenv

load_dotenv("c:/Users/tmana/projects/ai-workforce/backend/.env")

openrouter_key = os.getenv("OPENROUTER_API_KEY")

async def test_or_models():
    headers = {
        "Authorization": f"Bearer {openrouter_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost",
        "X-Title": "AI Workforce",
    }
    models = [
        "nex-agi/nex-n2.5-pro:free",
        "meta-llama/llama-3.3-70b-instruct:free",
        "deepseek/deepseek-r1:free",
        "google/gemini-2.0-flash-lite-preview-02-05:free",
        "qwen/qwen-2.5-coder-32b-instruct:free",
        "mistralai/mistral-small-24b-instruct-2501:free",
    ]
    async with aiohttp.ClientSession() as session:
        for m in models:
            payload = {
                "model": m,
                "messages": [{"role": "user", "content": "Respond: 'OK'"}],
                "max_tokens": 10,
            }
            try:
                async with session.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                    data = await resp.json()
                    if resp.status == 200:
                        content = data["choices"][0]["message"]["content"]
                        print(f"SUCCESS: {m} -> {content.strip()}")
                    else:
                        print(f"FAILED {resp.status}: {m} -> {data.get('error', {}).get('message')}")
            except Exception as e:
                print(f"ERROR: {m} -> {e}")

asyncio.run(test_or_models())
