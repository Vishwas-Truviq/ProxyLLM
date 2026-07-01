from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from agent import run_chat_agent, run_chat_agent_stream, supabase

app = FastAPI(title="Amicorp AI Assistant", version="1.1.1", description="This is amicorp AI RAG Assisstant built using FASTAPI, LITELLM and supabase")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    stream: Optional[bool] = False

@app.get("/",tags=["Default"])
def read_root():
    return {"Hello": "World"}

@app.get("/status",tags=["Default"])
def status():
    return {"status": "Healthy"}

@app.post("/chat",tags=["AI RAG"])
def chat(request: ChatRequest):
    """
    Chat with the AI assistant.
    """
    if request.stream:
        return StreamingResponse(
            run_chat_agent_stream(request.message, request.conversation_id),
            media_type="text/event-stream"
        )
    else:
        result = run_chat_agent(request.message, request.conversation_id)
        return result

@app.get("/list_conversations", tags=["Admin"])
def list_conversations():
    """
    List all conversations.
    """
    if not supabase:
        return {"error": "Supabase client is not initialized"}
    try:
        res = supabase.table("conversations").select("*").order("updated_at", desc=True).execute()
        return res.data
    except Exception as e:
        return {"error": str(e)}

@app.delete("/delete_all_conversations", tags=["Admin"])
def delete_all_conversations():
    """
    Delete all conversations.
    """
    if not supabase:
        return {"error": "Supabase client is not initialized"}
    try:
        res = supabase.table("conversations").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        return {"status": "Success", "deleted_count": len(res.data) if res.data else 0}
    except Exception as e:
        return {"error": str(e)}

@app.get("/view_conversation", tags=["Admin"])
def view_conversation(conversation_id: str):
    """
    View details and message history of a specific conversation.
    """
    if not supabase:
        return {"error": "Supabase client is not initialized"}
    try:
        conv_res = supabase.table("conversations").select("*").eq("id", conversation_id).execute()
        if not conv_res.data:
            return {"error": "Conversation not found"}
        msg_res = supabase.table("messages").select("*").eq("conversation_id", conversation_id).order("created_at", desc=False).execute()
        return {
            "conversation": conv_res.data[0],
            "messages": msg_res.data
        }
    except Exception as e:
        return {"error": str(e)}


@app.delete("/delete_converation", tags=["Admin"])
def delete_conversation(conversation_id: str):
    """
    Delete a specific conversation by ID.
    """
    if not supabase:
        return {"error": "Supabase client is not initialized"}
    try:
        res = supabase.table("conversations").delete().eq("id", conversation_id).execute()
        if not res.data:
            return {"error": "Conversation not found or already deleted"}
        return {"status": "Success", "deleted_conversation": res.data[0]}
    except Exception as e:
        return {"error": str(e)}

@app.post("/clearcache", tags=["Admin"])
@app.get("/clearcache", tags=["Admin"])
def clear_cache():
    """
    Clears all cached items in Redis.
    """
    try:
        from services.redis_service import redis_client
        if not redis_client:
            return {"status": "Error", "message": "Redis client is not configured or connected."}
        redis_client.flushdb()
        return {"status": "Success", "message": "All database keys successfully flushed."}
    except Exception as e:
        return {"status": "Error", "message": f"Failed to flush Redis cache: {str(e)}"}


