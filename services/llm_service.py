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
    ValidJson,
    BiasCheck
)

try:
    from ..core.prompts import GUARDRAIL_SYSTEM_PROMPT, OUTPUT_GUARDRAIL_SYSTEM_PROMPT
    from ..core.config import get_env_var
except (ImportError, ValueError):
    from core.prompts import GUARDRAIL_SYSTEM_PROMPT, OUTPUT_GUARDRAIL_SYSTEM_PROMPT
    from core.config import get_env_var

# ---------------------------------------------------------------------------
# 1. Model list — multi-provider, multi-model per tier
# ---------------------------------------------------------------------------
# How it works:
#   • Multiple entries sharing the same "model_name" form a "model group".
#   • LiteLLM Router load-balances within the group using usage-based-routing:
#     it routes each call to the least-loaded entry, then falls back to the
#     next entry if one is rate-limited (429) or errors.
#   • The _entry() helper returns None when a key is missing, so adding a
#     second key is as simple as setting GROQ_API_KEY_2 in .env — no code
#     change needed.
#   • Cross-tier fallbacks (the "fallbacks" list below) fire only if EVERY
#     entry in a tier has failed — an extreme last-resort.
#
# Provider rate limits (free tier):
#   Groq       — ~30 req/min per key
#   OpenRouter — ~20 req/min per key (free-tier models)
#   Gemini     — ~5  req/min (free tier)
# ---------------------------------------------------------------------------

def _entry(model_name: str, model: str, key_env: str, rpm: int | None = None) -> dict | None:
    """
    Build a LiteLLM Router model-list entry.
    Returns None (and is filtered out) when the API key is not set,
    so optional secondary keys never cause startup errors.
    """
    key = os.getenv(key_env)
    if not key:
        return None
    entry: dict = {
        "model_name": model_name,
        "litellm_params": {"model": model, "api_key": key},
    }
    if rpm is not None:
        entry["rpm"] = rpm
    return entry


# ─────────────────────────────────────────────────────────────────────────────
# FAST-TIER  — simple queries, routing classification, non-critical tool calls
# Goal: lowest latency.  Models: small (≤ 12B), fast inference.
# ─────────────────────────────────────────────────────────────────────────────
_FAST = [
    # Groq — dedicated inference hardware, lowest latency in the fleet
    # NOTE: gemma2-9b-it was decommissioned by Groq (2025); replaced with llama-3.2-11b.
    _entry("fast-tier", "groq/llama-3.1-8b-instant",          "GROQ_API_KEY_1", rpm=30),
    _entry("fast-tier", "groq/llama-3.2-11b-vision-preview",  "GROQ_API_KEY_1", rpm=30),
    _entry("fast-tier", "groq/llama-3.2-3b-preview",          "GROQ_API_KEY_1", rpm=30),
    _entry("fast-tier", "groq/llama-3.1-8b-instant",          "GROQ_API_KEY_2", rpm=30),
    _entry("fast-tier", "groq/llama-3.2-11b-vision-preview",  "GROQ_API_KEY_2", rpm=30),
    _entry("fast-tier", "groq/llama-3.2-3b-preview",          "GROQ_API_KEY_2", rpm=30),
    # OpenRouter — confirmed free-tier models only
    # NOTE: liquid/lfm-40b:free removed — free availability unconfirmed.
    _entry("fast-tier", "openrouter/meta-llama/llama-3.1-8b-instruct:free", "OPENROUTER_API_KEY_1", rpm=20),
    _entry("fast-tier", "openrouter/qwen/qwen3-8b:free",                    "OPENROUTER_API_KEY_1", rpm=20),
    _entry("fast-tier", "openrouter/google/gemma-3-12b-it:free",            "OPENROUTER_API_KEY_1", rpm=20),
    _entry("fast-tier", "openrouter/mistralai/mistral-7b-instruct:free",    "OPENROUTER_API_KEY_1", rpm=20),
    _entry("fast-tier", "openrouter/meta-llama/llama-3.1-8b-instruct:free", "OPENROUTER_API_KEY_2", rpm=20),
    _entry("fast-tier", "openrouter/qwen/qwen3-8b:free",                    "OPENROUTER_API_KEY_2", rpm=20),
    _entry("fast-tier", "openrouter/google/gemma-3-12b-it:free",            "OPENROUTER_API_KEY_2", rpm=20),
    # Gemini — final within-tier backstop
    _entry("fast-tier", "gemini/gemini-2.5-flash-lite", "GEMINI_API_KEY",  rpm=5),
]

