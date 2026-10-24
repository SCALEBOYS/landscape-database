-- 用途を複数持てるようにする。use_category は主な用途（1つ）、other_uses はそのほかの用途
alter table projects add column other_uses project_use[] not null default '{}';
create index projects_other_uses_idx on projects using gin (other_uses);
