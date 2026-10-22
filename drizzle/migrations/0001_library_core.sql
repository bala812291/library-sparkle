
-- ===== helpers =====
create or replace function public.is_staff(_uid uuid) returns boolean language sql stable security definer set search_path=public as $$
  select public.has_role(_uid,'admin') or exists (
    select 1 from public.user_roles r where r.user_id=_uid and r.role='librarian'
  )
$$;

-- ===== settings =====
create table public.library_settings (
  id int primary key default 1 check (id = 1),
  library_name text not null default 'College Library',
  max_books int not null default 3 check (max_books between 1 and 50),
  loan_days int not null default 14 check (loan_days between 1 and 365),
  fine_per_day numeric(10,2) not null default 10 check (fine_per_day >= 0),
  reservation_hold_days int not null default 3 check (reservation_hold_days between 1 and 30),
  updated_at timestamptz not null default now()
);
grant select, update on public.library_settings to authenticated;
grant all on public.library_settings to service_role;
alter table public.library_settings enable row level security;
create policy "settings read" on public.library_settings for select to authenticated using (true);
create policy "settings admin update" on public.library_settings for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
insert into public.library_settings (id) values (1);

-- ===== catalog =====
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null, description text,
  created_at timestamptz not null default now()
);
create unique index categories_name_uq on public.categories (lower(name));
create table public.authors (
  id uuid primary key default gen_random_uuid(),
  name text not null, bio text,
  created_at timestamptz not null default now()
);
create unique index authors_name_uq on public.authors (lower(name));
create table public.publishers (
  id uuid primary key default gen_random_uuid(),
  name text not null, description text,
  created_at timestamptz not null default now()
);
create unique index publishers_name_uq on public.publishers (lower(name));
create table public.books (
  id uuid primary key default gen_random_uuid(),
  book_no bigint generated always as identity unique,
  title text not null, subtitle text,
  isbn text not null,
  category_id uuid references public.categories(id) on delete set null,
  publisher_id uuid references public.publishers(id) on delete set null,
  publication_year int check (publication_year between 1000 and 2100),
  edition text, language text default 'English', description text,
  shelf text, rack text, cover_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index books_isbn_uq on public.books (lower(replace(isbn,'-','')));
create index books_category_idx on public.books(category_id);
create index books_title_idx on public.books(lower(title));
create table public.book_authors (
  book_id uuid not null references public.books(id) on delete cascade,
  author_id uuid not null references public.authors(id) on delete restrict,
  primary key (book_id, author_id)
);
create index book_authors_author_idx on public.book_authors(author_id);
create sequence public.accession_seq start 1001;
create table public.book_copies (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  accession_no text not null unique default ('ACC-' || nextval('public.accession_seq')::text),
  status text not null default 'available' check (status in ('available','issued','lost','damaged','maintenance')),
  created_at timestamptz not null default now()
);
create index book_copies_book_idx on public.book_copies(book_id, status);

do $$ declare t text; begin
  foreach t in array array['categories','authors','publishers','books','book_authors','book_copies'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%s read" on public.%I for select to authenticated using (true)', t, t);
    execute format('create policy "%s staff insert" on public.%I for insert to authenticated with check (public.is_staff(auth.uid()))', t, t);
    execute format('create policy "%s staff update" on public.%I for update to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()))', t, t);
    execute format('create policy "%s staff delete" on public.%I for delete to authenticated using (public.is_staff(auth.uid()))', t, t);
  end loop;
end $$;
grant usage on sequence public.accession_seq to authenticated;

-- ===== people =====
create table public.students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  register_no text,
  full_name text not null,
  email text not null,
  department text, course text, academic_year text, phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index students_reg_uq on public.students (lower(register_no)) where register_no is not null;
create unique index students_email_uq on public.students (lower(email));
create index students_dept_idx on public.students(department);
grant select, insert, update, delete on public.students to authenticated;
grant all on public.students to service_role;
alter table public.students enable row level security;
create policy "students read" on public.students for select to authenticated using (public.is_staff(auth.uid()) or user_id = auth.uid());
create policy "students staff insert" on public.students for insert to authenticated with check (public.is_staff(auth.uid()));
create policy "students staff update" on public.students for update to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "students admin delete" on public.students for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create or replace function public.my_student_id() returns uuid language sql stable security definer set search_path=public as $$
  select id from public.students where user_id = auth.uid()
$$;

create table public.librarians (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  employee_id text unique, phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.librarians to authenticated;
grant all on public.librarians to service_role;
alter table public.librarians enable row level security;
create policy "librarians read" on public.librarians for select to authenticated using (public.is_staff(auth.uid()) or user_id = auth.uid());
create policy "librarians admin update" on public.librarians for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- staff = admin or ACTIVE librarian
create or replace function public.is_staff(_uid uuid) returns boolean language sql stable security definer set search_path=public as $$
  select public.has_role(_uid,'admin') or exists (
    select 1 from public.user_roles r join public.librarians l on l.user_id = r.user_id
    where r.user_id=_uid and r.role='librarian' and l.is_active
  )
$$;

drop policy "own profile read" on public.profiles;
create policy "profile read" on public.profiles for select to authenticated using (auth.uid() = id or public.is_staff(auth.uid()));
drop policy "own roles read" on public.user_roles;
create policy "roles read" on public.user_roles for select to authenticated using (auth.uid() = user_id or public.is_staff(auth.uid()));
grant all on public.profiles to service_role;
grant all on public.user_roles to service_role;

-- ===== circulation =====
create table public.borrowing_transactions (
  id uuid primary key default gen_random_uuid(),
  txn_no bigint generated always as identity unique,
  copy_id uuid not null references public.book_copies(id) on delete restrict,
  book_id uuid not null references public.books(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  issued_by uuid, returned_to uuid,
  issue_date date not null default current_date,
  due_date date not null,
  return_date date,
  overdue_days int not null default 0,
  fine_amount numeric(10,2) not null default 0,
  status text not null default 'issued' check (status in ('issued','returned','lost')),
  created_at timestamptz not null default now(),
  returned_at timestamptz
);
create unique index tx_one_active_per_copy on public.borrowing_transactions(copy_id) where status='issued';
create index tx_student_idx on public.borrowing_transactions(student_id, status);
create index tx_book_idx on public.borrowing_transactions(book_id);
create index tx_due_idx on public.borrowing_transactions(due_date) where status='issued';
grant select on public.borrowing_transactions to authenticated;
grant all on public.borrowing_transactions to service_role;
alter table public.borrowing_transactions enable row level security;
create policy "tx read" on public.borrowing_transactions for select to authenticated using (public.is_staff(auth.uid()) or student_id = public.my_student_id());

create table public.fines (
  id uuid primary key default gen_random_uuid(),
  fine_no bigint generated always as identity unique,
  transaction_id uuid not null unique references public.borrowing_transactions(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  overdue_days int not null check (overdue_days >= 0),
  amount numeric(10,2) not null check (amount >= 0),
  amount_paid numeric(10,2) not null default 0 check (amount_paid >= 0),
  status text not null default 'unpaid' check (status in ('unpaid','partially_paid','paid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (amount_paid <= amount)
);
create index fines_student_idx on public.fines(student_id, status);
grant select on public.fines to authenticated;
grant all on public.fines to service_role;
alter table public.fines enable row level security;
create policy "fines read" on public.fines for select to authenticated using (public.is_staff(auth.uid()) or student_id = public.my_student_id());

create table public.fine_payments (
  id uuid primary key default gen_random_uuid(),
  receipt_no bigint generated always as identity unique,
  fine_id uuid not null references public.fines(id) on delete restrict,
  amount numeric(10,2) not null check (amount <> 0),
  kind text not null default 'payment' check (kind in ('payment','reversal')),
  method text, note text,
  reverses_payment_id uuid unique references public.fine_payments(id),
  client_ref uuid unique,
  recorded_by uuid,
  created_at timestamptz not null default now()
);
create index fine_payments_fine_idx on public.fine_payments(fine_id);
grant select on public.fine_payments to authenticated;
grant all on public.fine_payments to service_role;
alter table public.fine_payments enable row level security;
create policy "payments read" on public.fine_payments for select to authenticated using (
  public.is_staff(auth.uid()) or exists (select 1 from public.fines f where f.id = fine_id and f.student_id = public.my_student_id()));

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','ready','fulfilled','cancelled','expired')),
  ready_at timestamptz, expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index reservations_one_active on public.reservations(book_id, student_id) where status in ('pending','ready');
create index reservations_book_idx on public.reservations(book_id, status, created_at);
grant select on public.reservations to authenticated;
grant all on public.reservations to service_role;
alter table public.reservations enable row level security;
create policy "reservations read" on public.reservations for select to authenticated using (public.is_staff(auth.uid()) or student_id = public.my_student_id());

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null, body text,
  kind text not null default 'info',
  is_read boolean not null default false,
  dedupe_key text unique,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, is_read, created_at desc);
grant select, delete on public.notifications to authenticated;
grant update (is_read) on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "notif read" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notif update" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notif delete" on public.notifications for delete to authenticated using (user_id = auth.uid());

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null, entity text not null, entity_id text, details text,
  created_at timestamptz not null default now()
);
create index activity_logs_created_idx on public.activity_logs(created_at desc);
grant select on public.activity_logs to authenticated;
grant all on public.activity_logs to service_role;
alter table public.activity_logs enable row level security;
create policy "logs staff read" on public.activity_logs for select to authenticated using (public.is_staff(auth.uid()));

-- ===== internal helpers =====
create or replace function public.log_activity(_action text, _entity text, _id text, _details text) returns void language sql security definer set search_path=public as $$
  insert into public.activity_logs(actor_id, action, entity, entity_id, details) values (auth.uid(), _action, _entity, _id, _details)
$$;
create or replace function public.notify_user(_uid uuid, _title text, _body text, _kind text, _key text) returns void language plpgsql security definer set search_path=public as $$
begin
  if _uid is null then return; end if;
  insert into public.notifications(user_id, title, body, kind, dedupe_key) values (_uid, _title, _body, _kind, _key)
  on conflict (dedupe_key) do nothing;
end $$;
revoke execute on function public.log_activity(text,text,text,text) from public, anon, authenticated;
revoke execute on function public.notify_user(uuid,text,text,text,text) from public, anon, authenticated;

create or replace function public.trg_log_change() returns trigger language plpgsql security definer set search_path=public as $$
declare r jsonb := to_jsonb(coalesce(new, old));
begin
  perform public.log_activity(lower(tg_op), tg_table_name, r->>'id',
    coalesce(r->>'title', r->>'full_name', r->>'name', r->>'accession_no', r->>'library_name'));
  return coalesce(new, old);
end $$;
do $$ declare t text; begin
  foreach t in array array['categories','authors','publishers','books','students','librarians','library_settings'] loop
    execute format('create trigger log_%s after insert or update or delete on public.%I for each row execute function public.trg_log_change()', t, t);
  end loop;
end $$;

-- copy status consistency with transactions
create or replace function public.trg_copy_consistency() returns trigger language plpgsql set search_path=public as $$
begin
  if new.status = old.status then return new; end if;
  if old.status = 'issued' and exists (select 1 from public.borrowing_transactions where copy_id = new.id and status='issued') then
    raise exception 'This copy is currently issued. Return it first.';
  end if;
  if new.status = 'issued' and not exists (select 1 from public.borrowing_transactions where copy_id = new.id and status='issued') then
    raise exception 'Use Issue Book to issue a copy.';
  end if;
  return new;
end $$;
create trigger copy_consistency before update on public.book_copies for each row execute function public.trg_copy_consistency();

create or replace function public.trg_copy_delete() returns trigger language plpgsql set search_path=public as $$
begin
  if old.status = 'issued' then raise exception 'Cannot delete a copy that is currently issued.'; end if;
  return old;
end $$;
create trigger copy_delete before delete on public.book_copies for each row execute function public.trg_copy_delete();

create or replace function public.trg_book_delete() returns trigger language plpgsql set search_path=public as $$
begin
  if exists (select 1 from public.borrowing_transactions where book_id = old.id) then
    raise exception 'This book has borrowing history and cannot be deleted.';
  end if;
  return old;
end $$;
create trigger book_delete before delete on public.books for each row execute function public.trg_book_delete();

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger books_touch before update on public.books for each row execute function public.touch_updated_at();
create trigger students_touch before update on public.students for each row execute function public.touch_updated_at();

-- ===== signup: link/create student =====
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_name text := coalesce(nullif(new.raw_user_meta_data->>'full_name',''), split_part(new.email,'@',1));
begin
  insert into public.profiles (id, full_name, email) values (new.id, v_name, new.email);
  if lower(new.email) = 'balasiva1777@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'student');
    update public.students set user_id = new.id where lower(email) = lower(new.email) and user_id is null;
    if not found then
      insert into public.students (user_id, full_name, email) values (new.id, v_name, new.email)
      on conflict do nothing;
    end if;
  end if;
  return new;
end $$;

-- ===== views =====
create view public.books_catalog with (security_invoker = on) as
select b.*, c.name as category_name, p.name as publisher_name,
  coalesce((select string_agg(a.name, ', ' order by a.name) from public.book_authors ba join public.authors a on a.id = ba.author_id where ba.book_id = b.id), '') as author_names,
  (select count(*) from public.book_copies x where x.book_id = b.id)::int as total_copies,
  (select count(*) from public.book_copies x where x.book_id = b.id and x.status = 'available')::int as available_copies,
  (select count(*) from public.book_copies x where x.book_id = b.id and x.status = 'issued')::int as issued_copies
from public.books b
left join public.categories c on c.id = b.category_id
left join public.publishers p on p.id = b.publisher_id;
grant select on public.books_catalog to authenticated;

create view public.categories_view with (security_invoker = on) as
select c.*, (select count(*) from public.books b where b.category_id = c.id)::int as book_count from public.categories c;
grant select on public.categories_view to authenticated;

create view public.transactions_view with (security_invoker = on) as
select t.*, s.full_name as student_name, s.register_no, s.department, s.email as student_email,
  b.title as book_title, b.isbn, bc.accession_no,
  (t.status = 'issued' and t.due_date < current_date) as is_overdue,
  greatest(0, (coalesce(t.return_date, current_date) - t.due_date))::int as days_late
from public.borrowing_transactions t
join public.students s on s.id = t.student_id
join public.books b on b.id = t.book_id
join public.book_copies bc on bc.id = t.copy_id;
grant select on public.transactions_view to authenticated;

create view public.fines_view with (security_invoker = on) as
select f.*, (f.amount - f.amount_paid) as outstanding, s.full_name as student_name, s.register_no, s.department,
  b.title as book_title, t.txn_no, t.due_date, t.return_date
from public.fines f
join public.students s on s.id = f.student_id
join public.borrowing_transactions t on t.id = f.transaction_id
join public.books b on b.id = t.book_id;
grant select on public.fines_view to authenticated;

create view public.reservations_view with (security_invoker = on) as
select r.*, s.full_name as student_name, s.register_no, b.title as book_title,
  (select count(*) from public.reservations r2 where r2.book_id = r.book_id and r2.status = 'pending' and r2.created_at < r.created_at)::int + 1 as queue_position
from public.reservations r
join public.students s on s.id = r.student_id
join public.books b on b.id = r.book_id;
grant select on public.reservations_view to authenticated;

create view public.librarians_view with (security_invoker = on) as
select l.*, p.full_name, p.email,
  (select count(*) from public.borrowing_transactions t where t.issued_by = l.user_id)::int as issued_count,
  (select count(*) from public.borrowing_transactions t where t.returned_to = l.user_id)::int as returned_count
from public.librarians l join public.profiles p on p.id = l.user_id;
grant select on public.librarians_view to authenticated;

-- ===== secure operations =====
create or replace function public.issue_book(p_student uuid, p_copy uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare s record; c record; st record; v_count int; v_held int; v_avail int; v_tx uuid; v_title text;
begin
  if not public.is_staff(auth.uid()) then raise exception 'Not authorized'; end if;
  select * into st from public.library_settings where id = 1;
  select * into s from public.students where id = p_student for update;
  if not found then raise exception 'Student not found'; end if;
  if not s.is_active then raise exception 'Student account is deactivated'; end if;
  select count(*) into v_count from public.borrowing_transactions where student_id = p_student and status = 'issued';
  if v_count >= st.max_books then raise exception 'Borrowing limit reached (% of % books)', v_count, st.max_books; end if;
  select * into c from public.book_copies where id = p_copy for update;
  if not found then raise exception 'Copy not found'; end if;
  if c.status <> 'available' then raise exception 'Copy % is not available (%)', c.accession_no, c.status; end if;
  select count(*) into v_held from public.reservations where book_id = c.book_id and status = 'ready' and student_id <> p_student;
  select count(*) into v_avail from public.book_copies where book_id = c.book_id and status = 'available';
  if v_avail - v_held <= 0 then raise exception 'All available copies are on hold for reservations'; end if;
  insert into public.borrowing_transactions(copy_id, book_id, student_id, issued_by, due_date)
  values (p_copy, c.book_id, p_student, auth.uid(), current_date + st.loan_days) returning id into v_tx;
  update public.book_copies set status = 'issued' where id = p_copy;
  update public.reservations set status = 'fulfilled', updated_at = now()
    where book_id = c.book_id and student_id = p_student and status in ('pending','ready');
  select title into v_title from public.books where id = c.book_id;
  perform public.notify_user(s.user_id, 'Book issued', format('"%s" is due on %s.', v_title, to_char(current_date + st.loan_days, 'DD Mon YYYY')), 'issue', null);
  perform public.log_activity('issue', 'transaction', v_tx::text, format('%s → %s', v_title, s.full_name));
  return v_tx;
end $$;

create or replace function public.promote_reservation(p_book uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r record; st record; v_title text; v_free int; v_held int;
begin
  select * into st from public.library_settings where id = 1;
  select count(*) into v_free from public.book_copies where book_id = p_book and status = 'available';
  select count(*) into v_held from public.reservations where book_id = p_book and status = 'ready';
  if v_free - v_held <= 0 then return; end if;
  select * into r from public.reservations where book_id = p_book and status = 'pending' order by created_at limit 1 for update skip locked;
  if not found then return; end if;
  update public.reservations set status = 'ready', ready_at = now(), expires_at = now() + make_interval(days => st.reservation_hold_days), updated_at = now() where id = r.id;
  select title into v_title from public.books where id = p_book;
  perform public.notify_user((select user_id from public.students where id = r.student_id), 'Reservation ready',
    format('"%s" is ready for collection. Please collect within %s days.', v_title, st.reservation_hold_days), 'reservation', null);
end $$;
revoke execute on function public.promote_reservation(uuid) from public, anon, authenticated;

create or replace function public.return_book(p_tx uuid, p_lost boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t record; st record; v_days int; v_fine numeric; v_title text; v_uid uuid; v_name text;
begin
  if not public.is_staff(auth.uid()) then raise exception 'Not authorized'; end if;
  select * into st from public.library_settings where id = 1;
  select * into t from public.borrowing_transactions where id = p_tx for update;
  if not found then raise exception 'Transaction not found'; end if;
  if t.status <> 'issued' then raise exception 'This book has already been returned'; end if;
  v_days := greatest(0, current_date - t.due_date);
  v_fine := v_days * st.fine_per_day;
  update public.borrowing_transactions set status = case when p_lost then 'lost' else 'returned' end,
    return_date = current_date, returned_at = now(), returned_to = auth.uid(), overdue_days = v_days, fine_amount = v_fine
    where id = p_tx;
  update public.book_copies set status = case when p_lost then 'lost' else 'available' end where id = t.copy_id;
  if v_fine > 0 then
    insert into public.fines(transaction_id, student_id, overdue_days, amount) values (p_tx, t.student_id, v_days, v_fine);
  end if;
  select title into v_title from public.books where id = t.book_id;
  select user_id, full_name into v_uid, v_name from public.students where id = t.student_id;
  perform public.notify_user(v_uid, 'Book returned', format('"%s" returned.%s', v_title,
    case when v_fine > 0 then format(' Fine of ₹%s for %s day(s) late.', v_fine, v_days) else '' end), 'return', null);
  perform public.log_activity(case when p_lost then 'lost' else 'return' end, 'transaction', p_tx::text, format('%s ← %s', v_title, v_name));
  if not p_lost then perform public.promote_reservation(t.book_id); end if;
  return jsonb_build_object('transaction_id', p_tx, 'txn_no', t.txn_no, 'book_title', v_title, 'student_name', v_name,
    'issue_date', t.issue_date, 'due_date', t.due_date, 'return_date', current_date, 'overdue_days', v_days, 'fine', v_fine,
    'fine_per_day', st.fine_per_day, 'status', case when p_lost then 'lost' else 'returned' end);
end $$;

create or replace function public.record_fine_payment(p_fine uuid, p_amount numeric, p_method text, p_note text, p_ref uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare f record; v_out numeric; v_id uuid; v_new numeric;
begin
  if not public.is_staff(auth.uid()) then raise exception 'Not authorized'; end if;
  if p_ref is not null and exists (select 1 from public.fine_payments where client_ref = p_ref) then
    raise exception 'This payment was already recorded';
  end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Amount must be greater than zero'; end if;
  select * into f from public.fines where id = p_fine for update;
  if not found then raise exception 'Fine not found'; end if;
  v_out := f.amount - f.amount_paid;
  if v_out <= 0 then raise exception 'This fine is already fully paid'; end if;
  if p_amount > v_out then raise exception 'Amount exceeds outstanding balance of ₹%', v_out; end if;
  insert into public.fine_payments(fine_id, amount, kind, method, note, client_ref, recorded_by)
  values (p_fine, p_amount, 'payment', p_method, p_note, p_ref, auth.uid()) returning id into v_id;
  v_new := f.amount_paid + p_amount;
  update public.fines set amount_paid = v_new, updated_at = now(),
    status = case when v_new >= amount then 'paid' when v_new > 0 then 'partially_paid' else 'unpaid' end where id = p_fine;
  perform public.notify_user((select user_id from public.students where id = f.student_id), 'Fine payment recorded',
    format('₹%s received. Remaining balance ₹%s.', p_amount, v_out - p_amount), 'payment', null);
  perform public.log_activity('payment', 'fine', p_fine::text, format('₹%s via %s', p_amount, coalesce(p_method,'cash')));
  return v_id;
end $$;

create or replace function public.reverse_fine_payment(p_payment uuid, p_reason text) returns uuid
language plpgsql security definer set search_path = public as $$
declare p record; f record; v_id uuid; v_new numeric;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Only administrators can reverse payments'; end if;
  if coalesce(trim(p_reason),'') = '' then raise exception 'A reason is required'; end if;
  select * into p from public.fine_payments where id = p_payment for update;
  if not found or p.kind <> 'payment' then raise exception 'Payment not found'; end if;
  if exists (select 1 from public.fine_payments where reverses_payment_id = p_payment) then raise exception 'Payment already reversed'; end if;
  select * into f from public.fines where id = p.fine_id for update;
  insert into public.fine_payments(fine_id, amount, kind, note, reverses_payment_id, recorded_by)
  values (p.fine_id, -p.amount, 'reversal', p_reason, p_payment, auth.uid()) returning id into v_id;
  v_new := f.amount_paid - p.amount;
  update public.fines set amount_paid = v_new, updated_at = now(),
    status = case when v_new >= amount then 'paid' when v_new > 0 then 'partially_paid' else 'unpaid' end where id = f.id;
  perform public.log_activity('reversal', 'fine', f.id::text, format('₹%s reversed: %s', p.amount, p_reason));
  return v_id;
end $$;

create or replace function public.reserve_book(p_book uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare s record; v_id uuid; v_title text;
begin
  select * into s from public.students where user_id = auth.uid() for update;
  if not found then raise exception 'Only student accounts can reserve books'; end if;
  if not s.is_active then raise exception 'Your account is deactivated'; end if;
  if exists (select 1 from public.reservations where book_id = p_book and student_id = s.id and status in ('pending','ready')) then
    raise exception 'You already have an active reservation for this book';
  end if;
  if exists (select 1 from public.borrowing_transactions where book_id = p_book and student_id = s.id and status = 'issued') then
    raise exception 'You are currently borrowing this book';
  end if;
  insert into public.reservations(book_id, student_id) values (p_book, s.id) returning id into v_id;
  perform public.promote_reservation(p_book);
  select title into v_title from public.books where id = p_book;
  perform public.log_activity('reserve', 'reservation', v_id::text, format('%s by %s', v_title, s.full_name));
  return v_id;
end $$;

create or replace function public.cancel_reservation(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  select * into r from public.reservations where id = p_id for update;
  if not found then raise exception 'Reservation not found'; end if;
  if not (public.is_staff(auth.uid()) or r.student_id = public.my_student_id()) then raise exception 'Not authorized'; end if;
  if r.status not in ('pending','ready') then raise exception 'Only pending or ready reservations can be cancelled'; end if;
  update public.reservations set status = 'cancelled', updated_at = now() where id = p_id;
  perform public.log_activity('cancel', 'reservation', p_id::text, null);
  if r.status = 'ready' then perform public.promote_reservation(r.book_id); end if;
end $$;

create or replace function public.mark_reservation_ready(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r record; st record;
begin
  if not public.is_staff(auth.uid()) then raise exception 'Not authorized'; end if;
  select * into st from public.library_settings where id = 1;
  select * into r from public.reservations where id = p_id for update;
  if not found or r.status <> 'pending' then raise exception 'Only pending reservations can be marked ready'; end if;
  if not exists (select 1 from public.book_copies where book_id = r.book_id and status = 'available') then
    raise exception 'No copy is available right now';
  end if;
  update public.reservations set status = 'ready', ready_at = now(), expires_at = now() + make_interval(days => st.reservation_hold_days), updated_at = now() where id = p_id;
  perform public.notify_user((select user_id from public.students where id = r.student_id), 'Reservation ready',
    format('"%s" is ready for collection.', (select title from public.books where id = r.book_id)), 'reservation', null);
end $$;

create or replace function public.process_library_jobs() returns jsonb
language plpgsql security definer set search_path = public as $$
declare r record; v_exp int := 0; v_due int := 0; v_over int := 0;
begin
  if auth.uid() is not null and not public.has_role(auth.uid(),'admin') then raise exception 'Not authorized'; end if;
  for r in select * from public.reservations where status = 'ready' and expires_at < now() for update skip locked loop
    update public.reservations set status = 'expired', updated_at = now() where id = r.id;
    perform public.notify_user((select user_id from public.students where id = r.student_id), 'Reservation expired',
      format('Your reservation for "%s" expired.', (select title from public.books where id = r.book_id)), 'reservation', 'exp-' || r.id);
    perform public.promote_reservation(r.book_id);
    v_exp := v_exp + 1;
  end loop;
  for r in select * from public.transactions_view where status = 'issued' and due_date between current_date and current_date + 2 loop
    perform public.notify_user((select user_id from public.students where id = r.student_id), 'Due soon',
      format('"%s" is due on %s.', r.book_title, to_char(r.due_date, 'DD Mon YYYY')), 'due', 'due-' || r.id || '-' || current_date);
    v_due := v_due + 1;
  end loop;
  for r in select * from public.transactions_view where status = 'issued' and due_date < current_date loop
    perform public.notify_user((select user_id from public.students where id = r.student_id), 'Overdue book',
      format('"%s" is %s day(s) overdue. Please return it.', r.book_title, r.days_late), 'overdue', 'over-' || r.id || '-' || current_date);
    v_over := v_over + 1;
  end loop;
  return jsonb_build_object('expired', v_exp, 'due_soon', v_due, 'overdue', v_over);
end $$;

create or replace function public.set_librarian(p_email text, p_employee_id text, p_phone text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_id uuid;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Only administrators can manage librarians'; end if;
  select id into v_uid from public.profiles where lower(email) = lower(trim(p_email));
  if v_uid is null then raise exception 'No account found with that email. Ask them to sign up first.'; end if;
  if public.has_role(v_uid,'admin') then raise exception 'This user is an administrator'; end if;
  if exists (select 1 from public.borrowing_transactions t join public.students s on s.id = t.student_id where s.user_id = v_uid and t.status = 'issued') then
    raise exception 'This user has borrowed books outstanding';
  end if;
  insert into public.user_roles(user_id, role) values (v_uid, 'librarian') on conflict do nothing;
  delete from public.user_roles where user_id = v_uid and role = 'student';
  update public.students set is_active = false where user_id = v_uid;
  insert into public.librarians(user_id, employee_id, phone) values (v_uid, nullif(trim(p_employee_id),''), nullif(trim(p_phone),''))
  on conflict (user_id) do update set employee_id = excluded.employee_id, phone = excluded.phone, is_active = true
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.update_my_profile(p_full_name text, p_phone text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if coalesce(trim(p_full_name),'') = '' then raise exception 'Name is required'; end if;
  update public.profiles set full_name = trim(p_full_name) where id = auth.uid();
  update public.students set full_name = trim(p_full_name), phone = nullif(trim(p_phone),'') where user_id = auth.uid();
  update public.librarians set phone = nullif(trim(p_phone),'') where user_id = auth.uid();
end $$;

create or replace function public.dashboard_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff(auth.uid()) then raise exception 'Not authorized'; end if;
  return jsonb_build_object(
    'titles', (select count(*) from public.books),
    'copies', (select count(*) from public.book_copies),
    'available', (select count(*) from public.book_copies where status = 'available'),
    'issued', (select count(*) from public.book_copies where status = 'issued'),
    'students', (select count(*) from public.students),
    'librarians', (select count(*) from public.librarians where is_active),
    'overdue', (select count(*) from public.borrowing_transactions where status = 'issued' and due_date < current_date),
    'outstanding', (select coalesce(sum(amount - amount_paid),0) from public.fines),
    'issued_today', (select count(*) from public.borrowing_transactions where issue_date = current_date),
    'returned_today', (select count(*) from public.borrowing_transactions where return_date = current_date),
    'pending_reservations', (select count(*) from public.reservations where status in ('pending','ready'))
  );
end $$;

create or replace function public.circulation_monthly(p_months int default 6) returns table(month text, issued bigint, returned bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff(auth.uid()) then raise exception 'Not authorized'; end if;
  return query
  select to_char(m, 'Mon YY'),
    (select count(*) from public.borrowing_transactions t where date_trunc('month', t.issue_date) = m),
    (select count(*) from public.borrowing_transactions t where date_trunc('month', t.return_date) = m)
  from generate_series(date_trunc('month', current_date) - make_interval(months => p_months - 1), date_trunc('month', current_date), interval '1 month') m;
end $$;

create or replace function public.top_books(p_limit int default 5, p_from date default null, p_to date default null)
returns table(book_id uuid, title text, author_names text, borrow_count bigint)
language sql stable security definer set search_path = public as $$
  select b.id, b.title, b.author_names, count(t.id)
  from public.borrowing_transactions t join public.books_catalog b on b.id = t.book_id
  where public.is_staff(auth.uid()) and (p_from is null or t.issue_date >= p_from) and (p_to is null or t.issue_date <= p_to)
  group by b.id, b.title, b.author_names order by count(t.id) desc limit p_limit
$$;

revoke execute on function public.process_library_jobs() from public, anon;
grant execute on function public.issue_book(uuid,uuid), public.return_book(uuid,boolean), public.record_fine_payment(uuid,numeric,text,text,uuid),
  public.reverse_fine_payment(uuid,text), public.reserve_book(uuid), public.cancel_reservation(uuid), public.mark_reservation_ready(uuid),
  public.process_library_jobs(), public.set_librarian(text,text,text), public.update_my_profile(text,text), public.dashboard_stats(),
  public.circulation_monthly(int), public.top_books(int,date,date), public.my_student_id(), public.is_staff(uuid) to authenticated;

-- ===== storage policies for covers =====
create policy "covers public read" on storage.objects for select using (bucket_id = 'book-covers');
create policy "covers staff insert" on storage.objects for insert to authenticated with check (bucket_id = 'book-covers' and public.is_staff(auth.uid()));
create policy "covers staff update" on storage.objects for update to authenticated using (bucket_id = 'book-covers' and public.is_staff(auth.uid()));
create policy "covers staff delete" on storage.objects for delete to authenticated using (bucket_id = 'book-covers' and public.is_staff(auth.uid()));

-- ===== starter categories =====
insert into public.categories (name, description) values
 ('Computer Science','Programming, algorithms, systems'),
 ('Information Technology','Networks, databases, web'),
 ('Artificial Intelligence','Machine learning, deep learning'),
 ('Data Science','Statistics, analytics, big data'),
 ('Electronics','Circuits, signals, embedded systems'),
 ('Mechanical Engineering','Thermodynamics, design, manufacturing'),
 ('Mathematics','Pure and applied mathematics'),
 ('Physics','Classical and modern physics'),
 ('Literature','Fiction, poetry, classics'),
 ('Management','Business, finance, leadership'),
 ('Competitive Examinations','GATE, UPSC, placement prep');

-- backfill student rows for existing non-admin users
insert into public.students (user_id, full_name, email)
select p.id, coalesce(p.full_name, split_part(p.email,'@',1)), p.email from public.profiles p
where not public.has_role(p.id,'admin') and not exists (select 1 from public.students s where s.user_id = p.id)
on conflict do nothing;
