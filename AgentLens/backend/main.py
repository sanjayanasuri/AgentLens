from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import ssl
import certifi
from pathlib import Path

# Load environment variables from .env file
# Get the backend directory (where this file is located)
backend_dir = Path(__file__).parent
env_path = backend_dir / ".env"
load_dotenv(dotenv_path=env_path)

# Fix SSL certificate issues on macOS/conda
os.environ['SSL_CERT_FILE'] = certifi.where()
os.environ['REQUESTS_CA_BUNDLE'] = certifi.where()

from api.routes import router as api_router
from api.websocket import ws_router
from api.graph_schema import router as graph_schema_router

app = FastAPI(title="AgentLens API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")
app.include_router(graph_schema_router, prefix="/api")
app.include_router(ws_router, prefix="/ws")