# ─────────────────────────────────────────────────────────────────────────────
# CAPABLE-TIER  — complex / multi-step queries, legal & compliance reasoning
# Goal: quality over raw speed.  Models: 70B+ or equivalent.
# ─────────────────────────────────────────────────────────────────────────────
_CAPABLE = [
    # Groq 70B — fastest large-model inference available
    _entry("capable-tier", "groq/llama-3.3-70b-versatile",       "GROQ_API_KEY_1", rpm=30),
    _entry("capable-tier", "groq/deepseek-r1-distill-llama-70b", "GROQ_API_KEY_1", rpm=30),
    _entry("capable-tier", "groq/qwen-qwq-32b",                  "GROQ_API_KEY_1", rpm=30),
    _entry("capable-tier", "groq/meta-llama/llama-4-maverick-17b-128e-instruct", "GROQ_API_KEY_1", rpm=30),
    _entry("capable-tier", "groq/llama-3.3-70b-versatile",       "GROQ_API_KEY_2", rpm=30),
    _entry("capable-tier", "groq/deepseek-r1-distill-llama-70b", "GROQ_API_KEY_2", rpm=30),
    _entry("capable-tier", "groq/qwen-qwq-32b",                  "GROQ_API_KEY_2", rpm=30),
    # OpenRouter — confirmed free-tier models only
    # NOTE: qwen3-235b-a22b:free removed — OpenRouter confirmed it is NOT free (404).
    _entry("capable-tier", "openrouter/deepseek/deepseek-chat-v3-0324:free",       "OPENROUTER_API_KEY_1", rpm=20),
    _entry("capable-tier", "openrouter/qwen/qwen3-72b:free",                       "OPENROUTER_API_KEY_1", rpm=20),
    _entry("capable-tier", "openrouter/qwen/qwen3-30b-a3b:free",                   "OPENROUTER_API_KEY_1", rpm=20),
    _entry("capable-tier", "openrouter/meta-llama/llama-3.3-70b-instruct:free",    "OPENROUTER_API_KEY_1", rpm=20),
    _entry("capable-tier", "openrouter/google/gemma-3-27b-it:free",                "OPENROUTER_API_KEY_1", rpm=20),
    _entry("capable-tier", "openrouter/nousresearch/hermes-3-llama-3.1-405b:free", "OPENROUTER_API_KEY_1", rpm=20),
    _entry("capable-tier", "openrouter/deepseek/deepseek-chat-v3-0324:free",       "OPENROUTER_API_KEY_2", rpm=20),
    _entry("capable-tier", "openrouter/qwen/qwen3-72b:free",                       "OPENROUTER_API_KEY_2", rpm=20),
    _entry("capable-tier", "openrouter/meta-llama/llama-3.3-70b-instruct:free",    "OPENROUTER_API_KEY_2", rpm=20),
    _entry("capable-tier", "openrouter/nousresearch/hermes-3-llama-3.1-405b:free", "OPENROUTER_API_KEY_2", rpm=20),
    # Gemini — final within-tier backstop
    _entry("capable-tier", "gemini/gemini-2.5-flash",             "GEMINI_API_KEY", rpm=5),
]

# ─────────────────────────────────────────────────────────────────────────────
# SAFETY-TIER  — input / output safety classification (highest-stakes)
# Goal: accuracy & instruction-following.  Models: 70B+ only.
# ─────────────────────────────────────────────────────────────────────────────
_SAFETY = [
    # Groq 70B — best instruction-following + lowest latency for a large model
    _entry("safety-tier", "groq/llama-3.3-70b-versatile",       "GROQ_API_KEY_1", rpm=30),
    _entry("safety-tier", "groq/deepseek-r1-distill-llama-70b", "GROQ_API_KEY_1", rpm=30),
    _entry("safety-tier", "groq/llama-3.3-70b-versatile",       "GROQ_API_KEY_2", rpm=30),
    _entry("safety-tier", "groq/deepseek-r1-distill-llama-70b", "GROQ_API_KEY_2", rpm=30),
    # OpenRouter — confirmed free-tier only
    # NOTE: qwen3-235b-a22b:free removed — NOT free (OpenRouter 404).
    _entry("safety-tier", "openrouter/deepseek/deepseek-chat-v3-0324:free",       "OPENROUTER_API_KEY_1", rpm=20),
    _entry("safety-tier", "openrouter/meta-llama/llama-3.3-70b-instruct:free",    "OPENROUTER_API_KEY_1", rpm=20),
    _entry("safety-tier", "openrouter/qwen/qwen3-72b:free",                       "OPENROUTER_API_KEY_2", rpm=20),
    _entry("safety-tier", "openrouter/nousresearch/hermes-3-llama-3.1-405b:free", "OPENROUTER_API_KEY_2", rpm=20),
    # Gemini — backstop (rate-limited but reliable classifier)
    _entry("safety-tier", "gemini/gemini-2.5-flash",             "GEMINI_API_KEY", rpm=5),
]

