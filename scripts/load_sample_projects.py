"""data/base44_sample/projects.csv の実データ部分（物件・設計者・受賞・出典）を Supabase に入れる。

使い方:
    python3 scripts/load_sample_projects.py

- 何度流しても同じ結果になる（slug で上書き）
- 植栽・構成要素のダミー CSV は入れない（実際の内容ではないため）
- 画面確認のため status は published にする。座標は概算なので、現地確認で直すまで公開サイトには出さないこと
"""

import csv
import hashlib
import pathlib

import psycopg

from apply_and_verify import db_url

ROOT = pathlib.Path(__file__).resolve().parent.parent
SAMPLE = ROOT / "data" / "base44_sample" / "projects.csv"


def party_slug(name: str) -> str:
    # 日本語の社名はローマ字化が難しいので、当面は名前のハッシュで slug を作る
    return "p-" + hashlib.sha1(name.encode("utf-8")).hexdigest()[:10]


def main() -> None:
    rows = list(csv.DictReader(open(SAMPLE, encoding="utf-8")))
    with psycopg.connect(db_url()) as conn, conn.cursor() as cur:
        ids = {}
        # 親を先に入れる
        for r in sorted(rows, key=lambda r: bool(r["parent_slug"])):
            cur.execute(
                """insert into projects (slug, parent_id, name_ja, name_en, use_category, prefecture, municipality,
                       location, summary_ja, status, published_at)
                   values (%s, %s, %s, nullif(%s, ''), %s, %s, nullif(%s, ''),
                       st_setsrid(st_makepoint(%s, %s), 4326)::geography, nullif(%s, ''), 'published', now())
                   on conflict (slug) do update set
                       parent_id = excluded.parent_id, name_ja = excluded.name_ja, name_en = excluded.name_en,
                       use_category = excluded.use_category, prefecture = excluded.prefecture,
                       municipality = excluded.municipality, location = excluded.location,
                       summary_ja = excluded.summary_ja, status = excluded.status
                   returning id""",
                (r["slug"], ids.get(r["parent_slug"]), r["name_ja"], r["name_en"], r["use_category"],
                 r["prefecture"], r["municipality"], float(r["longitude"]), float(r["latitude"]), r["summary_ja"]),
            )
            pid = ids[r["slug"]] = cur.fetchone()[0]

            for table in ("project_credits", "project_awards", "sources"):
                cur.execute(f"delete from {table} where project_id = %s", (pid,))
            for i, name in enumerate(n.strip() for n in r["designers"].split(",") if n.strip()):
                cur.execute(
                    """insert into parties (slug, name_ja) values (%s, %s)
                       on conflict (slug) do update set name_ja = excluded.name_ja returning id""",
                    (party_slug(name), name),
                )
                cur.execute(
                    "insert into project_credits (project_id, party_id, role, sort_order) values (%s, %s, 'landscape_design', %s)",
                    (pid, cur.fetchone()[0], i),
                )
            for award in (a.strip() for a in r["awards"].split("／") if a.strip()):
                cur.execute("insert into project_awards (project_id, award_name) values (%s, %s)", (pid, award))
            for url in (u.strip() for u in r["source_urls"].splitlines() if u.strip()):
                kind = "award" if r["awards"] else "other"
                cur.execute("insert into sources (project_id, kind, url) values (%s, %s, %s)", (pid, kind, url))

        cur.execute("select count(*) from projects where status = 'published'")
        print("published projects:", cur.fetchone()[0])
        cur.execute("select count(*) from parties")
        print("parties:", cur.fetchone()[0])


if __name__ == "__main__":
    main()
