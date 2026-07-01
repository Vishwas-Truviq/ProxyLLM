# Backend/agent.py
import os
import json
import hashlib
import requests
import litellm
from dotenv import load_dotenv
from supabase import create_client, Client

try:
    from routers.intent_router import static_response
    from routers.model_router import choose_model
    from services.llm_service import (
        mask_pii,
        check_input_safety,
        defend_history_poisoning,
        check_output_safety
    )
    from core.prompts import CHATBOT_SYSTEM_PROMPT_TEMPLATE
    from services.redis_service import cache_get, cache_set, cache_delete
except ImportError:
    from .routers.intent_router import static_response
    from .routers.model_router import choose_model
    from .services.llm_service import (
        mask_pii,
        check_input_safety,
        defend_history_poisoning,
        check_output_safety
    )
    from .core.prompts import CHATBOT_SYSTEM_PROMPT_TEMPLATE
    from .services.redis_service import cache_get, cache_set, cache_delete

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
COHERE_API_KEY = os.getenv("COHERE_API_KEY")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX = os.getenv("PINECONE_INDEX", "amicorp-kb")
PINECONE_HOST = os.getenv("PINECONE_HOST", "amicorp-kb-ot25xdb.svc.aped-4627-b74a.pinecone.io")

# Configure LiteLLM
litellm.api_base = os.getenv("LITELLM_API_BASE", "http://localhost:4000")
litellm.api_key = os.getenv("LITELLM_API_KEY", "your-litellm-proxy-key")

# Initialize Supabase Client
supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY and not SUPABASE_URL.startswith("https://your-project"):
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"Failed to initialize Supabase client: {e}")
else:
    print("Supabase URL or Key not set. Running in local-only / fallback mode.")


# --- 1. RAG Logic (Cohere + Pinecone) ---

def get_cohere_embedding(text: str) -> list:
    """
    Gets text embedding from Cohere, checking Redis cache first.
    """
    text_to_embed = text[:512]
    # Create md5 hash of the text to use as cache key
    text_hash = hashlib.md5(text_to_embed.encode('utf-8')).hexdigest()
    cache_key = f"embedding:{text_hash}"
    
    cached = cache_get(cache_key)
    if cached:
        try:
            return json.loads(cached)
        except Exception as e:
            print(f"Error decoding cached embedding: {e}")
            
    if not COHERE_API_KEY:
        raise ValueError("Missing COHERE_API_KEY in environment variables.")

    url = "https://api.cohere.com/v1/embed"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {COHERE_API_KEY}"
    }
    payload = {
        "texts": [text_to_embed],
        "model": "embed-english-light-v3.0",
        "input_type": "search_query",
        "truncate": "END"
    }

    response = requests.post(url, json=payload, headers=headers)
    if response.status_code != 200:
        raise Exception(f"Cohere embedding request failed with code {response.status_code}: {response.text}")
    
    data = response.json()
    embedding = data["embeddings"][0]
    
    # Cache embedding with a 7-day TTL (604800 seconds)
    cache_set(cache_key, json.dumps(embedding), ex_seconds=604800)
    
    return embedding


def query_pinecone(vector: list, top_k: int = 5) -> list:
    """
    Queries Pinecone database for matching chunks.
    """
    if not PINECONE_API_KEY:
        raise ValueError("Missing PINECONE_API_KEY in environment variables.")

    # Standardize host URL
    host = PINECONE_HOST.replace("https://", "").replace("http://", "")
    url = f"https://{host}/query"
    
    headers = {
        "Content-Type": "application/json",
        "Api-Key": PINECONE_API_KEY
    }
    payload = {
        "vector": vector,
        "topK": top_k,
        "includeMetadata": True
    }

    response = requests.post(url, json=payload, headers=headers)
    if response.status_code != 200:
        raise Exception(f"Pinecone query request failed with code {response.status_code}: {response.text}")
    
    data = response.json()
    return data.get("matches", [])


