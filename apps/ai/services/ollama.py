import httpx
from typing import Any
import os

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")
OLLAMA_TIMEOUT = 30.0

SYSTEM_PROMPT = (
    "You are a task-writing assistant. Rewrite the given task title and optional "
    "description into a single, specific, actionable task statement. Start with a "
    "strong verb. Maximum 2 sentences. Return only the rewritten task, no explanation."
)

SYSTEM_PROMPT_TEMPLATES = (
    "You are a task-writing assistant. "
    "Rewrite the given task title and optional description into a single, specific, "
    "actionable task statement. Start with a strong verb. "
    "Maximum 2 sentences. Return only the rewritten task, no explanation."
)


def build_prompt(title: str, description: str | None) -> str:
    if description:
        return f"Title: {title}\nDescription: {description}"
    return f"Title: {title}"


def generate_actionable(title: str, description: str | None) -> str:
    prompt = build_prompt(title, description)
    payload: dict[str, Any] = {
        "model": OLLAMA_MODEL,
        "prompt": f"{SYSTEM_PROMPT_TEMPLATES}\n\n{prompt}",
        "stream": False,
    }

    with httpx.Client(timeout=OLLAMA_TIMEOUT) as client:
        response = client.post(f"{OLLAMA_BASE_URL}/api/generate", json=payload)
        response.raise_for_status()

    data = response.json()
    return data.get("response", "").strip()
