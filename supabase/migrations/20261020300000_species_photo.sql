-- 樹種の写真（樹種ページの名前の左に出す）。ファイルは photos バケットの species/ 以下
-- 他所の写真を使うときは出典・撮影者を photo_credit に書く
alter table species
  add column photo_path text,
  add column photo_credit text;
