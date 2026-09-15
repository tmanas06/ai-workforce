import asyncio
import aiohttp
import os
from dotenv import load_dotenv

load_dotenv("c:/Users/tmana/projects/ai-workforce/backend/.env")

openrouter_key = os.getenv("OPENROUTER_API_KEY")
opencode_key = os.getenv("OPENCODE_API_KEY")
opencode_base = os.getenv("OPENCODE_BASE_URL")
xpl_key = os.getenv("EXPERIENTIAL_LABS_API_KEY")
xpl_base = os.getenv("EXPERIENTIAL_LABS_BASE_URL")

async def test_endpoint(name, url, key, model):
    print(f"\n--- Testing {name} ---")
    print(f"URL: {url}")
    print(f"Model: {model}")
    print(f"Key preview: {key[:10]}...{key[-4:] if key else 'None'}")
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost",
        "X-Title": "AI Workforce Test",
    }
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": "Say hello in 3 words"}],
        "max_tokens": 20,
    }
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{url}/chat/completions", headers=headers, json=payload, timeout=aiohttp.ClientTimeout(total=20)) as resp:
                status = resp.status
                text = await resp.text()
                print(f"Status: {status}")
                print(f"Response: {text[:300]}")
    except Exception as e:
        print(f"Error: {e}")

async def main():
    # 1. OpenRouter with openrouter key
    await test_endpoint("OpenRouter with OpenRouter Key (nex-agi/nex-n2.5-pro:free)", "https://openrouter.ai/api/v1", openrouter_key, "nex-agi/nex-n2.5-pro:free")
    await test_endpoint("OpenRouter with OpenRouter Key (google/gemini-2.0-flash-exp:free or step)", "https://openrouter.ai/api/v1", openrouter_key, "google/gemini-2.0-flash-thinking-exp:free")
    
    # 2. OpenRouter with OpenCode key (current code behavior in OpenCodeProvider)
    await test_endpoint("OpenRouter with OpenCode Key", "https://openrouter.ai/api/v1", opencode_key, "nvidia/llama-3.1-nemotron-ultra-253b-v1:free")
    
    # 3. OpenCode direct base URL (if any)
    if opencode_base:
        await test_endpoint("OpenCode direct URL", opencode_base, opencode_key, "nvidia/llama-3.1-nemotron-ultra-253b-v1:free")

    # 4. OpenRouter with XPL key (current code behavior in ExperientialLabsProvider)
    await test_endpoint("OpenRouter with XPL Key", "https://openrouter.ai/api/v1", xpl_key, "cohere/command-r-plus-08-2024")
    
    # 5. XPL direct URL
    if xpl_base:
        await test_endpoint("XPL direct URL", xpl_base, xpl_key, "cohere/command-r-plus-08-2024")

if __name__ == "__main__":
    asyncio.run(main())
