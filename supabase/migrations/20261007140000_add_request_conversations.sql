create table if not exists public.campus_request_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.campus_service_requests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  sender_role text not null check (sender_role in ('student','admin')),
  message text not null check (length(trim(message)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists campus_request_messages_request_idx
  on public.campus_request_messages(request_id, created_at);

alter table public.campus_request_messages enable row level security;

drop policy if exists "Students read own request messages" on public.campus_request_messages;
create policy "Students read own request messages"
on public.campus_request_messages for select
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.campus_service_requests r
    where r.id = campus_request_messages.request_id
      and r.user_id = auth.uid()
  )
);

drop policy if exists "Students send own request messages" on public.campus_request_messages;
create policy "Students send own request messages"
on public.campus_request_messages for insert
with check (
  auth.uid() = user_id
  and sender_role = 'student'
  and exists (
    select 1 from public.campus_service_requests r
    where r.id = request_id and r.user_id = auth.uid()
  )
);

drop policy if exists "Admins manage request messages" on public.campus_request_messages;
create policy "Admins manage request messages"
on public.campus_request_messages for all
using (public.has_role(auth.uid(), 'admin'::app_role))
with check (public.has_role(auth.uid(), 'admin'::app_role));

create or replace function public.notify_request_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare target_user uuid;
begin
  select r.user_id into target_user from public.campus_service_requests r where r.id = new.request_id;
  if new.sender_role = 'admin' then
    insert into public.campus_notifications(user_id,title,message,type,entity_type,entity_id,action_label,action_target)
    values(target_user,'New reply on your application',left(new.message,180),'info','service_request',new.request_id,'OPEN CONVERSATION','messages');
  end if;
  return new;
end;
$$;

drop trigger if exists campus_request_message_notification on public.campus_request_messages;
create trigger campus_request_message_notification
after insert on public.campus_request_messages
for each row execute function public.notify_request_message();

alter table public.campus_request_messages
  add column if not exists attachment_path text,
  add column if not exists attachment_name text;

insert into storage.buckets (id, name, public)
values ('campus-request-attachments', 'campus-request-attachments', false)
on conflict (id) do nothing;

drop policy if exists "Students upload request attachments" on storage.objects;
create policy "Students upload request attachments"
on storage.objects for insert
with check (
  bucket_id = 'campus-request-attachments'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Students read request attachments" on storage.objects;
create policy "Students read request attachments"
on storage.objects for select
using (
  bucket_id = 'campus-request-attachments'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.has_role(auth.uid(), 'admin'::app_role)
  )
);

drop policy if exists "Students delete own request attachments" on storage.objects;
create policy "Students delete own request attachments"
on storage.objects for delete
using (
  bucket_id = 'campus-request-attachments'
  and auth.uid()::text = (storage.foldername(name))[1]
);