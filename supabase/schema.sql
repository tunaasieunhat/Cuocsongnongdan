-- =====================================================================
-- Nông Trại & Quán Nhỏ — lược đồ Supabase cho chế độ online (GĐ10)
-- Chạy toàn bộ file này trong Supabase > SQL Editor (một lần).
-- Mọi bảng đều bật Row Level Security: mỗi người chỉ sửa được dữ liệu của mình.
-- =====================================================================

-- Bản lưu game (chỉ chủ tài khoản đọc/ghi)
create table if not exists public.saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.saves enable row level security;
drop policy if exists "saves_own" on public.saves;
create policy "saves_own" on public.saves
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Hồ sơ công khai (bạn bè xem, bảng xếp hạng). Chỉ chủ sửa được.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code text not null unique,
  name text not null default 'Chủ nông trại' check (char_length(name) <= 24),
  shop text not null default 'Quán Nhỏ' check (char_length(shop) <= 28),
  level int not null default 1 check (level between 1 and 99),
  customers int not null default 0 check (customers >= 0),
  day int not null default 1 check (day >= 1),
  snapshot jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles for select to authenticated using (true);
drop policy if exists "profiles_write" on public.profiles;
create policy "profiles_write" on public.profiles for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Danh sách bạn bè (theo dõi một chiều)
create table if not exists public.friends (
  user_id uuid not null references auth.users (id) on delete cascade,
  friend_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);
alter table public.friends enable row level security;
drop policy if exists "friends_own" on public.friends;
create policy "friends_own" on public.friends
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Quà tặng: người gửi tạo, người nhận đọc và đánh dấu đã nhận
create table if not exists public.gifts (
  id bigint generated always as identity primary key,
  from_id uuid not null references auth.users (id) on delete cascade,
  to_id uuid not null references auth.users (id) on delete cascade,
  item text not null check (char_length(item) <= 16),
  qty int not null default 1 check (qty between 1 and 10),
  claimed boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.gifts enable row level security;
drop policy if exists "gifts_send" on public.gifts;
create policy "gifts_send" on public.gifts for insert to authenticated with check (from_id = auth.uid() and claimed = false);
drop policy if exists "gifts_read" on public.gifts;
create policy "gifts_read" on public.gifts for select to authenticated using (to_id = auth.uid() or from_id = auth.uid());
drop policy if exists "gifts_claim" on public.gifts;
create policy "gifts_claim" on public.gifts for update to authenticated using (to_id = auth.uid()) with check (to_id = auth.uid());
-- Giới hạn 20 quà / người gửi / ngày để tránh spam
create or replace function public.gift_limit() returns trigger language plpgsql as $$
begin
  if (select count(*) from public.gifts where from_id = new.from_id and created_at > now() - interval '1 day') >= 20 then
    raise exception 'Đã tặng quá 20 món hôm nay';
  end if;
  return new;
end $$;
drop trigger if exists gift_limit on public.gifts;
create trigger gift_limit before insert on public.gifts for each row execute function public.gift_limit();

-- Tưới giúp: mỗi người tưới giúp mỗi bạn 1 lần / ngày
create table if not exists public.helps (
  id bigint generated always as identity primary key,
  from_id uuid not null references auth.users (id) on delete cascade,
  to_id uuid not null references auth.users (id) on delete cascade,
  day date not null default current_date,
  claimed boolean not null default false,
  unique (from_id, to_id, day),
  check (from_id <> to_id)
);
alter table public.helps enable row level security;
drop policy if exists "helps_send" on public.helps;
create policy "helps_send" on public.helps for insert to authenticated with check (from_id = auth.uid() and claimed = false);
drop policy if exists "helps_read" on public.helps;
create policy "helps_read" on public.helps for select to authenticated using (to_id = auth.uid() or from_id = auth.uid());
drop policy if exists "helps_claim" on public.helps;
create policy "helps_claim" on public.helps for update to authenticated using (to_id = auth.uid()) with check (to_id = auth.uid());