# --- 2. Conversation & Message Session Logic ---

def fetch_conversation_history(conversation_id: str) -> list:
    """
    Fetches message history for a conversation. Checks Redis cache first, falls back to Supabase.
    """
    cache_key = f"conv_history:{conversation_id}"
    cached = cache_get(cache_key)
    if cached:
        try:
            return json.loads(cached)
        except Exception as e:
            print(f"Error decoding cached history: {e}")
            
    if not supabase:
        return []
    
    try:
        res = supabase.table("messages")\
            .select("role", "content")\
            .eq("conversation_id", conversation_id)\
            .order("created_at", desc=False)\
            .execute()
        
        history = res.data
        # Cache history with a 1-hour TTL (3600 seconds)
        cache_set(cache_key, json.dumps(history), ex_seconds=3600)
        return history
    except Exception as e:
        print(f"Error fetching conversation history: {e}")
        return []


def create_supabase_conversation(title: str = None) -> str:
    """
    Creates a new conversation in Supabase and returns its ID.
    """
    if not supabase:
        import uuid
        return str(uuid.uuid4())
    
    try:
        res = supabase.table("conversations").insert({"title": title}).execute()
        if res.data:
            return res.data[0]["id"]
    except Exception as e:
        print(f"Error creating conversation: {e}")
    
    import uuid
    return str(uuid.uuid4())


def save_supabase_message(conversation_id: str, role: str, content: str, context: list = None):
    """
    Saves a message to the database and invalidates the Redis history cache.
    """
    if supabase:
        try:
            supabase.table("messages").insert({
                "conversation_id": conversation_id,
                "role": role,
                "content": content,
                "context": context
            }).execute()
        except Exception as e:
            print(f"Error saving message to Supabase: {e}")
            
    # Invalidate Redis cache key
    cache_delete(f"conv_history:{conversation_id}")


# --- 3. Main Chat Execution (Modular Request Lifecycle) ---

