import asyncio
import aiohttp
import os
from dotenv import load_dotenv

load_dotenv("c:/Users/tmana/projects/ai-workforce/backend/.env")

xpl_key = os.getenv("EXPERIENTIAL_LABS_API_KEY")
xpl_base = os.getenv("EXPERIENTIAL_LABS_BASE_URL")

async def test_xpl():
    headers = {
        "Authorization": f"Bearer {xpl_key}",
        "Content-Type": "application/json",
    }
    async with aiohttp.ClientSession() as session:
        # Check models endpoint
        try:
            async with session.get(f"{xpl_base}/models", headers=headers) as resp:
                print(f"XPL /models status: {resp.status}")
                text = await resp.text()
                print(f"XPL /models: {text[:500]}")
        except Exception as e:
            print(f"Error /models: {e}")
            
        # Also print full 429 response from earlier to see what is available
        payload = {
            "model": "cohere/command-r-plus-08-2024",
            "messages": [{"role": "user", "content": "hi"}],
        }
        async with session.post(f"{xpl_base}/chat/completions", headers=headers, json=payload) as resp:
            print("Full error text:")
            print(await resp.text())

asyncio.run(test_xpl())