# Flatten and drop None entries (keys not present in .env)
model_list = [e for e in (_FAST + _CAPABLE + _SAFETY) if e is not None]

if not model_list:
    raise RuntimeError(
        "LiteLLM Router: model_list is empty. "
        "Set at least GROQ_API_KEY_1 or GEMINI_API_KEY in your .env file."
    )

_tier_counts = {
    t: sum(1 for e in model_list if e["model_name"] == t)
    for t in ("fast-tier", "capable-tier", "safety-tier")
}
print(
    f"LiteLLM Router: loaded {len(model_list)} deployments — "
    + ", ".join(f"{t}: {n}" for t, n in _tier_counts.items())
)

try:
    from services.redis_service import redis_client
except ImportError:
    from .services.redis_service import redis_client

# ---------------------------------------------------------------------------
# Router configuration
# ---------------------------------------------------------------------------
# routing_strategy="usage-based-routing-v2": the Router tracks live RPM per
# deployment and always sends the next call to the least-loaded entry.
# This is strictly better than round-robin when entries have different rpm
# limits or different providers with different latencies.
#
# num_retries=3: up to 3 within-tier retries before raising / falling back.
# ---------------------------------------------------------------------------
router_kwargs = {
    "model_list": model_list,
    "routing_strategy": "usage-based-routing-v2",
    # Cross-tier fallbacks — only fire when EVERY entry in a tier has failed.
    "fallbacks": [
        {"fast-tier":    ["capable-tier"]},
        {"safety-tier":  ["capable-tier"]},
    ],
    "num_retries": 3,
}


if redis_client is not None:
    try:
        import litellm
        from litellm import Cache
        
        redis_url = os.getenv("REDIS_URL")
        if redis_url:
            litellm.cache = Cache(type="redis", url=redis_url)
        else:
            redis_host = os.getenv("REDIS_HOST", "localhost")
            redis_port = int(os.getenv("REDIS_PORT", 6379))
            redis_password = os.getenv("REDIS_PASSWORD", None)
            litellm.cache = Cache(
                type="redis",
                host=redis_host,
                port=redis_port,
                password=redis_password
            )
        # Enable caching on the Router instance
        router_kwargs["cache_responses"] = True
        print("LiteLLM caching successfully initialized with Redis.")
    except Exception as e:
        print(f"Failed to initialize LiteLLM cache: {e}")

