-- Performance optimization indexes for frequently queried patterns

-- Conversations ordered by created_at (inbox page)
create index if not exists conversations_business_created_idx 
  on conversations (business_id, created_at desc);

-- Messages by conversation (inbox detail page)
create index if not exists messages_conversation_created_idx 
  on messages (conversation_id, created_at asc);

-- Leads by business for pipeline view
create index if not exists leads_business_created_idx 
  on leads (business_id, created_at desc);

-- Leads by status for kanban board
create index if not exists leads_business_status_idx 
  on leads (business_id, status);

-- KB documents by business
create index if not exists kb_documents_business_idx 
  on kb_documents (business_id, created_at desc);

-- KB chunks by business for RAG queries
create index if not exists kb_chunks_business_idx 
  on kb_chunks (business_id);
