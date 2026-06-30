-- SQL Migration: 001_Basic_Conversation.sql
-- Description: Sets up the tables for chat history, messages, and RAG context auditing in Supabase.

-- 1. Enable uuid-ossp extension if not already enabled
create extension if not exists "uuid-ossp";

-- 2. Create Conversations Table
-- Stores chat sessions/conversations
create table if not exists conversations (
    id uuid primary key default uuid_generate_v4(),
    title text,
    user_id uuid, -- Optional: Can be foreign keyed to auth.users(id) if using Supabase Auth
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 3. Create Messages Table
-- Stores individual user queries, assistant responses, and RAG context used
create table if not exists messages (
    id uuid primary key default uuid_generate_v4(),
    conversation_id uuid not null references conversations(id) on delete cascade,
    role text not null check (role in ('user', 'assistant', 'system')),
    content text not null,
    context jsonb, -- Stores Pinecone metadata context used for generating the assistant's answer
    created_at timestamptz not null default now()
);

-- 4. Create Indexes for faster query performance
create index if not exists idx_messages_conversation_id on messages(conversation_id);
create index if not exists idx_conversations_user_id on conversations(user_id);

-- 5. Trigger to automatically update updated_at in conversations on updates
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger update_conversations_updated_at
    before update on conversations
    for each row
    execute function update_updated_at_column();
