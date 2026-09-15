from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, AsyncGenerator
from pydantic import BaseModel
from enum import Enum
import aiohttp
import json
import time
import os


class ModelProviderType(str, Enum):
    OPENROUTER = "openrouter"
    OLLAMA = "ollama"
    OPENAI_COMPATIBLE = "openai_compatible"
    GOOGLE = "google"
    OPENCODE = "opencode"
    EXPERIENTIAL_LABS = "experiential_labs"


class ModelMessage(BaseModel):
    role: str
    content: str


class ModelRequest(BaseModel):
    messages: List[ModelMessage]
    model: str
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    stream: bool = False
    tools: Optional[List[Dict[str, Any]]] = None
    tool_choice: Optional[str] = None


class ModelResponse(BaseModel):
    content: str
    tool_calls: Optional[List[Dict[str, Any]]] = None
    usage: Optional[Dict[str, int]] = None
    model: str
    provider: str
    latency_ms: int


# All three custom providers (OpenRouter, OpenCode, ExperimentalLabs) route
# through the OpenRouter endpoint — they are all OpenRouter-compatible.
MODEL_ALIASES: Dict[str, str] = {
    # Nex-N2.5-Pro (OpenRouter flagship)
    "nex-n2.5-pro":                           "nex-agi/nex-n2.5-pro:free",
    "nex n2.5 pro":                           "nex-agi/nex-n2.5-pro:free",
    "nex_n2.5_pro":                           "nex-agi/nex-n2.5-pro:free",
    # Nemotron 3 Ultra (OpenCode)
    "nemotron 3 ultra":                       "nvidia/llama-3.1-nemotron-ultra-253b-v1:free",
    "nemotron-3-ultra":                       "nvidia/llama-3.1-nemotron-ultra-253b-v1:free",
    "nemotron_3_ultra":                       "nvidia/llama-3.1-nemotron-ultra-253b-v1:free",
    "nvidia/nemotron-3-ultra-550b-a55b:free": "nvidia/llama-3.1-nemotron-ultra-253b-v1:free",
    "nvidia/llama-3.1-nemotron-ultra-253b-v1:free": "nvidia/llama-3.1-nemotron-ultra-253b-v1:free",
    # North Mini Code (ExperimentalLabs)
    "north mini code":                        "cohere/command-r-plus-08-2024",
    "north-mini-code":                        "cohere/command-r-plus-08-2024",
    "north_mini_code":                        "cohere/command-r-plus-08-2024",
    "cohere/north-mini-code:free":            "cohere/command-r-plus-08-2024",
    # Common cloud models
    "anthropic/claude-3.5-sonnet":            "anthropic/claude-3.5-sonnet",
    "claude-3.5-sonnet":                      "anthropic/claude-3.5-sonnet",
    "claude-3.5-haiku":                       "anthropic/claude-3.5-haiku",
    "google/gemini-pro-1.5":                  "google/gemini-flash-1.5",
    "gpt-4o":                                 "openai/gpt-4o",
    "gpt-4o-mini":                            "openai/gpt-4o-mini",
    # Catch-all
    "auto":                                   "nex-agi/nex-n2.5-pro:free",
    "":                                       "nex-agi/nex-n2.5-pro:free",
}


def normalize_model_id(model_name: str) -> str:
    if not model_name:
        return MODEL_ALIASES[""]
    key = model_name.strip().lower()
    return MODEL_ALIASES.get(key, model_name)


class ModelProvider(ABC):
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.name = self.__class__.__name__.replace("Provider", "").lower()

    @abstractmethod
    async def complete(self, request: ModelRequest) -> ModelResponse:
        pass

    @abstractmethod
    async def stream_complete(self, request: ModelRequest) -> AsyncGenerator[str, None]:
        pass

    @abstractmethod
    def is_available(self) -> bool:
        pass

    # IMPORTANT: always synchronous — avoids "'list' object can't be awaited"
    def get_models(self) -> List[str]:
        return []

    def get_default_model(self) -> str:
        return "nex-agi/nex-n2.5-pro:free"


