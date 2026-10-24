-- 竣工を月・日まで記録できるようにする。completed_year はこれまでどおり（絞り込み・並べ替えに使う）
-- completed_on: 竣工日（月までのときは 1 日にする）。completed_precision: どこまで分かっているか
alter table projects
  add column completed_on date,
  add column completed_precision text not null default 'year' check (completed_precision in ('year', 'month', 'day'));
alter table projects add constraint projects_completed_on_year_check
  check (completed_on is null or (completed_year is not null and extract(year from completed_on) = completed_year));
