import asyncio
import aiohttp
import os
from dotenv import load_dotenv

load_dotenv("c:/Users/tmana/projects/ai-workforce/backend/.env")

opencode_key = os.getenv("OPENCODE_API_KEY")
opencode_base = os.getenv("OPENCODE_BASE_URL")

async def test_opencode():
    headers = {
        "Authorization": f"Bearer {opencode_key}",
        "Content-Type": "application/json",
    }
    async with aiohttp.ClientSession() as session:
        for path in ["/models", "", "/v1/models", "/v1"]:
            try:
                async with session.get(f"https://api.opencode.ai{path}", headers=headers) as resp:
                    print(f"Path {path}: {resp.status}, {await resp.text()}")
            except Exception as e:
                print(f"Path {path} err: {e}")

asyncio.run(test_opencode())
