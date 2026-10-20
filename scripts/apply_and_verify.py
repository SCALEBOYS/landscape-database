"""Supabase の Postgres にマイグレーションと seed を流し、結果を検証する。

使い方:
    python3 scripts/apply_and_verify.py            # 未適用なら適用 → 検証
    python3 scripts/apply_and_verify.py --verify   # 検証だけ

接続先は .env の SUPABASE_DB_URL。適用は 1 トランザクションで行い、失敗したら何も残らない。
"""

import pathlib
import sys

import psycopg

ROOT = pathlib.Path(__file__).resolve().parent.parent
MIGRATIONS = sorted((ROOT / "supabase" / "migrations").glob("*.sql"))
SEEDS = [ROOT / "supabase" / "seed.sql", ROOT / "supabase" / "seed_species.sql"]

TABLES = [
    "admins", "projects", "project_private_notes", "parties", "project_credits", "species",
    "species_aliases", "project_plantings", "component_categories", "project_components",
    "photos", "sources", "project_awards", "laws", "project_laws", "photo_points", "project_models", "photo_locations",
]


def db_url() -> str:
    env = ROOT / ".env"
    if not env.exists():
        sys.exit(".env がありません。.env.example をコピーして SUPABASE_DB_URL を設定してください。")
    for line in env.read_text(encoding="utf-8").splitlines():
        if line.startswith("SUPABASE_DB_URL="):
            url = line.split("=", 1)[1].strip()
            if "[YOUR-PASSWORD]" in url or "xxxxxxxx" in url:
                sys.exit(".env の SUPABASE_DB_URL がサンプル値のままです。")
            return url
    sys.exit(".env に SUPABASE_DB_URL がありません。")


def apply(conn) -> None:
    """未適用のマイグレーションだけを流す。適用履歴は API に出ない private スキーマに記録する。
    seed は初回（最初のマイグレーションを流したとき）だけ流す。"""
    with conn.transaction(), conn.cursor() as cur:
        cur.execute("create schema if not exists private")
        cur.execute("create table if not exists private.schema_migrations (name text primary key, applied_at timestamptz not null default now())")
        cur.execute("select name from private.schema_migrations")
        applied = {r[0] for r in cur.fetchall()}
        # 履歴の仕組みを入れる前に初回スキーマを流した DB
        cur.execute("select to_regclass('public.projects') is not null")
        if not applied and cur.fetchone()[0]:
            applied.add(MIGRATIONS[0].name)
            cur.execute("insert into private.schema_migrations (name) values (%s)", (MIGRATIONS[0].name,))

        first_run = not applied
        pending = [m for m in MIGRATIONS if m.name not in applied]
        for path in pending:
            cur.execute(path.read_text(encoding="utf-8"))
            cur.execute("insert into private.schema_migrations (name) values (%s)", (path.name,))
            print(f"適用: {path.relative_to(ROOT)}")
        if first_run:
            for path in SEEDS:
                cur.execute(path.read_text(encoding="utf-8"))
                print(f"適用: {path.relative_to(ROOT)}")
        if not pending:
            print("マイグレーションはすべて適用済み")


def check(label: str, ok: bool, detail: str = "") -> bool:
    print(f"[{'OK' if ok else 'NG'}] {label}{' — ' + detail if detail else ''}")
    return ok