# ---------------------------------------------------------------------------
# OpenRouter
# ---------------------------------------------------------------------------

class OpenRouterProvider(ModelProvider):
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.api_key = config.get("api_key") or os.getenv("OPENROUTER_API_KEY", "")
        self.base_url = config.get("base_url", "https://openrouter.ai/api/v1")

    def is_available(self) -> bool:
        return bool(self.api_key)

    def get_default_model(self) -> str:
        return "nex-agi/nex-n2.5-pro:free"

    def get_models(self) -> List[str]:
        return [
            "nex-agi/nex-n2.5-pro:free",
            "nvidia/llama-3.1-nemotron-ultra-253b-v1:free",
            "cohere/command-r-plus-08-2024",
            "anthropic/claude-3.5-sonnet",
            "anthropic/claude-3.5-haiku",
            "openai/gpt-4o",
            "openai/gpt-4o-mini",
            "meta-llama/llama-3.1-70b-instruct",
            "qwen/qwen-2.5-72b-instruct",
        ]

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost",
            "X-Title": "AI Workforce",
        }

    async def complete(self, request: ModelRequest) -> ModelResponse:
        start = time.time()
        resolved = normalize_model_id(request.model)
        payload: Dict[str, Any] = {
            "model": resolved,
            "messages": [m.model_dump() for m in request.messages],
            "temperature": request.temperature,
            "stream": False,
        }
        if request.max_tokens:
            payload["max_tokens"] = request.max_tokens
        if request.tools:
            payload["tools"] = request.tools
            payload["tool_choice"] = request.tool_choice or "auto"

        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.base_url}/chat/completions",
                headers=self._headers(),
                json=payload,
            ) as resp:
                text = await resp.text()
                if resp.status != 200:
                    raise Exception(f"OpenRouter API error {resp.status}: {text}")
                data = json.loads(text)
                latency = int((time.time() - start) * 1000)
                msg = data["choices"][0]["message"]
                return ModelResponse(
                    content=msg.get("content") or "",
                    tool_calls=msg.get("tool_calls"),
                    usage=data.get("usage"),
                    model=data.get("model", resolved),
                    provider="openrouter",
                    latency_ms=latency,
                )

    async def stream_complete(self, request: ModelRequest) -> AsyncGenerator[str, None]:
        resolved = normalize_model_id(request.model)
        payload: Dict[str, Any] = {
            "model": resolved,
            "messages": [m.model_dump() for m in request.messages],
            "temperature": request.temperature,
            "stream": True,
        }
        if request.max_tokens:
            payload["max_tokens"] = request.max_tokens

        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.base_url}/chat/completions",
                headers=self._headers(),
                json=payload,
            ) as resp:
                if resp.status != 200:
                    error = await resp.text()
                    raise Exception(f"OpenRouter API error {resp.status}: {error}")
                async for line in resp.content:
                    line = line.decode().strip()
                    if line.startswith("data: "):
                        ds = line[6:]
                        if ds == "[DONE]":
                            break
                        try:
                            d = json.loads(ds)
                            delta = d["choices"][0].get("delta", {})
                            if delta.get("content"):
                                yield delta["content"]
                        except (json.JSONDecodeError, KeyError, IndexError):
                            continue


# ---------------------------------------------------------------------------
# OpenCode — uses OpenCode key but routes through OpenRouter endpoint
# ---------------------------------------------------------------------------

class OpenCodeProvider(OpenRouterProvider):
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        opencode_key = config.get("api_key") or os.getenv("OPENCODE_API_KEY", "")
        # Fall back to OpenRouter key if OpenCode key not present
        self.api_key = opencode_key or os.getenv("OPENROUTER_API_KEY", "")
        self.base_url = "https://openrouter.ai/api/v1"

    def get_default_model(self) -> str:
        return "nvidia/llama-3.1-nemotron-ultra-253b-v1:free"

    def get_models(self) -> List[str]:
        return [
            "nvidia/llama-3.1-nemotron-ultra-253b-v1:free",
            "nex-agi/nex-n2.5-pro:free",
            "meta-llama/llama-3.1-70b-instruct",
        ]

    async def complete(self, request: ModelRequest) -> ModelResponse:
        r = await super().complete(request)
        r.provider = "opencode"
        return r

    async def stream_complete(self, request: ModelRequest) -> AsyncGenerator[str, None]:
        async for chunk in super().stream_complete(request):
            yield chunk


