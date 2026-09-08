-- ============================================================
-- 관리자 센터 - 공용 페이지뷰 로그 테이블 및 RLS
--
-- 실행 방법: Supabase 대시보드 > SQL Editor 에 붙여넣고 Run
-- 여러 번 실행해도 안전합니다 (idempotent).
--
-- [설계 배경 - 2026-09-08 실제 DB 조사 결과]
--   · 이 Supabase 프로젝트(ybhiznlelnpwaicyoifa)의 API 노출 스키마는
--     'public, graphql_public, hanja' 뿐입니다.
--     → voca / fortune / mindtest 스키마는 REST API 로 접근할 수 없습니다.
--   · 따라서 새 로그는 이미 노출되어 있는 public 스키마에 만들고,
--     서비스 구분은 service 컬럼으로 합니다.
--   · 기존 hanja.page_views(운영 중, 833행)와 voca.page_views 는 건드리지 않습니다.
-- ============================================================

-- ---------- 1) 공용 페이지뷰 로그 ----------
create table if not exists public.page_views (
  id         bigint generated always as identity primary key,
  service    text not null,                 -- 'voca' | 'history' | 'fortune' | 'mindtest'
  path       text not null,                 -- 화면 경로 (예: '/quiz.html')
  page_title text,                          -- 화면 명칭
  referrer   text,
  user_id    uuid references auth.users on delete set null,
  hour       int  not null default extract(hour from (now() at time zone 'Asia/Seoul')),  -- KST 0~23
  day        date not null default (current_date at time zone 'Asia/Seoul')::date,        -- KST 날짜
  created_at timestamptz not null default now()
);

create index if not exists page_views_service_day_idx     on public.page_views (service, day desc, hour);
create index if not exists page_views_service_path_idx    on public.page_views (service, path);
create index if not exists page_views_service_created_idx on public.page_views (service, created_at desc);

alter table public.page_views enable row level security;

-- 누구나(비로그인 포함) 자기 방문 기록을 남길 수 있습니다.
drop policy if exists "page_views_insert_all" on public.page_views;
create policy "page_views_insert_all" on public.page_views
  for insert with check (true);

-- 조회는 관리자 계정만 가능합니다. (한자야 놀자 admin 과 동일한 이메일 기준)
drop policy if exists "page_views_select_admin" on public.page_views;
create policy "page_views_select_admin" on public.page_views
  for select using (auth.jwt()->>'email' = 'phiskim@gmail.com');

grant insert, select on table public.page_views to anon, authenticated;
grant all on table public.page_views to service_role;

-- ---------- 2) 역사야 놀자 학습 로그 관리자 조회 ----------
-- (history 서비스에서만 사용합니다. 다른 서비스에서 실행해도 무해합니다.)
drop policy if exists "attempts_select_admin" on public.quiz_attempts;
create policy "attempts_select_admin" on public.quiz_attempts
  for select using (auth.jwt()->>'email' = 'phiskim@gmail.com');

drop policy if exists "wrong_select_admin" on public.wrong_answers;
create policy "wrong_select_admin" on public.wrong_answers
  for select using (auth.jwt()->>'email' = 'phiskim@gmail.com');

drop policy if exists "study_progress_select_admin" on public.study_progress;
create policy "study_progress_select_admin" on public.study_progress
  for select using (auth.jwt()->>'email' = 'phiskim@gmail.com');

-- ============================================================
-- 참고: 확인용 조회 (SQL Editor 에서 실행)
-- ============================================================
--   select service, count(*) from public.page_views group by 1 order by 1;
--   select service, day, count(*) from public.page_views group by 1,2 order by 2 desc limit 30;
--   select service, hour, count(*) from public.page_views group by 1,2 order by 1,2;
