create table if not exists public.campus_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info',
  entity_type text,
  entity_id uuid,
  action_label text,
  action_target text,
  language text not null default 'en',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists campus_notifications_user_created_idx
  on public.campus_notifications(user_id, created_at desc);
create index if not exists campus_notifications_unread_idx
  on public.campus_notifications(user_id, read_at)
  where read_at is null;

alter table public.campus_notifications enable row level security;

drop policy if exists "Students read own notifications" on public.campus_notifications;
create policy "Students read own notifications"
on public.campus_notifications for select
using (auth.uid() = user_id);

drop policy if exists "Students update own notifications" on public.campus_notifications;
create policy "Students update own notifications"
on public.campus_notifications for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Admins manage notifications" on public.campus_notifications;
create policy "Admins manage notifications"
on public.campus_notifications for all
using (public.has_role(auth.uid(), 'admin'::app_role))
with check (public.has_role(auth.uid(), 'admin'::app_role));

create or replace function public.notify_campus_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'campus_service_requests' and (tg_op = 'INSERT' or (tg_op = 'UPDATE' and new.status is distinct from old.status)) then
    insert into public.campus_notifications(user_id,title,message,type,entity_type,entity_id,action_label,action_target)
    values (
      new.user_id,
      case when tg_op = 'INSERT' then 'Request submitted' else 'Application updated' end,
      case when tg_op = 'INSERT'
        then new.title || ' was submitted successfully.'
        else new.title || ' is now ' || replace(new.status, '_', ' ') || '.'
      end,
      case when new.status in ('rejected','cancelled') then 'warning' when new.status in ('approved','completed') then 'success' else 'info' end,
      'service_request', new.id, 'VIEW APPLICATIONS', 'applications'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists campus_request_notification_trigger on public.campus_service_requests;
create trigger campus_request_notification_trigger
after insert or update of status on public.campus_service_requests
for each row execute function public.notify_campus_status_change();

create or replace function public.notify_campus_ticket_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    insert into public.campus_notifications(user_id,title,message,type,entity_type,entity_id,action_label,action_target)
    values (
      new.user_id,
      case when tg_op = 'INSERT' then 'Support ticket created' else 'Support ticket updated' end,
      case when tg_op = 'INSERT' then new.subject || ' was submitted.'
        else 'Ticket ' || new.ticket_code || ' is now ' || replace(new.status, '_', ' ') || '.' end,
      case when new.status in ('resolved','closed') then 'success' else 'info' end,
      'support_ticket', new.id, 'VIEW SUPPORT', 'support'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists campus_ticket_notification_trigger on public.campus_support_tickets;
create trigger campus_ticket_notification_trigger
after insert or update of status on public.campus_support_tickets
for each row execute function public.notify_campus_ticket_change();

create or replace function public.notify_campus_appointment_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    insert into public.campus_notifications(user_id,title,message,type,entity_type,entity_id,action_label,action_target)
    values (
      new.user_id,
      case when tg_op = 'INSERT' then 'Appointment requested' else 'Appointment updated' end,
      case when tg_op = 'INSERT'
        then 'Appointment ' || new.appointment_code || ' was requested.'
        else 'Appointment ' || new.appointment_code || ' is now ' || replace(new.status, '_', ' ') || '.'
      end,
      case when new.status = 'confirmed' then 'success' when new.status = 'cancelled' then 'warning' else 'info' end,
      'appointment', new.id, 'VIEW APPOINTMENTS', 'appointments'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists campus_appointment_notification_trigger on public.campus_appointments;
create trigger campus_appointment_notification_trigger
after insert or update of status on public.campus_appointments
for each row execute function public.notify_campus_appointment_change();