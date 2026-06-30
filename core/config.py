import os
from dotenv import load_dotenv

# Ensure environment variables are loaded
load_dotenv()

def get_env_var(name: str) -> str:
    """Gets an environment variable by name, with safe defaults if missing."""
    val = os.getenv(name)
    if val is not None:
        return val

    # Provide safe fallback defaults for the router configuration
    defaults = {
        "FAST_MODEL_1": os.getenv("LITELLM_MODEL", "gpt-4o-mini"),
        "FAST_API_KEY_1": os.getenv("LITELLM_API_KEY", "your-litellm-proxy-key"),
        "CAPABLE_MODEL_1": "gpt-4o",
        "CAPABLE_API_KEY_1": os.getenv("LITELLM_API_KEY", "your-litellm-proxy-key")
    }
    return defaults.get(name, "")