def run_chat_agent(user_message: str, conversation_id: str = None) -> dict:
    """
    Executes the main Agent RAG logic.
    1. Runs modular input safety checks and PII masking.
    2. Setup/Fetch Supabase session & history.
    3. Handles fast static responses (greetings/goodbyes).
    4. Applies history poisoning defense if risk level is MEDIUM.
    5. Retrieves Pinecone context.
    6. Formats chatbot system prompt.
    7. Runs dynamically chosen model.
    8. Validates output safety.
    """
    # 1. PII Masking and Input Safety Guardrail
    masked_message = mask_pii(user_message)
    
    is_new = False
    if not conversation_id:
        conversation_id = create_supabase_conversation(masked_message[:60])
        is_new = True
        
    past_messages = fetch_conversation_history(conversation_id)
    history_list = [{"role": msg["role"], "content": msg["content"]} for msg in past_messages]

    is_safe, risk_level = check_input_safety(masked_message, history_list)
    if not is_safe:
        return {
            "response": "I cannot fulfill this request. It violates my safety guidelines.",
            "conversation_id": conversation_id,
            "context": [],
            "guardrail_triggered": True
        }

    # Save User message to database
    save_supabase_message(conversation_id, "user", masked_message)

    # 2. Check for fast static responses (greetings/goodbyes)
    static_reply = static_response(masked_message)
    if static_reply is not None:
        save_supabase_message(conversation_id, "assistant", static_reply, context=[])
        return {
            "response": static_reply,
            "conversation_id": conversation_id,
            "context": [],
            "guardrail_triggered": False
        }

    # 3. Mitigate multi-turn context poisoning ONLY if risk level is elevated (MEDIUM)
    if risk_level == "MEDIUM":
        history_list = defend_history_poisoning(history_list)

    # 4. Retrieve Context from Pinecone using Cohere embeddings
    context_matches = []
    retrieved_text_blocks = []
    try:
        vector = get_cohere_embedding(masked_message)
        matches = query_pinecone(vector, top_k=5)
        # Filter matching threshold > 0.3
        context_matches = [m for m in matches if m.get("score", 0) > 0.3]
        retrieved_text_blocks = [m["metadata"]["text"] for m in context_matches if "metadata" in m and "text" in m["metadata"]]
    except Exception as e:
        print(f"RAG retrieval error: {e}")

    # Early fallback if no relevant context matches were found
    if not retrieved_text_blocks:
        fallback_msg = "I'm sorry, I don't have specific information about that in our knowledge base. Your question has been forwarded to our support team. Please contact dinesh.maddi@truviq.com for further assistance."
        save_supabase_message(conversation_id, "assistant", fallback_msg, context=[])
        return {
            "response": fallback_msg,
            "conversation_id": conversation_id,
            "context": [],
            "guardrail_triggered": False
        }

    # Build context string
    context_str = "\n---\n".join(retrieved_text_blocks)

    # Build LiteLLM Messages using template
    system_instruction = CHATBOT_SYSTEM_PROMPT_TEMPLATE.format(context_str=context_str)

    llm_messages = [{"role": "system", "content": system_instruction}]
    
    # Add history
    for msg in history_list:
        llm_messages.append({"role": msg["role"], "content": msg["content"]})
    
    # Add current user message
    llm_messages.append({"role": "user", "content": masked_message})

    # 5. Call LiteLLM with dynamic routing
    try:
        chosen_tier = choose_model(masked_message)
        from services.llm_service import router
        response = router.completion(
            model=chosen_tier,
            messages=llm_messages,
            temperature=0.2,
            caching=True
        )
        assistant_raw_content = response.choices[0].message.content
    except Exception as e:
        print(f"LiteLLM error: {e}")
        assistant_raw_content = (
            "I'm unable to connect to the model right now. "
            "Please contact our support team directly at dinesh.maddi@truviq.com."
        )

    # 6. Output Guardrails
    if not check_output_safety(assistant_raw_content):
        return {
            "response": "I generated a response that violates my safety guidelines, so I cannot present it to you.",
            "conversation_id": conversation_id,
            "context": [],
            "guardrail_triggered": True
        }

    # Extract match metadata to save in context column
    auditable_context = []
    for m in context_matches:
        auditable_context.append({
            "id": m.get("id"),
            "score": m.get("score"),
            "metadata": m.get("metadata")
        })

    # Save Assistant message to database
    save_supabase_message(conversation_id, "assistant", assistant_raw_content, context=auditable_context)

    return {
        "response": assistant_raw_content,
        "conversation_id": conversation_id,
        "context": auditable_context,
        "guardrail_triggered": False
    }