def verify(conn) -> bool:
    results = []
    with conn.cursor() as cur:
        cur.execute("select extname from pg_extension where extname in ('postgis', 'pg_trgm')")
        exts = {r[0] for r in cur.fetchall()}
        results.append(check("拡張 postgis / pg_trgm", exts == {"postgis", "pg_trgm"}, ", ".join(sorted(exts))))

        cur.execute(
            "select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace "
            "where n.nspname = 'public' and c.relkind = 'r' and c.relname = any(%s)", (TABLES,))
        rls = dict(cur.fetchall())
        missing = [t for t in TABLES if t not in rls]
        results.append(check(f"テーブル {len(TABLES)} 個", not missing, f"不足: {missing}" if missing else ""))
        no_rls = [t for t, on in rls.items() if not on]
        results.append(check("全テーブルで RLS 有効", not no_rls, f"無効: {no_rls}" if no_rls else ""))

        cur.execute("select count(*) from component_categories")
        n = cur.fetchone()[0]
        results.append(check("構成要素の一般分類", n == 38, f"{n} 件"))
        cur.execute("select count(*), count(ylist_id) from species")
        n, with_ylist = cur.fetchone()
        results.append(check("樹種マスタ", n == 101, f"{n} 件（YList ID あり {with_ylist}）"))
        cur.execute("select count(*) from species_aliases")
        n = cur.fetchone()[0]
        results.append(check("樹種の表記ゆれ", n == 186, f"{n} 件"))
        cur.execute("select kind, count(*) from laws group by kind")
        laws = dict(cur.fetchall())
        results.append(check("法令マスタ（法律・制度・条例）", laws == {"law": 9, "system": 7, "ordinance": 5}, str(laws)))
        cur.execute("select s.name_ja from species_aliases a join species s on s.id = a.species_id where a.alias = '欅'")
        row = cur.fetchone()
        results.append(check("表記ゆれ検索（欅 → ケヤキ）", row is not None and row[0] == "ケヤキ"))

    # RLS の動作確認: 下書き・公開の物件と非公開メモを入れ、匿名ロールから見える範囲を確かめてロールバック
    with conn.cursor() as cur:
        conn.execute("begin")
        try:
            cur.execute(
                "insert into projects (slug, name_ja, use_category, prefecture, location, status) values "
                "('rls-test-draft', 'RLSテスト下書き', 'park', '大阪府', 'SRID=4326;POINT(135.5 34.69)', 'draft'), "
                "('rls-test-published', 'RLSテスト公開', 'plaza', '大阪府', 'SRID=4326;POINT(135.5 34.70)', 'published') "
                "returning id, slug")
            ids = {slug: pid for pid, slug in cur.fetchall()}
            cur.execute("insert into project_private_notes (project_id, impressions) values (%s, '非公開メモ')",
                        (ids["rls-test-published"],))
            cur.execute("insert into photos (project_id, storage_path, taken_on, exif_stripped, people_checked) values "
                        "(%s, 'test/ok.jpg', current_date, true, true), (%s, 'test/ng.jpg', current_date, true, false)",
                        (ids["rls-test-published"], ids["rls-test-published"]))

            cur.execute("set local role anon")
            cur.execute("select slug from projects where slug like 'rls-test-%'")
            visible = {r[0] for r in cur.fetchall()}
            results.append(check("匿名: 公開物件だけ見える", visible == {"rls-test-published"}, str(sorted(visible))))
            cur.execute("select count(*) from project_private_notes")
            results.append(check("匿名: 非公開メモは見えない", cur.fetchone()[0] == 0))
            cur.execute("select storage_path from photos where storage_path like 'test/%'")
            photos = [r[0] for r in cur.fetchall()]
            results.append(check("匿名: 人物確認済みの写真だけ見える", photos == ["test/ok.jpg"], str(photos)))
            cur.execute("select count(*) from species")
            results.append(check("匿名: 樹種マスタは読める", cur.fetchone()[0] == 101))
            try:
                cur.execute("savepoint w")
                cur.execute("insert into species (slug, name_ja, scientific_name) values ('x-test', 'テスト', 'X test')")
                results.append(check("匿名: 書き込みは拒否される", False, "insert が通ってしまった"))
            except psycopg.errors.InsufficientPrivilege:
                cur.execute("rollback to savepoint w")
                results.append(check("匿名: 書き込みは拒否される", True))
            cur.execute("reset role")

            cur.execute("set local role anon")
            cur.execute("select slug, round(lat::numeric, 2), round(lng::numeric, 2) from project_points where slug like 'rls-test-%'")
            pts = cur.fetchall()
            results.append(check("匿名: 座標ビューも公開物件だけ", [p[0] for p in pts] == ["rls-test-published"], str(pts)))
            cur.execute("reset role")

            cur.execute("select st_distance(location, 'SRID=4326;POINT(135.5 34.70)'::geography)::int "
                        "from projects where slug = 'rls-test-draft'")
            d = cur.fetchone()[0]
            results.append(check("PostGIS 距離計算", 1000 < d < 1200, f"{d} m"))
        finally:
            conn.execute("rollback")

    ok = all(results)
    print(f"\n{'すべて OK' if ok else '失敗あり'}（{sum(results)}/{len(results)}）")
    return ok


def main() -> None:
    with psycopg.connect(db_url(), autocommit=True) as conn:
        if "--verify" not in sys.argv:
            apply(conn)
        sys.exit(0 if verify(conn) else 1)


if __name__ == "__main__":
    main()
