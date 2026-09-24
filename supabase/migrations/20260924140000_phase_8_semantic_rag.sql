-- Phase 8: semantic RAG with Supabase pgvector + native Edge embeddings.
create extension if not exists vector with schema extensions;

alter table public.knowledge_chunks
  add column if not exists embedding extensions.vector(384);

create index if not exists knowledge_chunks_embedding_hnsw_idx
  on public.knowledge_chunks
  using hnsw (embedding vector_ip_ops);

create or replace function public.match_knowledge_chunks(
  query_embedding extensions.vector(384),
  match_threshold real default 0.70,
  match_count integer default 8
)
returns table(
  id uuid,
  document_id uuid,
  chunk_index integer,
  page_number integer,
  content text,
  source_title text,
  source_url text,
  language text,
  similarity real
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    kc.id,
    kc.document_id,
    kc.chunk_index,
    kc.page_number,
    kc.content,
    kc.source_title,
    kc.source_url,
    kc.language,
    (kc.embedding <#> query_embedding) * -1 as similarity
  from public.knowledge_chunks kc
  join public.knowledge_documents kd on kd.id = kc.document_id
  where kd.status = 'published'
    and kc.embedding is not null
    and (kc.embedding <#> query_embedding) * -1 >= match_threshold
  order by kc.embedding <#> query_embedding
  limit least(greatest(match_count, 1), 20);
$$;

grant execute on function public.match_knowledge_chunks(extensions.vector(384), real, integer) to authenticated;