# ---------------------------------------------------------------------------
# ExperientialLabs — same pattern as OpenCode
# ---------------------------------------------------------------------------

class ExperientialLabsProvider(OpenRouterProvider):
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        xpl_key = config.get("api_key") or os.getenv("EXPERIENTIAL_LABS_API_KEY", "")
        self.api_key = xpl_key or os.getenv("OPENROUTER_API_KEY", "")
        self.base_url = "https://openrouter.ai/api/v1"

    def get_default_model(self) -> str:
        return "cohere/command-r-plus-08-2024"

    def get_models(self) -> List[str]:
        return [
            "cohere/command-r-plus-08-2024",
            "nex-agi/nex-n2.5-pro:free",
            "meta-llama/llama-3.1-70b-instruct",
        ]

    async def complete(self, request: ModelRequest) -> ModelResponse:
        r = await super().complete(request)
        r.provider = "experiential_labs"
        return r

    async def stream_complete(self, request: ModelRequest) -> AsyncGenerator[str, None]:
        async for chunk in super().stream_complete(request):
            yield chunk


# ---------------------------------------------------------------------------
# Ollama (local)
# ---------------------------------------------------------------------------

class OllamaProvider(ModelProvider):
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.base_url = config.get("base_url", "http://localhost:11434")

    def is_available(self) -> bool:
        return True  # Errors caught at call time

    def get_default_model(self) -> str:
        return "llama3.2:3b"

    def get_models(self) -> List[str]:
        return ["llama3.2:3b", "llama3.1:8b", "codellama:7b", "qwen2.5:7b"]

    async def _installed_models(self) -> List[str]:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/api/tags",
                    timeout=aiohttp.ClientTimeout(total=5),
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        return [m["name"] for m in data.get("models", [])]
        except Exception:
            pass
        return []

    async def complete(self, request: ModelRequest) -> ModelResponse:
        start = time.time()
        model = request.model
        if not model or model == "auto":
            installed = await self._installed_models()
            model = installed[0] if installed else self.get_default_model()

        payload: Dict[str, Any] = {
            "model": model,
            "messages": [m.model_dump() for m in request.messages],
            "temperature": request.temperature,
            "stream": False,
        }
        if request.max_tokens:
            payload["num_predict"] = request.max_tokens

        async with aiohttp.ClientSession() as session:
            async with session.post(f"{self.base_url}/api/chat", json=payload) as resp:
                text = await resp.text()
                if resp.status != 200:
                    raise Exception(f"Ollama API error {resp.status}: {text}")
                data = json.loads(text)
                latency = int((time.time() - start) * 1000)
                return ModelResponse(
                    content=data["message"]["content"],
                    tool_calls=None,
                    usage={
                        "prompt_tokens": data.get("prompt_eval_count", 0),
                        "completion_tokens": data.get("eval_count", 0),
                        "total_tokens": data.get("prompt_eval_count", 0) + data.get("eval_count", 0),
                    },
                    model=data.get("model", model),
                    provider="ollama",
                    latency_ms=latency,
                )

    async def stream_complete(self, request: ModelRequest) -> AsyncGenerator[str, None]:
        model = request.model
        if not model or model == "auto":
            installed = await self._installed_models()
            model = installed[0] if installed else self.get_default_model()

        payload: Dict[str, Any] = {
            "model": model,
            "messages": [m.model_dump() for m in request.messages],
            "temperature": request.temperature,
            "stream": True,
        }
        if request.max_tokens:
            payload["num_predict"] = request.max_tokens

        async with aiohttp.ClientSession() as session:
            async with session.post(f"{self.base_url}/api/chat", json=payload) as resp:
                if resp.status != 200:
                    error = await resp.text()
                    raise Exception(f"Ollama API error {resp.status}: {error}")
                async for line in resp.content:
                    line = line.decode().strip()
                    if not line:
                        continue
                    try:
                        d = json.loads(line)
                        if "message" in d and d["message"].get("content"):
                            yield d["message"]["content"]
                        if d.get("done", False):
                            break
                    except json.JSONDecodeError:
                        continue