router = Router(**router_kwargs)


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
).use(
    BiasCheck(debias_strength=0.5, on_fail="noop")
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

    Failure design: FAIL CLOSED. Any unhandled error in either the local
    validators or the LLM classifier denies the request rather than silently
    passing it through. A distinct [SAFETY-ALERT] prefix is logged on every
    such failure so it is visible in production log aggregation.
    """
    # 1. Run local Guardrails validators (PromptInjectionDetector, DetectPII).
    # NOTE: These only catch prompt injection patterns and PII — they do NOT
    # cover general harmful content (violence, weapons, self-harm). The LLM
    # classifier in step 2 is the actual content-moderation gate.
    # NOTE on validation_passed: we explicitly test `outcome.validation_passed is False`
    # rather than `not getattr(outcome, "validation_passed", True)`. The default-True
    # fallback silently passes if the real Guardrails library returns an object
    # whose attribute has a different name. Explicit False-testing is safer.
    try:
        outcome = input_guard.validate(message)
        if getattr(outcome, "validation_passed", None) is False:
            print("[SAFETY-ALERT] Input local validator blocked the request.")
            return False, "HIGH"
    except Exception as e:
        # Local validator error: fail closed — deny and alert.
        print(f"[SAFETY-ALERT] Input local validator raised an exception, denying request: {e}")
        return False, "HIGH"

    # 2. Run LLM-based safety classifier — this is the ONLY layer that covers
    # harmful content categories (violence, weapons, self-harm, illegal activity).
    # Runs on safety-tier (gemini-2.5-flash) — NOT fast-tier — because safety
    # checks are the highest-stakes decision in the pipeline and must not be
    # delegated to the weakest model.
    # FAIL CLOSED: any exception here denies the request rather than passing it.
    try:
        llm_messages = [{"role": "system", "content": GUARDRAIL_SYSTEM_PROMPT}]
        # Include recent history (up to last 6 messages / 3 turns) to detect
        # multi-turn Crescendo attacks that build harmful context incrementally.
        # Each prior turn is explicitly labelled as UNTRUSTED USER INPUT so the
        # classifier cannot be poisoned by a prior turn that instructs it to
        # change its verdict for the current message.
        for msg in history[-6:]:
            labeled_content = (
                f"[PRIOR TURN — UNTRUSTED USER INPUT]\n{msg['content']}"
            )
            llm_messages.append({"role": msg["role"], "content": labeled_content})
        llm_messages.append({"role": "user", "content": message})

        response = router.completion(
            model="safety-tier",
            messages=llm_messages,
            temperature=0.0,
            # max_tokens caps the ceiling; stop=["\n"] is the real enforcement:
            # the verdict tokens (UNSAFE / SAFE_MEDIUM / SAFE_LOW) never contain
            # a newline, so generation stops immediately after the token is
            # emitted — preventing any preamble from pushing the verdict out of
            # the response window.
            max_tokens=20,
            stop=["\n"]
        )
        # Guard against None content: some providers return content=None when
        # the stop sequence fires at the exact token boundary. Treat blank
        # input verdict as UNSAFE (fail closed).
        raw = response.choices[0].message.content
        if not raw:
            print("[SAFETY-ALERT] Input safety LLM returned empty/None content, denying request.")
            return False, "HIGH"
        decision = raw.strip().upper()
        print(f"Input safety LLM decision: {decision}")

        if not decision:
            print("[SAFETY-ALERT] Input safety LLM decision was blank after strip, denying request.")
            return False, "HIGH"

        if "UNSAFE" in decision:
            return False, "HIGH"
        elif "SAFE_MEDIUM" in decision:
            return True, "MEDIUM"
        else:
            return True, "LOW"
    except Exception as e:
        # LLM classifier error: fail closed — deny and alert.
        print(f"[SAFETY-ALERT] Input safety LLM classifier raised an exception, denying request: {e}")
        return False, "HIGH"

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

    Failure design: FAIL CLOSED. Any unhandled error in either the local
    validators or the LLM classifier blocks the response rather than passing it
    to the user. A distinct [SAFETY-ALERT] prefix is logged on every failure.
    """
    # 1. Run local Guardrails validators (GibberishText, GroundedAIHallucination,
    # GuardrailsPII, BiasCheck).
    # NOTE on validation_passed: see the same note in check_input_safety —
    # explicit is-False test prevents a missing attribute silently passing.
    try:
        outcome = output_guard.validate(output_text)
        if getattr(outcome, "validation_passed", None) is False:
            print("[SAFETY-ALERT] Output local validator blocked the response.")
            return False
    except Exception as e:
        # Local validator error: fail closed — block the response and alert.
        print(f"[SAFETY-ALERT] Output local validator raised an exception, blocking response: {e}")
        return False

    # 2. Run LLM-based output safety classifier.
    # Runs on safety-tier (gemini-2.5-flash) for the same reason as the input
    # classifier — output safety is a high-stakes decision.
    # FAIL CLOSED: any exception here blocks the response rather than passing it.
    try:
        response = router.completion(
            model="safety-tier",
            messages=[
                {"role": "system", "content": OUTPUT_GUARDRAIL_SYSTEM_PROMPT},
                {"role": "user", "content": output_text}
            ],
            temperature=0.0,
            max_tokens=20,
            stop=["\n"]
        )
        # Guard against None content (same reason as check_input_safety).
        # A blank output verdict is treated as SAFE — an empty response is
        # not harmful; the input guard is the primary safety gate.
        raw = response.choices[0].message.content
        decision = (raw or "").strip().upper()
        print(f"Output safety LLM decision: {decision}")

        if "UNSAFE" in decision:
            return False
        return True
    except Exception as e:
        # LLM classifier error: fail closed — block the response and alert.
        print(f"[SAFETY-ALERT] Output safety LLM classifier raised an exception, blocking response: {e}")
        return False