def run_chat_agent_stream(user_message: str, conversation_id: str = None):
    """
    Streaming version of run_chat_agent yielding SSE style JSON tokens.
    """
    # 1. PII Masking and Input Safety Guardrail
    masked_message = mask_pii(user_message)

    # Setup/Fetch Conversation Session
    if not conversation_id:
        conversation_id = create_supabase_conversation(masked_message[:60])
    
    past_messages = fetch_conversation_history(conversation_id)
    history_list = [{"role": msg["role"], "content": msg["content"]} for msg in past_messages]

    is_safe, risk_level = check_input_safety(masked_message, history_list)
    if not is_safe:
        yield f"data: {{\"error\": \"I cannot fulfill this request. It violates my safety guidelines.\", \"guardrail_triggered\": true}}\n\n"
        yield "data: [DONE]\n\n"
        return

    # Save User message
    save_supabase_message(conversation_id, "user", masked_message)

    # 2. Check for fast static responses (greetings/goodbyes)
    static_reply = static_response(masked_message)
    if static_reply is not None:
        save_supabase_message(conversation_id, "assistant", static_reply, context=[])
        yield f"data: {{\"conversation_id\": \"{conversation_id}\", \"is_start\": true}}\n\n"
        yield f"data: {{\"choices\": [{{\"delta\": {{\"content\": {repr(static_reply)}}} }}]}}\n\n"
        yield "data: [DONE]\n\n"
        return

    # 3. Mitigate multi-turn context poisoning ONLY if risk level is elevated (MEDIUM)
    if risk_level == "MEDIUM":
        history_list = defend_history_poisoning(history_list)

    # 4. Retrieve Context
    context_matches = []
    retrieved_text_blocks = []
    try:
        vector = get_cohere_embedding(masked_message)
        matches = query_pinecone(vector, top_k=5)
        context_matches = [m for m in matches if m.get("score", 0) > 0.3]
        retrieved_text_blocks = [m["metadata"]["text"] for m in context_matches if "metadata" in m and "text" in m["metadata"]]
    except Exception as e:
        print(f"RAG retrieval error in stream: {e}")

    # Early fallback if no relevant context matches were found
    if not retrieved_text_blocks:
        import json
        fallback_msg = "I'm sorry, I don't have specific information about that in our knowledge base. Your question has been forwarded to our support team. Please contact dinesh.maddi@truviq.com for further assistance."
        save_supabase_message(conversation_id, "assistant", fallback_msg, context=[])
        yield f"data: {{\"conversation_id\": \"{conversation_id}\", \"is_start\": true}}\n\n"
        yield f"data: {json.dumps({'choices': [{'delta': {'content': fallback_msg}}]})}\n\n"
        yield "data: [DONE]\n\n"
        return

    context_str = "\n---\n".join(retrieved_text_blocks)
    
    # Build prompts
    system_instruction = CHATBOT_SYSTEM_PROMPT_TEMPLATE.format(context_str=context_str)

    llm_messages = [{"role": "system", "content": system_instruction}]
    for msg in history_list:
        llm_messages.append({"role": msg["role"], "content": msg["content"]})
    llm_messages.append({"role": "user", "content": masked_message})

    # 5. Stream from LiteLLM
    full_response = ""
    try:
        # Yield metadata block first to let client know session parameters
        yield f"data: {{\"conversation_id\": \"{conversation_id}\", \"is_start\": true}}\n\n"

        chosen_tier = choose_model(masked_message)
        from services.llm_service import router
        response_stream = router.completion(
            model=chosen_tier,
            messages=llm_messages,
            temperature=0.2,
            stream=True,
            caching=True
        )

        for chunk in response_stream:
            content = chunk.choices[0].delta.content or ""
            if content:
                full_response += content
                yield f"data: {{\"choices\": [{{\"delta\": {{\"content\": {repr(content)}}} }}]}}\n\n"
    
    except Exception as e:
        print(f"LiteLLM streaming error: {e}")
        error_msg = "\nI'm unable to connect to the model right now. Please contact our support team at dinesh.maddi@truviq.com."
        full_response += error_msg
        yield f"data: {{\"choices\": [{{\"delta\": {{\"content\": {repr(error_msg)}}} }}]}}\n\n"

    # 6. Output Guardrail on full assembled response
    if not check_output_safety(full_response):
        warning_msg = "\n[ERROR: This response violates safety guidelines and has been blocked.]"
        yield f"data: {{\"choices\": [{{\"delta\": {{\"content\": {repr(warning_msg)}}} }}], \"guardrail_triggered\": true}}\n\n"
        save_supabase_message(conversation_id, "assistant", "Response blocked due to safety guidelines violation.", context=[])
    else:
        # Save Assistant response to Supabase
        auditable_context = []
        for m in context_matches:
            auditable_context.append({
                "id": m.get("id"),
                "score": m.get("score"),
                "metadata": m.get("metadata")
            })
        save_supabase_message(conversation_id, "assistant", full_response, context=auditable_context)

    yield "data: [DONE]\n\n"
