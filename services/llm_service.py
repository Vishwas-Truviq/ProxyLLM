import os
import re
from litellm import Router

# Force registration/mocking of custom validators from our guardrails_service first
try:
    import services.guardrails_service
except ImportError:
    import guardrails_service

# Import Guard and hub validators
from guardrails import Guard
from guardrails.hub import (
    DetectPII,
    GibberishText,
    ProvenanceEmbeddings,
    ProvenanceLLM,
    SimilarToDocument,
    GroundedAIHallucination,
    GuardrailsPII,
    LLMCritic,
    MLcubeRagContextValidator,
    PromptInjectionDetector,
    ResponseEvaluator,
    ValidJson
)

try:
    from ..core.prompts import GUARDRAIL_SYSTEM_PROMPT, OUTPUT_GUARDRAIL_SYSTEM_PROMPT
    from ..core.config import get_env_var
except (ImportError, ValueError):
    from core.prompts import GUARDRAIL_SYSTEM_PROMPT, OUTPUT_GUARDRAIL_SYSTEM_PROMPT
    from core.config import get_env_var

# 1. Initialize Python SDK Router
model_list = [
    {
        "model_name": "fast-tier",
        "litellm_params": {
            "model": "groq/llama-3.1-8b-instant",
            "api_key": get_env_var("GROQ_API_KEY")
        }
    },
    {
        "model_name": "gemini-2.5-flash-lite",
        "litellm_params": {
            "model": "gemini/gemini-2.5-flash-lite",
            "api_key": get_env_var("GEMINI_API_KEY")
        }
    },
    {
        "model_name": "gemini-2.5-flash",
        "litellm_params": {
            "model": "gemini/gemini-2.5-flash",
            "api_key": get_env_var("GEMINI_API_KEY")
        }
    },
    {
        "model_name": "gemini-3.1-flash-lite",
        "litellm_params": {
            "model": "gemini/gemini-3.1-flash-lite",
            "api_key": get_env_var("GEMINI_API_KEY")
        }
    },
    {
        "model_name": "capable-tier",
        "litellm_params": {
            "model": "groq/llama-3.3-70b-versatile",
            "api_key": get_env_var("GROQ_API_KEY")
        }
    }
]

router = Router(
    model_list=model_list,
    fallbacks=[
        {"fast-tier": ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-3.1-flash-lite"]},
        {"capable-tier": ["gemini-2.5-flash"]}
    ],
    num_retries=1
)

# 2. Instantiate Input Guard
input_guard = Guard().use(
    PromptInjectionDetector()
).use(
    DetectPII()
)

# 3. Instantiate Output Guard
output_guard = Guard().use(
    GibberishText(threshold=0.5, on_fail="noop")
).use(
    GroundedAIHallucination()
).use(
    GuardrailsPII()
)

def mask_pii(text: str) -> str:
    """
    Masks sensitive personal information (PII) such as credit cards and emails.
    """
    # Mask Credit Cards
    text = re.sub(r"\b(?:\d[ -]*?){13,16}\b", "[MASKED_CARD]", text)
    
    # Mask Email Addresses
    text = re.sub(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", "[MASKED_EMAIL]", text)

    return text

def check_input_safety(message: str, history: list) -> tuple[bool, str]:
    """
    Input Guardrail (L1): Checks the user message (with recent context) for safety violations.
    Returns: (is_safe, risk_level)
      - is_safe: False if UNSAFE, True otherwise.
      - risk_level: "LOW", "MEDIUM", or "HIGH"
    """
    try:
        outcome = input_guard.validate(message)
        if not getattr(outcome, "validation_passed", True):
            return False, "HIGH"
        return True, "LOW"
    except Exception as e:
        print(f"Input safety validation bypassed due to error: {e}")
        return True, "LOW"

def defend_history_poisoning(history: list) -> list:
    """
    History Truncation (L2): Cuts history depth to prevent adversarial build-up.
    If history has more than 6 messages (3 turns), we only retain the most recent 2 turns (4 messages).
    """
    if len(history) > 6:
        return history[-4:]
    return history

def check_output_safety(output_text: str) -> bool:
    """
    Output Guardrail (L3): Inspects the generated output before returning it.
    Returns True if SAFE, False if UNSAFE.
    """
    try:
        outcome = output_guard.validate(output_text)
        if not getattr(outcome, "validation_passed", True):
            return False
        return True
    except Exception as e:
        print(f"Output safety validation bypassed due to error: {e}")
        return True
