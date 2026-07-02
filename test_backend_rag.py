import os
import sys
from dotenv import load_dotenv

# Ensure Backend folder is in python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from agent import run_chat_agent

# Load backend .env explicitly
load_dotenv()

print("--- Testing Backend RAG with new Pinecone DB ---")
print(f"PINECONE_INDEX: {os.getenv('PINECONE_INDEX')}")
print(f"PINECONE_HOST: {os.getenv('PINECONE_HOST')}")

query = "who is LMT member of Bahamas?"
print(f"\nQuerying: '{query}'...")

try:
    result = run_chat_agent(query, conversation_id=None)
    
    print("\n=== Result Body Keys ===")
    print(list(result.keys()))
    
    print("\n=== LLM Response ===")
    print(result.get("response"))
    
    print("\n=== Matched Context Entities ===")
    context = result.get("context", [])
    print(f"Total entities found: {len(context)}")
    for idx, m in enumerate(context):
        meta = m.get("metadata", {})
        entity_name = meta.get("entity")
        country = meta.get("country")
        print(f"{idx+1}. {entity_name} ({country}) - Score: {m.get('score'):.4f}")
        
except Exception as e:
    print(f"Error executing agent: {e}")
