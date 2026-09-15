import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from typing import Optional, List

# Ensure .env is loaded into os.environ from backend/.env or root .env
load_dotenv()
backend_env = Path(__file__).resolve().parent.parent.parent / ".env"
if backend_env.exists():
    load_dotenv(dotenv_path=backend_env)


class Settings(BaseSettings):
    APP_NAME: str = "AI Workforce"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "sqlite:///./ai_workforce.db"
    
    # API
    API_V1_PREFIX: str = "/api/v1"
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    # WebSocket
    WS_HEARTBEAT_INTERVAL: int = 30
    
    # Workspace
    WORKSPACES_BASE_PATH: str = str(Path.home() / "AIWorkforce" / "workspaces")
    
    # Model Providers
    OPENROUTER_API_KEY: Optional[str] = None
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENCODE_API_KEY: Optional[str] = None
    OPENCODE_BASE_URL: str = "https://api.opencode.ai/v1"
    EXPERIENTIAL_LABS_API_KEY: Optional[str] = None
    EXPERIENTIAL_LABS_BASE_URL: str = "https://api.experientiallabs.ai/v1"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    GOOGLE_API_KEY: Optional[str] = None
    
    # Agent Execution
    AGENT_TIMEOUT: int = 300
    MAX_RETRIES: int = 3
    MAX_PARALLEL_AGENTS: int = 5
    
    # Security
    REQUIRE_APPROVAL_FOR: List[str] = [
        "sudo",
        "apt install",
        "npm install -g",
        "pip install --user",
        "rm -rf",
        "chmod 777",
        "ssh",
        "scp",
        "curl | bash",
        "wget | bash",
    ]
    
    # Default Models
    DEFAULT_CODING_MODEL: str = "nex-agi/nex-n2.5-pro:free"
    DEFAULT_RESEARCH_MODEL: str = "nvidia/nemotron-3-ultra-550b-a55b:free"
    DEFAULT_GENERAL_MODEL: str = "openai/gpt-4o-mini"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()