-- ============================================================
-- 단어야 놀자! (PlayVoca) - Supabase 데이터베이스 마이그레이션
--   - 동일 Supabase 프로젝트(ybhiznlelnpwaicyoifa) 내 'voca' 전용 스키마 생성
--   - public.service_members 연동 (service = 'voca')
--   - 관리자: phiskim@gmail.com
--   - Supabase 대시보드 > SQL Editor 에서 한 번 실행하세요.
-- ============================================================

-- ---------- 1) voca 전용 스키마 생성 및 권한 ----------
create schema if not exists voca;
grant usage on schema voca to anon, authenticated, service_role;

-- ---------- 2) 사용자 프로필 테이블 ----------
create table if not exists voca.profiles (
  id           uuid primary key references auth.users on delete cascade,
  nickname     text,
  daily_goal   int not null default 10,   -- 하루 목표 단어 수
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 회원가입/첫 접속 시 voca 프로필 생성 함수
create or replace function voca.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = voca, public
as $$
begin
  insert into voca.profiles (id, nickname)
  values (new.id, coalesce(new.raw_user_meta_data->>'nickname', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_voca on auth.users;
create trigger on_auth_user_created_voca
  after insert on auth.users
  for each row execute function voca.handle_new_user();

-- ---------- 3) 단어 학습 진도 및 북마크 (learn_progress) ----------
-- item_id 예: 'w_123' (단어 ID), 'bm_123' (북마크 단어)
create table if not exists voca.learn_progress (
  user_id     uuid not null references auth.users on delete cascade,
  item_id     text not null,
  learned_at  timestamptz not null default now(),
  primary key (user_id, item_id)
);
create index if not exists voca_learn_progress_user_idx on voca.learn_progress (user_id);

-- ---------- 4) 4지선다 퀴즈 결과 (quiz_results) ----------
create table if not exists voca.quiz_results (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users on delete cascade,
  category    text not null,             -- 'toeic' | 'suneung' | 'all' 등
  mode        text not null default 'en_ko', -- 'en_ko' | 'ko_en'
  total       int  not null,
  score       int  not null,
  percent     int  not null,
  passed      boolean not null default false,
  wrong       jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists voca_quiz_results_user_idx on voca.quiz_results (user_id, created_at desc);

-- ---------- 5) 페이지 조회수 및 접속 시간대 통계 (page_views) ----------
create table if not exists voca.page_views (
  id         bigint generated always as identity primary key,
  path       text not null,                -- 화면 경로 (예: '/learn.html', '/index.html')
  page_title text,                         -- 화면 명칭
  referrer   text,
  user_id    uuid references auth.users on delete set null,
  hour       int not null default extract(hour from (now() at time zone 'Asia/Seoul')), -- KST 0~23시
  day        date not null default (current_date at time zone 'Asia/Seoul')::date,
  created_at timestamptz not null default now()
);
create index if not exists voca_page_views_day_idx on voca.page_views (day desc, hour);
create index if not exists voca_page_views_path_idx on voca.page_views (path);

-- ---------- 6) RLS (Row Level Security) 설정 ----------
alter table voca.profiles       enable row level security;
alter table voca.learn_progress enable row level security;
alter table voca.quiz_results   enable row level security;
alter table voca.page_views     enable row level security;

-- profiles RLS
drop policy if exists "voca_profiles_select_own" on voca.profiles;
create policy "voca_profiles_select_own" on voca.profiles
  for select using (auth.uid() = id);

drop policy if exists "voca_profiles_upsert_own" on voca.profiles;
create policy "voca_profiles_upsert_own" on voca.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "voca_profiles_update_own" on voca.profiles;
create policy "voca_profiles_update_own" on voca.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "voca_profiles_select_admin" on voca.profiles;
create policy "voca_profiles_select_admin" on voca.profiles
  for select using (auth.jwt()->>'email' = 'phiskim@gmail.com');

-- learn_progress RLS
drop policy if exists "voca_progress_all_own" on voca.learn_progress;
create policy "voca_progress_all_own" on voca.learn_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "voca_progress_select_admin" on voca.learn_progress;
create policy "voca_progress_select_admin" on voca.learn_progress
  for select using (auth.jwt()->>'email' = 'phiskim@gmail.com');

-- quiz_results RLS
drop policy if exists "voca_quiz_select_own" on voca.quiz_results;
create policy "voca_quiz_select_own" on voca.quiz_results
  for select using (auth.uid() = user_id);

drop policy if exists "voca_quiz_insert_own" on voca.quiz_results;
create policy "voca_quiz_insert_own" on voca.quiz_results
  for insert with check (auth.uid() = user_id);

drop policy if exists "voca_quiz_select_admin" on voca.quiz_results;
create policy "voca_quiz_select_admin" on voca.quiz_results
  for select using (auth.jwt()->>'email' = 'phiskim@gmail.com');

-- page_views RLS
drop policy if exists "voca_page_views_insert_all" on voca.page_views;
create policy "voca_page_views_insert_all" on voca.page_views
  for insert with check (true);

drop policy if exists "voca_page_views_select_admin" on voca.page_views;
create policy "voca_page_views_select_admin" on voca.page_views
  for select using (auth.jwt()->>'email' = 'phiskim@gmail.com');

-- ---------- 7) 관리자 권한 및 service_members 연동 ----------
-- phiskim@gmail.com 관리자 지정 (service='voca')
insert into public.service_members (user_id, service, role, nickname, last_seen_at)
select u.id, 'voca', 'admin', '관리자', now()
from auth.users u
where lower(u.email) = 'phiskim@gmail.com'
on conflict (user_id, service) do update set role = 'admin', updated_at = now();

-- 권한 부여
grant all on all tables in schema voca to anon, authenticated, service_role;
grant all on all sequences in schema voca to anon, authenticated, service_role;
alter default privileges in schema voca grant all on tables to anon, authenticated, service_role;
alter default privileges in schema voca grant all on sequences to anon, authenticated, service_role;
