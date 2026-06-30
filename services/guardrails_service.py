import sys
import types
import json
import re
from typing import Dict, List, Any, Optional

# Try importing base Validator from guardrails
try:
    from guardrails.validator_base import Validator, register_validator, ValidationResult, PassResult, FailResult
except ImportError:
    # Fallback/mock if the structure is different
    class ValidationResult:
        pass
    class PassResult(ValidationResult):
        def __init__(self, *args, **kwargs):
            pass
    class FailResult(ValidationResult):
        def __init__(self, error_message="Validation failed", *args, **kwargs):
            self.error_message = error_message
    class Validator:
        def __init__(self, on_fail=None, *args, **kwargs):
            self.on_fail = on_fail
    def register_validator(*args, **kwargs):
        return lambda cls: cls

# Define Local Validators

@register_validator(name="detect_pii", data_type="string")
class DetectPII(Validator):
    def __init__(self, pii_entities: Optional[List[str]] = None, on_fail: str = "noop", *args, **kwargs):
        super().__init__(on_fail=on_fail, *args, **kwargs)
        self.pii_entities = pii_entities or []

    def validate(self, value: str, metadata: Dict = {}) -> ValidationResult:
        # Check credit cards and emails
        if re.search(r"\b(?:\d[ -]*?){13,16}\b", value) or re.search(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", value):
            return FailResult(error_message="PII detected in input text.")
        return PassResult()

@register_validator(name="gibberish_text", data_type="string")
class GibberishText(Validator):
    def __init__(self, threshold: float = 0.5, validation_method: str = "sentence", on_fail: str = "noop", *args, **kwargs):
        super().__init__(on_fail=on_fail, *args, **kwargs)
        self.threshold = threshold

    def validate(self, value: str, metadata: Dict = {}) -> ValidationResult:
        # Check if the text contains high fraction of special symbols/digits vs letters
        words = value.split()
        if not words:
            return PassResult()
        gibberish_count = sum(1 for w in words if not w.isalnum())
        if (gibberish_count / len(words)) > self.threshold:
            return FailResult(error_message="Gibberish text detected.")
        return PassResult()

@register_validator(name="provenance_embeddings", data_type="string")
class ProvenanceEmbeddings(Validator):
    def __init__(self, threshold: float = 0.8, validation_method: str = "sentence", *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.threshold = threshold

    def validate(self, value: str, metadata: Dict = {}) -> ValidationResult:
        # Check word similarity with source context passed in metadata
        context = metadata.get("context", "")
        if not context:
            return PassResult()
        
        # Word overlap check
        val_words = set(value.lower().split())
        ctx_words = set(context.lower().split())
        if not val_words:
            return PassResult()
        overlap = len(val_words.intersection(ctx_words)) / len(val_words)
        # Provenance fails if similarity is too low (not supported by document)
        if overlap < (1 - self.threshold):
            return FailResult(error_message="Text lacks grounding in the source documents.")
        return PassResult()

@register_validator(name="provenance_llm", data_type="string")
class ProvenanceLLM(Validator):
    def __init__(self, validation_method: str = "sentence", llm_callable: Any = None, top_k: int = 3, max_tokens: int = 2, on_fail: str = "noop", *args, **kwargs):
        super().__init__(on_fail=on_fail, *args, **kwargs)

    def validate(self, value: str, metadata: Dict = {}) -> ValidationResult:
        context = metadata.get("context", "")
        if not context:
            return PassResult()
        # Fallback to ProvenanceEmbeddings overlap check
        val_words = set(value.lower().split())
        ctx_words = set(context.lower().split())
        if not val_words:
            return PassResult()
        overlap = len(val_words.intersection(ctx_words)) / len(val_words)
        if overlap < 0.2:
            return FailResult(error_message="Provenance check failed: statement not supported by retrieved context.")
        return PassResult()

@register_validator(name="similar_to_document", data_type="string")
class SimilarToDocument(Validator):
    def __init__(self, document: List[str] = [], threshold: float = 0.7, model: str = "all-MiniLM-L6-v2", *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.document = document
        self.threshold = threshold

    def validate(self, value: str, metadata: Dict = {}) -> ValidationResult:
        doc_text = " ".join(self.document)
        if not doc_text:
            return PassResult()
        val_words = set(value.lower().split())
        doc_words = set(doc_text.lower().split())
        if not val_words:
            return PassResult()
        overlap = len(val_words.intersection(doc_words)) / len(val_words)
        if overlap < self.threshold:
            return FailResult(error_message="Response is not similar enough to the target document.")
        return PassResult()

@register_validator(name="grounded_ai_hallucination", data_type="string")
class GroundedAIHallucination(Validator):
    def validate(self, value: str, metadata: Dict = {}) -> ValidationResult:
        context = metadata.get("context", "")
        if not context:
            return PassResult()
        val_words = set(value.lower().split())
        ctx_words = set(context.lower().split())
        if not val_words:
            return PassResult()
        overlap = len(val_words.intersection(ctx_words)) / len(val_words)
        if overlap < 0.15:
            return FailResult(error_message="Response contains hallucinated information.")
        return PassResult()

@register_validator(name="guardrails_pii", data_type="string")
class GuardrailsPII(Validator):
    def __init__(self, entities: Optional[List[str]] = None, model_name: str = "", *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.entities = entities or []

    def validate(self, value: str, metadata: Dict = {}) -> ValidationResult:
        # Same check as DetectPII
        if re.search(r"\b(?:\d[ -]*?){13,16}\b", value) or re.search(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", value):
            return FailResult(error_message="PII detected in response.")
        return PassResult()

@register_validator(name="llm_critic", data_type="string")
class LLMCritic(Validator):
    def __init__(self, metrics: Optional[List[str]] = None, max_score: int = 5, llm_callable: Any = None, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def validate(self, value: str, metadata: Dict = {}) -> ValidationResult:
        return PassResult()

@register_validator(name="mlcube_rag_retrieval", data_type="string")
class MLcubeRagContextValidator(Validator):
    def validate(self, value: str, metadata: Dict = {}) -> ValidationResult:
        return PassResult()

@register_validator(name="prompt_injection_detector", data_type="string")
class PromptInjectionDetector(Validator):
    def validate(self, value: str, metadata: Dict = {}) -> ValidationResult:
        msg = value.lower()
        patterns = [
            "ignore previous instructions",
            "system prompt",
            "you are a new",
            "developer settings",
            "translate the above"
        ]
        if any(p in msg for p in patterns):
            return FailResult(error_message="Prompt injection attempt detected.")
        return PassResult()

@register_validator(name="response_evaluator", data_type="string")
class ResponseEvaluator(Validator):
    def __init__(self, llm_callable: Any = None, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def validate(self, value: str, metadata: Dict = {}) -> ValidationResult:
        return PassResult()

@register_validator(name="valid_json", data_type="string")
class ValidJson(Validator):
    def validate(self, value: str, metadata: Dict = {}) -> ValidationResult:
        try:
            json.loads(value)
            return PassResult()
        except Exception:
            return FailResult(error_message="Invalid JSON string.")

# Dynamically create the guardrails.hub module to allow seamless imports
hub_mock = types.ModuleType("guardrails.hub")
sys.modules["guardrails.hub"] = hub_mock

# Bind local classes to the mocked hub module
hub_mock.DetectPII = DetectPII
hub_mock.GibberishText = GibberishText
hub_mock.ProvenanceEmbeddings = ProvenanceEmbeddings
hub_mock.ProvenanceLLM = ProvenanceLLM
hub_mock.SimilarToDocument = SimilarToDocument
hub_mock.GroundedAIHallucination = GroundedAIHallucination
hub_mock.GuardrailsPII = GuardrailsPII
hub_mock.LLMCritic = LLMCritic
hub_mock.MLcubeRagContextValidator = MLcubeRagContextValidator
hub_mock.PromptInjectionDetector = PromptInjectionDetector
hub_mock.ResponseEvaluator = ResponseEvaluator
hub_mock.ValidJson = ValidJson