# ---------------------------------------------------------------------------
# Generic OpenAI-compatible
# ---------------------------------------------------------------------------

class OpenAICompatibleProvider(ModelProvider):
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.api_key = config.get("api_key") or os.getenv("OPENAI_API_KEY", "")
        self.base_url = config.get("base_url", "https://api.openai.com/v1")

    def is_available(self) -> bool:
        return bool(self.api_key)

    def get_default_model(self) -> str:
        return "gpt-4o-mini"

    def get_models(self) -> List[str]:
        return ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"]

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    async def complete(self, request: ModelRequest) -> ModelResponse:
        start = time.time()
        payload: Dict[str, Any] = {
            "model": request.model,
            "messages": [m.model_dump() for m in request.messages],
            "temperature": request.temperature,
            "stream": False,
        }
        if request.max_tokens:
            payload["max_tokens"] = request.max_tokens
        if request.tools:
            payload["tools"] = request.tools
            payload["tool_choice"] = request.tool_choice or "auto"

        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.base_url}/chat/completions",
                headers=self._headers(),
                json=payload,
            ) as resp:
                text = await resp.text()
                if resp.status != 200:
                    raise Exception(f"OpenAI API error {resp.status}: {text}")
                data = json.loads(text)
                latency = int((time.time() - start) * 1000)
                msg = data["choices"][0]["message"]
                return ModelResponse(
                    content=msg.get("content") or "",
                    tool_calls=msg.get("tool_calls"),
                    usage=data.get("usage"),
                    model=data.get("model", request.model),
                    provider="openai_compatible",
                    latency_ms=latency,
                )

    async def stream_complete(self, request: ModelRequest) -> AsyncGenerator[str, None]:
        payload: Dict[str, Any] = {
            "model": request.model,
            "messages": [m.model_dump() for m in request.messages],
            "temperature": request.temperature,
            "stream": True,
        }
        if request.max_tokens:
            payload["max_tokens"] = request.max_tokens

        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.base_url}/chat/completions",
                headers=self._headers(),
                json=payload,
            ) as resp:
                if resp.status != 200:
                    error = await resp.text()
                    raise Exception(f"OpenAI API error {resp.status}: {error}")
                async for line in resp.content:
                    line = line.decode().strip()
                    if line.startswith("data: "):
                        ds = line[6:]
                        if ds == "[DONE]":
                            break
                        try:
                            d = json.loads(ds)
                            delta = d["choices"][0].get("delta", {})
                            if delta.get("content"):
                                yield delta["content"]
                        except (json.JSONDecodeError, KeyError, IndexError):
                            continue


# ---------------------------------------------------------------------------
# ModelRouter
# ---------------------------------------------------------------------------

