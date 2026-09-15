import asyncio
import aiohttp
import os
from dotenv import load_dotenv

load_dotenv("c:/Users/tmana/projects/ai-workforce/backend/.env")

openrouter_key = os.getenv("OPENROUTER_API_KEY")

async def get_free_models():
    headers = {
        "Authorization": f"Bearer {openrouter_key}",
        "Content-Type": "application/json",
    }
    async with aiohttp.ClientSession() as session:
        async with session.get("https://openrouter.ai/api/v1/models", headers=headers) as resp:
            data = await resp.json()
            models = data.get("data", [])
            free_models = [m["id"] for m in models if ":free" in m["id"]]
            print(f"Total free models found: {len(free_models)}")
            for m in free_models[:25]:
                print(f" - {m}")

asyncio.run(get_free_models())
