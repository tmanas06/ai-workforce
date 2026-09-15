import asyncio
import os
import sys

sys.path.insert(0, "c:/Users/tmana/projects/ai-workforce/backend")

from app.core.config import settings
from app.services.model_providers import ModelRouter, ModelRequest, ModelMessage

async def test_router():
    print("OPENROUTER_API_KEY loaded:", bool(settings.OPENROUTER_API_KEY))
    print("OPENCODE_API_KEY loaded:", bool(settings.OPENCODE_API_KEY))
    
    router = ModelRouter(settings)
    print("Available providers:", [p.name for p in router.get_available_providers()])
    
    req = ModelRequest(
        messages=[ModelMessage(role="user", content="Say 'AI Workforce is ready!' in 5 words or less.")],
        model="nex-agi/nex-n2.5-pro:free"
    )
    
    res = await router.complete_with_fallback(req, task_type="general")
    print(f"Fallback complete response ({res.provider} - {res.model}):\n{res.content}")

if __name__ == "__main__":
    asyncio.run(test_router())