class ModelRouter:
    def __init__(self, settings):
        self.providers: Dict[str, ModelProvider] = {}
        self.settings = settings
        self._init_providers()

    def _init_providers(self):
        if getattr(self.settings, "OPENROUTER_API_KEY", None):
            self.providers["openrouter"] = OpenRouterProvider({
                "api_key": self.settings.OPENROUTER_API_KEY,
                "base_url": getattr(self.settings, "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
            })

        self.providers["opencode"] = OpenCodeProvider({
            "api_key": getattr(self.settings, "OPENCODE_API_KEY", ""),
        })

        self.providers["experiential_labs"] = ExperientialLabsProvider({
            "api_key": getattr(self.settings, "EXPERIENTIAL_LABS_API_KEY", ""),
        })
        self.providers["xpl"] = self.providers["experiential_labs"]

        self.providers["ollama"] = OllamaProvider({
            "base_url": getattr(self.settings, "OLLAMA_BASE_URL", "http://localhost:11434"),
        })

        if getattr(self.settings, "OPENAI_API_KEY", None):
            self.providers["openai_compatible"] = OpenAICompatibleProvider({
                "api_key": self.settings.OPENAI_API_KEY,
                "base_url": getattr(self.settings, "OPENAI_BASE_URL", "https://api.openai.com/v1"),
            })

    def get_provider(self, name: str) -> Optional[ModelProvider]:
        return self.providers.get(name)

    def get_available_providers(self) -> List[ModelProvider]:
        return [p for p in self.providers.values() if p.is_available()]

    def _resolve_request(self, request: ModelRequest, provider: ModelProvider) -> ModelRequest:
        """
        Build a fresh ModelRequest with the model resolved for the provider.
        This avoids the 'multiple values for keyword argument model' bug that
        occurs when using model_dump() spread + model= kwarg together.
        """
        model = request.model
        if not model or model in ("auto", ""):
            model = provider.get_default_model()
        else:
            model = normalize_model_id(model)

        return ModelRequest(
            messages=request.messages,
            model=model,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            stream=request.stream,
            tools=request.tools,
            tool_choice=request.tool_choice,
        )

    def _provider_priority(
        self, agent_provider: Optional[str], task_type: str
    ) -> List[ModelProvider]:
        """Return providers in priority order for this agent/task."""
        ordered: List[ModelProvider] = []

        if agent_provider:
            p = self.providers.get(agent_provider)
            if p and p.is_available():
                ordered.append(p)

        fallback_order = {
            "coding":   ["openrouter", "opencode", "experiential_labs", "ollama", "openai_compatible"],
            "research": ["openrouter", "opencode", "openai_compatible", "ollama"],
            "general":  ["openrouter", "opencode", "experiential_labs", "ollama", "openai_compatible"],
            "review":   ["openrouter", "opencode", "openai_compatible", "ollama"],
        }.get(task_type, ["openrouter", "opencode", "experiential_labs", "ollama", "openai_compatible"])

        seen = {id(p) for p in ordered}
        for name in fallback_order:
            p = self.providers.get(name)
            if p and p.is_available() and id(p) not in seen:
                ordered.append(p)
                seen.add(id(p))

        return ordered

    async def complete_with_fallback(
        self,
        request: ModelRequest,
        task_type: str = "general",
        agent_provider: Optional[str] = None,
        max_fallbacks: int = 3,
    ) -> ModelResponse:
        providers = self._provider_priority(agent_provider, task_type)
        last_error: Optional[Exception] = None

        for provider in providers[:max_fallbacks]:
            resolved = self._resolve_request(request, provider)
            try:
                return await provider.complete(resolved)
            except Exception as exc:
                last_error = exc
                continue

        raise Exception(f"All providers failed. Last error: {last_error}")

    async def stream_complete_with_fallback(
        self,
        request: ModelRequest,
        task_type: str = "general",
        agent_provider: Optional[str] = None,
        max_fallbacks: int = 3,
    ) -> AsyncGenerator[str, None]:
        providers = self._provider_priority(agent_provider, task_type)
        last_error: Optional[Exception] = None

        for provider in providers[:max_fallbacks]:
            resolved = self._resolve_request(request, provider)
            try:
                async for chunk in provider.stream_complete(resolved):
                    yield chunk
                return
            except Exception as exc:
                last_error = exc
                continue

        raise Exception(f"All providers failed. Last error: {last_error}")

    # Keep old signature for backwards compat
    def get_model_provider_for_task(self, task_type: str) -> Optional[ModelProvider]:
        providers = self._provider_priority(None, task_type)
        return providers[0] if providers else None


model_router: Optional[ModelRouter] = None


def get_model_router() -> ModelRouter:
    global model_router
    if model_router is None:
        from app.core.config import settings
        model_router = ModelRouter(settings)
    return model_router
