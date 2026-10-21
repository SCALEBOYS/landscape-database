-- 「SEN環境計画室」と「エス・イー・エヌ環境計画室」は同じ会社（正式名: 株式会社エス・イー・エヌ環境計画室）
-- 根拠: 同社公式サイト https://sen-inc.jp/ （1989年に三宅祥介建築設計室から改称）、
--       小山市の資料 https://www.city.oyama.tochigi.jp/kurashi/toshikeikaku/machizukuri/page002107.html （同年「株式会社Sen環境計画室」へ改称）
-- 表示名は正式名にし、ほかの表記は別名として検索できるようにする
do $$
declare
  keep uuid;
  drop_id uuid;
begin
  select id into keep from parties where name_ja = 'エス・イー・エヌ環境計画室';
  select id into drop_id from parties where name_ja = 'SEN環境計画室';
  if keep is null then
    raise exception 'エス・イー・エヌ環境計画室 が見つかりません';
  end if;

  if drop_id is not null then
    -- 同じ事例・同じ役割が両方にあれば片方だけ残す
    delete from project_credits a using project_credits b
    where a.party_id = drop_id and b.party_id = keep and a.project_id = b.project_id and a.role = b.role;
    update project_credits set party_id = keep where party_id = drop_id;
    update party_aliases set party_id = keep where party_id = drop_id
      and alias not in (select alias from party_aliases where party_id = keep);
    delete from parties where id = drop_id;
  end if;

  update parties set name_ja = '株式会社エス・イー・エヌ環境計画室' where id = keep;

  insert into party_aliases (party_id, alias, note) values
    (keep, 'エス・イー・エヌ環境計画室', '社名の略記'),
    (keep, 'SEN環境計画室', '英字表記（同社公式サイト・小山市資料で同一と確認）'),
    (keep, 'Sen環境計画室', '小山市資料の表記'),
    (keep, '三宅祥介建築設計室', '1989年までの旧社名')
  on conflict (party_id, alias) do nothing;
end $$;
