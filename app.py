from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from agent import run_chat_agent, run_chat_agent_stream

app = FastAPI()

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
