import os
from dotenv import load_dotenv
from pathlib import Path

# Ensure .env is loaded (in case it wasn't loaded before this module)
backend_dir = Path(__file__).parent.parent
env_path = backend_dir / ".env"
load_dotenv(dotenv_path=env_path, override=True)

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Strip any whitespace from the API key
if OPENAI_API_KEY:
    OPENAI_API_KEY = OPENAI_API_KEY.strip()

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")  # strongly recommended
USE_TAVILY = bool(TAVILY_API_KEY)

LANGSMITH_PROJECT = os.getenv("LANGSMITH_PROJECT", "agentlens")

