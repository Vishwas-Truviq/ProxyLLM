try:
    from .intent_router import classify_by_rules, llm_router
    from ..core.config import get_env_var
except (ImportError, ValueError):
    from routers.intent_router import classify_by_rules, llm_router
    from core.config import get_env_var

def choose_model(message: str) -> str:
    """
    Selects the appropriate LLM model tier based on rules and LLM classification.
    Returns: "fast-tier" or "capable-tier"
    """
    rule_result = classify_by_rules(message)

    if rule_result == "simple":
        return "fast-tier"

    if rule_result == "complex":
        return "capable-tier"

    decision = llm_router(message)

    if decision == "CAPABLE":
        return "capable-tier"

    return "fast-tier"
