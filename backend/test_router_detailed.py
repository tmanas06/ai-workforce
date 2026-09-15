import asyncio
import os
import sys

sys.path.insert(0, "c:/Users/tmana/projects/ai-workforce/backend")

from app.core.config import settings
from app.services.model_providers import ModelRouter, ModelRequest, ModelMessage

async def test_router():
    router = ModelRouter(settings)
    req = ModelRequest(
        messages=[ModelMessage(role="user", content="Say 'AI Workforce is ready!' in 5 words or less.")],
        model="nex-agi/nex-n2.5-pro:free"
    )
    
    for name, p in router.providers.items():
        if p.is_available():
            print(f"\n--- Testing provider: {name} (type: {p.__class__.__name__}) ---")
            print(f"API Key prefix: {getattr(p, 'api_key', '')[:12]}...")
            try:
                resolved = router._resolve_request(req, p)
                res = await p.complete(resolved)
                print(f"SUCCESS: {res.content}")
            except Exception as e:
                print(f"FAILED: {e}")

if __name__ == "__main__":
    asyncio.run(test_router())
